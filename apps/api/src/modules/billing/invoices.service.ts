import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  InvoiceResponseDto,
  ReportInvoicePaymentDto,
  VerifyInvoicePaymentDto,
} from './dto/invoice.dto';
import {
  DEFAULT_INVOICE_DUE_DAY,
  DEFAULT_PAGINATION_LIMIT,
} from '../../common/constants/defaults';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { toInvoiceResponseDto } from './invoices.mapper';

/** Shared Prisma include for invoice queries that need full relation data for the mapper */
const INVOICE_INCLUDE = {
  invoice_line_items: true,
  contracts: {
    include: {
      apartments: {
        include: { buildings: true },
      },
      users_contracts_tenant_idTousers: true,
    },
  },
  apartments: {
    include: {
      buildings: true,
      users: true,
    },
  },
} as const;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InvoiceCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateInvoiceDto, actorId: string, operationalOnly = false): Promise<InvoiceResponseDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: dto.contractId },
      include: {
        apartments: {
          include: { buildings: true },
        },
        users_contracts_tenant_idTousers: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }

    const existing = await this.prisma.invoices.findFirst({
      where: {
        contract_id: dto.contractId,
        billing_period: dto.billingPeriod,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Invoice already exists for contract ${dto.contractId} and period ${dto.billingPeriod}`,
      );
    }

    const calculation = await this.calculator.calculateInvoice(
      dto.contractId,
      contract.apartments.id,
      contract.apartments.building_id,
      dto.billingPeriod,
      Number(contract.rent_amount),
      dto.categories,
      contract.contract_type,
      contract.apartments.unit_number,
      operationalOnly,
    );

    if (calculation.lineItems.length === 0 || calculation.totalAmount <= 0) {
      throw new BadRequestException(
        `No billable items for contract ${dto.contractId} in period ${dto.billingPeriod}. ` +
        `Ensure rent amount is set or there are meter readings for the selected categories.`,
      );
    }

    const invoice_number = await this.calculator.generateInvoiceNumber(dto.billingPeriod);

    const [year, month] = dto.billingPeriod.split('-').map(Number);
    const issueDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, DEFAULT_INVOICE_DUE_DAY);

    const invoice = await this.prisma.invoices.create({
      data: {
        contract_id: dto.contractId,
        invoice_number: invoice_number,
        billing_period: dto.billingPeriod,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'pending',
        invoice_stream: operationalOnly ? 'operational' : undefined,
        subtotal: calculation.subtotal,
        tax_amount: calculation.taxAmount,
        total_amount: calculation.totalAmount,
        notes: dto.notes,
        price_snapshot: {
          rentAmount: Number(contract.rent_amount),
          contractType: contract.contract_type,
          paymentReference: calculation.paymentReference,
          calculatedAt: new Date().toISOString(),
        },
        invoice_line_items: {
          create: calculation.lineItems.map((item) => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            amount: item.amount,
            vat_rate: item.vatRate,
            vat_amount: item.vatAmount,
            environment_fee: item.environmentFee,
            utility_type_id: item.utilityTypeId,
            meter_reading_id: item.meterReadingId,
            tier_breakdown: item.tierBreakdown as Prisma.InputJsonValue,
          })),
        },
      },
      include: INVOICE_INCLUDE,
    });

    // Emit event for cache invalidation
    this.eventEmitter.emit('invoice.created', {
      userId: contract.tenant_id,
      buildingId: contract.apartments.building_id,
      invoiceId: invoice.id,
    });

    this.logger.log({
      event: 'invoice_created',
      actorId,
      invoiceId: invoice.id,
      invoice_number,
      billingPeriod: dto.billingPeriod,
      totalAmount: calculation.totalAmount,
    });

    return toInvoiceResponseDto(invoice);
  }

  /**
   * Supplement an existing invoice with missing line items (e.g. utility charges
   * added after initial invoice generation). Only appends NEW items whose
   * category+meterReadingId combo doesn't already exist on the invoice.
   * Recalculates totals after appending.
   *
   * @returns the updated invoice, or `null` if nothing new was added.
   */
  async supplementInvoice(
    invoiceId: string,
    contractId: string,
    billingPeriod: string,
    categories?: string[],
    actorId?: string,
  ): Promise<InvoiceResponseDto | null> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Don't modify paid or cancelled invoices
    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return null;
    }

    const contract = invoice.contracts;

    if (!contract) {
      throw new NotFoundException('Invoice has no associated contract — cannot supplement');
    }

    // Recalculate what the full invoice SHOULD contain
    const fullCalc = await this.calculator.calculateInvoice(
      contractId,
      contract.apartments.id,
      contract.apartments.building_id,
      billingPeriod,
      Number(contract.rent_amount),
      categories,
      contract.contract_type,
      contract.apartments.unit_number,
    );

    // Determine which line items are genuinely new:
    // - For utility items: match by meter_reading_id
    // - For non-utility items: match by category
    const existingMeterReadingIds = new Set(
      invoice.invoice_line_items
        .filter((li) => li.meter_reading_id)
        .map((li) => li.meter_reading_id),
    );
    const existingCategories = new Set(
      invoice.invoice_line_items
        .filter((li) => !li.meter_reading_id)
        .map((li) => li.category),
    );

    const newItems = fullCalc.lineItems.filter((item) => {
      if (item.meterReadingId) {
        return !existingMeterReadingIds.has(item.meterReadingId);
      }
      return !existingCategories.has(item.category);
    });

    if (newItems.length === 0) {
      return null; // nothing to add
    }

    // Append new line items and recalculate totals
    const addedSubtotal = newItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0,
    );
    const addedTax = newItems.reduce(
      (sum, item) => sum + item.vatAmount, 0,
    );
    const addedEnvFee = newItems.reduce(
      (sum, item) => sum + item.environmentFee, 0,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // Insert new line items
      await tx.invoice_line_items.createMany({
        data: newItems.map((item) => ({
          invoice_id: invoiceId,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          amount: item.amount,
          vat_rate: item.vatRate,
          vat_amount: item.vatAmount,
          environment_fee: item.environmentFee,
          utility_type_id: item.utilityTypeId,
          meter_reading_id: item.meterReadingId,
          tier_breakdown: item.tierBreakdown as Prisma.InputJsonValue,
        })),
      });

      // Recalculate totals
      const newSubtotal = Number(invoice.subtotal) + addedSubtotal;
      const newTax = Number(invoice.tax_amount) + addedTax;
      const newTotal = newSubtotal + newTax + addedEnvFee
        + invoice.invoice_line_items.reduce(
          (sum, li) => sum + Number(li.environment_fee), 0,
        );

      return tx.invoices.update({
        where: { id: invoiceId },
        data: {
          subtotal: newSubtotal,
          tax_amount: newTax,
          total_amount: newTotal,
        },
        include: INVOICE_INCLUDE,
      });
    });

    this.logger.log({
      event: 'invoice_supplemented',
      actorId,
      invoiceId,
      billingPeriod,
      addedLineItems: newItems.length,
      addedSubtotal,
      addedTax,
      newTotal: Number(updated.total_amount),
    });

    return toInvoiceResponseDto(updated);
  }

  async findAll(
    filters: InvoiceFiltersDto,
    page = 1,
    limit = DEFAULT_PAGINATION_LIMIT,
    userId?: string,
    userRole?: string,
  ): Promise<{ data: InvoiceResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.invoicesWhereInput = {};

    if (filters.contractId) {
      where.contract_id = filters.contractId;
    }

    if (filters.apartmentId) {
      where.OR = [
        { contracts: { apartment_id: filters.apartmentId } },
        { apartment_id: filters.apartmentId },
      ];
    }

    if (filters.billingPeriod) {
      where.billing_period = filters.billingPeriod;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.stream) {
      where.invoice_stream = filters.stream;
    }

    if (filters.vacant !== undefined) {
      if (filters.vacant) {
        where.contract_id = null;
      } else {
        where.contract_id = { not: null };
      }
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.due_date = {};
      if (filters.dueDateFrom) {
        where.due_date.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.due_date.lte = new Date(filters.dueDateTo);
      }
    }

    if (userRole === 'resident' && userId) {
      where.contracts = {
        ...(where.contracts as Prisma.contractsWhereInput),
        users_contracts_tenant_idTousers: { id: userId },
      };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoices.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoices.count({ where }),
    ]);

    return {
      data: invoices.map((i) => toInvoiceResponseDto(i)),
      total,
    };
  }

  async findOne(id: string, userId?: string, userRole?: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: {
        invoice_line_items: {
          include: {
            utility_types: true,
            meter_readings: true,
          },
        },
        contracts: {
          include: {
            apartments: {
              include: { buildings: true },
            },
            users_contracts_tenant_idTousers: true,
          },
        },
        apartments: {
          include: {
            buildings: true,
            users: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (userRole === 'resident' && userId !== invoice.contracts?.tenant_id) {
      throw new ForbiddenException('Access denied');
    }

    return toInvoiceResponseDto(invoice);
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
    actorId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updateData: Prisma.invoicesUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;
      
      if (dto.status === 'paid') {
        updateData.paid_at = new Date();
        updateData.paid_amount = dto.paidAmount ?? invoice.total_amount;
      }
    }

    if (dto.paidAmount !== undefined) {
      updateData.paid_amount = dto.paidAmount;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    const updated = await this.prisma.invoices.update({
      where: { id },
      data: updateData,
      include: INVOICE_INCLUDE,
    });

    // Sync to payment schedule when marking as paid
    if (dto.status === 'paid') {
      const paidAmount = Number(dto.paidAmount ?? invoice.total_amount);
      await this.syncPaymentToSchedule(
        updated.contract_id,
        updated.billing_period,
        updated.invoice_line_items,
        paidAmount,
        Number(updated.subtotal),
        Number(updated.total_amount),
        {
          paymentDate: new Date().toISOString(),
          paymentMethod: 'bank_transfer',
        },
        actorId,
      );
    }

    this.logger.log({
      event: 'invoice_updated',
      actorId,
      invoiceId: id,
      changes: dto,
      oldStatus: invoice.status,
      newStatus: dto.status,
    });

    return toInvoiceResponseDto(updated);
  }

  async getOverdueInvoices(): Promise<InvoiceResponseDto[]> {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoices.findMany({
      where: {
        status: 'pending',
        due_date: { lt: now },
      },
      include: INVOICE_INCLUDE,
    });

    if (overdueInvoices.length > 0) {
      await this.prisma.invoices.updateMany({
        where: {
          id: { in: overdueInvoices.map((i) => i.id) },
        },
        data: { status: 'overdue' },
      });
    }

    return overdueInvoices.map((i) => toInvoiceResponseDto(i));
  }

  /**
   * Resident reports a payment transfer for an invoice.
   * Stores reported payment info in price_snapshot for admin verification.
   */
  async reportPayment(
    id: string,
    dto: ReportInvoicePaymentDto,
    reporterId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: {
        contracts: { select: { tenant_id: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Only the tenant can report payment for their invoice
    // Vacant invoices (no contract) cannot have tenant-reported payments
    if (!invoice.contracts || invoice.contracts.tenant_id !== reporterId) {
      throw new ForbiddenException('Only the invoice tenant can report payment');
    }

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot report payment for ${invoice.status} invoice`,
      );
    }

    const existingSnapshot = (invoice.price_snapshot as Record<string, unknown>) || {};
    const reportedPayment = {
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      reportedBy: reporterId,
      reportedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.invoices.update({
      where: { id },
      data: {
        price_snapshot: {
          ...existingSnapshot,
          reportedPayment,
        } as Prisma.InputJsonValue,
      },
      include: INVOICE_INCLUDE,
    });

    this.logger.log({
      event: 'invoice_payment_reported',
      invoiceId: id,
      reporterId,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
    });

    return toInvoiceResponseDto(updated);
  }

  /**
   * Get invoices with reported (pending verification) payments.
   * Admin uses this to see which invoices need payment verification.
   */
  async getReportedPayments(): Promise<InvoiceResponseDto[]> {
    // Find invoices where price_snapshot contains reportedPayment
    // and status is still pending or overdue (not yet marked paid)
    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        AND: [
          {
            price_snapshot: {
              path: ['reportedPayment'],
              not: Prisma.DbNull,
            },
          },
          {
            price_snapshot: {
              path: ['reportedPayment'],
              not: Prisma.JsonNull,
            },
          },
        ],
      },
      include: INVOICE_INCLUDE,
      orderBy: { updated_at: 'desc' },
    });

    return invoices.map((i) => toInvoiceResponseDto(i));
  }

  /**
   * Get invoices with verified or rejected payments (history).
   * Shows confirmed/rejected payment decisions within the last N days.
   */
  async getPaymentHistory(days: number = 30): Promise<InvoiceResponseDto[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        updated_at: { gte: since },
        OR: [
          {
            price_snapshot: {
              path: ['verifiedPayment'],
              not: Prisma.DbNull,
            },
          },
          {
            price_snapshot: {
              path: ['rejectedPayment'],
              not: Prisma.DbNull,
            },
          },
        ],
      },
      include: INVOICE_INCLUDE,
      orderBy: { updated_at: 'desc' },
    });

    return invoices.map((i) => toInvoiceResponseDto(i));
  }

  /**
   * Verify a reported payment (admin).
   * If confirmed: mark invoice as paid, clear reportedPayment, sync to payment schedule.
   * If rejected: clear reportedPayment, leave invoice status unchanged.
   */
  async verifyPayment(
    id: string,
    dto: VerifyInvoicePaymentDto,
    verifierId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const priceSnapshot = (invoice.price_snapshot as Record<string, unknown>) || {};
    const reportedPayment = priceSnapshot.reportedPayment as Record<string, unknown> | undefined;

    if (!reportedPayment) {
      throw new BadRequestException('No reported payment to verify');
    }

    const reportedAmount = (reportedPayment.amount as number) || 0;
    const finalAmount = dto.actualAmount ?? reportedAmount;

    let updateData: Prisma.invoicesUpdateInput;

    if (dto.status === 'confirmed') {
      // Payment confirmed - update paid amount and potentially mark as paid
      const newPaidAmount = Number(invoice.paid_amount) + finalAmount;
      const isPaid = newPaidAmount >= Number(invoice.total_amount);

      updateData = {
        paid_amount: newPaidAmount,
        status: isPaid ? 'paid' : invoice.status,
        paid_at: isPaid ? new Date() : invoice.paid_at,
        price_snapshot: {
          ...priceSnapshot,
          reportedPayment: null,
          verifiedPayment: {
            ...reportedPayment,
            verifiedAmount: finalAmount,
            verifiedBy: verifierId,
            verifiedAt: new Date().toISOString(),
            verificationStatus: 'confirmed',
            notes: dto.notes,
          },
        },
      };

      // Sync payment to corresponding payment schedule
      await this.syncPaymentToSchedule(
        invoice.contract_id,
        invoice.billing_period,
        invoice.invoice_line_items,
        finalAmount,
        Number(invoice.subtotal),
        Number(invoice.total_amount),
        reportedPayment,
        verifierId,
      );

      this.logger.log({
        event: 'invoice_payment_verified',
        invoiceId: id,
        verifierId,
        reportedAmount,
        verifiedAmount: finalAmount,
        status: 'confirmed',
      });
    } else {
      // Payment rejected - clear reported payment
      updateData = {
        price_snapshot: {
          ...priceSnapshot,
          reportedPayment: null,
          rejectedPayment: {
            ...reportedPayment,
            rejectedBy: verifierId,
            rejectedAt: new Date().toISOString(),
            rejectionReason: dto.rejectionReason || null,
            rejectionNotes: dto.notes,
          },
        },
      };

      this.logger.log({
        event: 'invoice_payment_rejected',
        invoiceId: id,
        verifierId,
        reportedAmount,
        rejectionReason: dto.rejectionReason,
        reason: dto.notes,
      });
    }

    const updated = await this.prisma.invoices.update({
      where: { id },
      data: updateData,
      include: INVOICE_INCLUDE,
    });

    return toInvoiceResponseDto(updated);
  }

  /**
   * Sync confirmed invoice payment to the corresponding payment schedule.
   * This ensures Financial Summary in contract detail shows the correct amounts.
   */
  private async syncPaymentToSchedule(
    contractId: string | null,
    billingPeriod: string,
    lineItems: { category: string | null; unit_price: Prisma.Decimal }[],
    paidAmount: number,
    invoiceSubtotal: number,
    invoiceTotalAmount: number,
    reportedPayment: Record<string, unknown>,
    verifierId: string,
  ): Promise<void> {
    // Vacant invoices (no contract) don't have payment schedules
    if (!contractId) return;

    try {
      // Find rent line item to get base amount (excl. VAT)
      const rentItem = lineItems.find((item) => item.category === 'rent');
      const installmentItem = lineItems.find((item) => item.category === 'installment');
      
      // Determine payment type
      let paymentType: 'rent' | 'installment';
      
      if (rentItem) {
        paymentType = 'rent';
      } else if (installmentItem) {
        paymentType = 'installment';
      } else {
        // No rent or installment line item - skip schedule sync
        this.logger.debug(`No rent/installment line item for ${billingPeriod}, skipping schedule sync`);
        return;
      }

      // Find matching payment schedule by period
      // Period label format: "Rent Apr 2026" or "Installment 1/24 - 2026-04"
      const [year, month] = billingPeriod.split('-').map(Number);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = monthNames[month - 1];
      
      // Try to find schedule by period label pattern
      const schedule = await this.prisma.contract_payment_schedules.findFirst({
        where: {
          contract_id: contractId,
          payment_type: paymentType,
          OR: [
            // Rent pattern: "Rent Apr 2026"
            { period_label: { contains: `${monthLabel} ${year}` } },
            // Installment pattern contains billing period
            { period_label: { contains: billingPeriod } },
          ],
        },
      });

      if (!schedule) {
        this.logger.debug(
          `No payment schedule found for contract ${contractId} period ${billingPeriod}, skipping sync`,
        );
        return;
      }

      // Calculate how much to credit to the schedule (excl. VAT)
      // Use actual invoice subtotal/total ratio to remove VAT proportionally
      // e.g. subtotal=8M, total=8M (no VAT) → ratio=1.0, credit full amount
      // e.g. subtotal=15M, total=16.5M (10% VAT) → ratio=0.909, removes VAT
      const vatRatio = invoiceTotalAmount > 0 ? invoiceSubtotal / invoiceTotalAmount : 1;
      const amountToCredit = Math.round(paidAmount * vatRatio);

      // Update schedule received amount
      const newReceivedAmount = Number(schedule.received_amount) + amountToCredit;
      const isPaid = newReceivedAmount >= Number(schedule.expected_amount);

      await this.prisma.$transaction([
        // Update schedule
        this.prisma.contract_payment_schedules.update({
          where: { id: schedule.id },
          data: {
            received_amount: newReceivedAmount,
            status: isPaid ? 'paid' : newReceivedAmount > 0 ? 'partial' : schedule.status,
            updated_at: new Date(),
          },
        }),
        // Create payment record
        this.prisma.contract_payments.create({
          data: {
            schedule_id: schedule.id,
            amount: amountToCredit,
            payment_date: new Date((reportedPayment.paymentDate as string) || new Date()),
            payment_method: (reportedPayment.paymentMethod as 'bank_transfer' | 'cash') || 'bank_transfer',
            reference_number: reportedPayment.referenceNumber as string | null,
            status: 'confirmed',
            reported_by: reportedPayment.reportedBy as string | null,
            reported_at: reportedPayment.reportedAt ? new Date(reportedPayment.reportedAt as string) : null,
            recorded_by: verifierId,
            verified_by: verifierId,
            verified_at: new Date(),
            notes: `Synced from invoice payment. Invoice amount: ${paidAmount}${vatRatio < 1 ? ` (excl. VAT: ${amountToCredit})` : ''}`,
          },
        }),
      ]);

      this.logger.log({
        event: 'invoice_payment_synced_to_schedule',
        contractId,
        billingPeriod,
        scheduleId: schedule.id,
        amountCredited: amountToCredit,
        newReceivedAmount,
        newStatus: isPaid ? 'paid' : 'partial',
      });
    } catch (error) {
      // Log but don't fail the main transaction - invoice payment is still valid
      this.logger.error({
        event: 'invoice_payment_sync_failed',
        contractId,
        billingPeriod,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

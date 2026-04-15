import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  InvoiceResponseDto,
} from '../dto/invoice.dto';
import {
  DEFAULT_INVOICE_DUE_DAY,
  DEFAULT_PAGINATION_LIMIT,
} from '../../../common/constants/defaults';
import { InvoiceCalculatorService } from '../invoice-calculator.service';
import { toInvoiceResponseDto } from './invoices.mapper';

/** Shared Prisma include for invoice queries that need full relation data for the mapper */
export const INVOICE_INCLUDE = {
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

/**
 * Core invoice CRUD operations.
 * Handles invoice creation, querying, updates, and supplementation.
 */
@Injectable()
export class InvoicesCoreService {
  private readonly logger = new Logger(InvoicesCoreService.name);

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
      // Create new line items
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

      // Update invoice totals
      return tx.invoices.update({
        where: { id: invoiceId },
        data: {
          subtotal: { increment: addedSubtotal },
          tax_amount: { increment: addedTax },
          total_amount: { increment: addedSubtotal + addedTax + addedEnvFee },
          updated_at: new Date(),
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
        { contract_id: { not: null }, contracts: { apartment_id: filters.apartmentId } },
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
      where.contract_id = filters.vacant ? null : { not: null };
      where.apartment_id = filters.vacant ? { not: null } : undefined;
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      where.due_date = {
        ...(filters.dueDateFrom && { gte: new Date(filters.dueDateFrom) }),
        ...(filters.dueDateTo && { lte: new Date(filters.dueDateTo) }),
      };
    }

    if (userRole === 'resident' && userId) {
      where.contracts = {
        tenant_id: userId,
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
      throw new NotFoundException('Invoice not found');
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

    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        due_date: { lt: now },
      },
      orderBy: { due_date: 'asc' },
      include: INVOICE_INCLUDE,
    });

    // Update status to overdue where needed
    const overdueIds = invoices
      .filter((i) => i.status === 'pending')
      .map((i) => i.id);

    if (overdueIds.length > 0) {
      await this.prisma.invoices.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: 'overdue' },
      });
    }

    return invoices.map((i) => toInvoiceResponseDto(i));
  }
}

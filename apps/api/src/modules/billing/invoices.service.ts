import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  InvoiceResponseDto,
} from './dto/invoice.dto';

interface InvoiceCalculation {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    utilityTypeId?: string;
    meterReadingId?: string;
    tierBreakdown?: Record<string, unknown>;
  }>;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInvoiceDto, actorId: string): Promise<InvoiceResponseDto> {
    // Verify contract exists and is active
    const contract = await this.prisma.contracts.findUnique({
      where: { id: dto.contractId },
      include: {
        apartments: {
          include: {
            buildings: true,
          },
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

    // Check for duplicate invoice
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

    // Calculate invoice
    const calculation = await this.calculateInvoice(
      dto.contractId,
      contract.apartments.id,
      contract.apartments.building_id,
      dto.billingPeriod,
      Number(contract.rent_amount),
    );

    // Generate invoice number
    const invoice_number = await this.generateInvoiceNumber(dto.billingPeriod);

    // Parse billing period to get issue and due dates
    const [year, month] = dto.billingPeriod.split('-').map(Number);
    const issueDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, 15); // Due on 15th of billing month

    // Create invoice with line items
    const invoice = await this.prisma.invoices.create({
      data: {
        contract_id: dto.contractId,
        invoice_number: invoice_number,
        billing_period: dto.billingPeriod,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'pending',
        subtotal: calculation.subtotal,
        tax_amount: calculation.taxAmount,
        total_amount: calculation.totalAmount,
        notes: dto.notes,
        price_snapshot: {
          rentAmount: Number(contract.rent_amount),
          calculatedAt: new Date().toISOString(),
        },
        invoice_line_items: {
          create: calculation.lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            amount: item.amount,
            utility_type_id: item.utilityTypeId,
            meter_reading_id: item.meterReadingId,
            tier_breakdown: item.tierBreakdown as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        invoice_line_items: true,
        contracts: {
          include: {
            apartments: {
              include: { buildings: true },
            },
            users_contracts_tenant_idTousers: true,
          },
        },
      },
    });

    this.logger.log({
      event: 'invoice_created',
      actorId,
      invoiceId: invoice.id,
      invoice_number,
      billingPeriod: dto.billingPeriod,
      totalAmount: calculation.totalAmount,
    });

    return this.toResponseDto(invoice);
  }

  async findAll(
    filters: InvoiceFiltersDto,
    page = 1,
    limit = 20,
    userId?: string,
    userRole?: string,
  ): Promise<{ data: InvoiceResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: Prisma.invoicesWhereInput = {};

    // Filter by contract
    if (filters.contractId) {
      where.contract_id = filters.contractId;
    }

    // Filter by apartment (via contract)
    if (filters.apartmentId) {
      where.contracts = { apartment_id: filters.apartmentId };
    }

    // Filter by billing period
    if (filters.billingPeriod) {
      where.billing_period = filters.billingPeriod;
    }

    // Filter by status
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by due date range
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.due_date = {};
      if (filters.dueDateFrom) {
        where.due_date.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.due_date.lte = new Date(filters.dueDateTo);
      }
    }

    // Residents can only see their own invoices
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
        include: {
          invoice_line_items: true,
          contracts: {
            include: {
              apartments: {
                include: { buildings: true },
              },
              users_contracts_tenant_idTousers: true,
            },
          },
        },
      }),
      this.prisma.invoices.count({ where }),
    ]);

    return {
      data: invoices.map((i: any) => this.toResponseDto(i)),
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
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access for residents
    if (userRole === 'resident' && userId !== invoice.contracts.tenant_id) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(invoice);
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
      
      // If marking as paid, set paid_at and paidAmount
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
      include: {
        invoice_line_items: true,
        contracts: {
          include: {
            apartments: {
              include: { buildings: true },
            },
            users_contracts_tenant_idTousers: true,
          },
        },
      },
    });

    this.logger.log({
      event: 'invoice_updated',
      actorId,
      invoiceId: id,
      changes: dto,
      oldStatus: invoice.status,
      newStatus: dto.status,
    });

    return this.toResponseDto(updated);
  }

  async getOverdueInvoices(): Promise<InvoiceResponseDto[]> {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoices.findMany({
      where: {
        status: 'pending',
        due_date: { lt: now },
      },
      include: {
        invoice_line_items: true,
        contracts: {
          include: {
            apartments: {
              include: { buildings: true },
            },
            users_contracts_tenant_idTousers: true,
          },
        },
      },
    });

    // Update status to overdue
    if (overdueInvoices.length > 0) {
      await this.prisma.invoices.updateMany({
        where: {
          id: { in: overdueInvoices.map((i: any) => i.id) },
        },
        data: { status: 'overdue' },
      });
    }

    return overdueInvoices.map((i: any) => this.toResponseDto(i));
  }

  private async calculateInvoice(
    contractId: string,
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    rentAmount: number,
  ): Promise<InvoiceCalculation> {
    const lineItems: InvoiceCalculation['lineItems'] = [];

    // Add base rent
    lineItems.push({
      description: `Rent for ${billingPeriod}`,
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount,
    });

    // Get meter readings for the period
    const readings = await this.prisma.meter_readings.findMany({
      where: {
        apartment_id: apartmentId,
        billing_period: billingPeriod,
      },
      include: {
        utility_types: true,
      },
    });

    // Calculate utility charges with tiered pricing
    for (const reading of readings) {
      if (reading.previous_value === null) continue;

      const usage = Number(reading.current_value) - Number(reading.previous_value);
      if (usage <= 0) continue;

      const { amount, breakdown } = await this.calculateTieredAmount(
        reading.utility_type_id,
        buildingId,
        usage,
        billingPeriod,
      );

      lineItems.push({
        description: `${reading.utility_types.name} - ${usage} ${reading.utility_types.unit}`,
        quantity: usage,
        unitPrice: amount / usage,
        amount,
        utilityTypeId: reading.utility_type_id,
        meterReadingId: reading.id,
        tierBreakdown: breakdown,
      });
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = 0; // No VAT for residential rent in Vietnam
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount, lineItems };
  }

  private async calculateTieredAmount(
    utilityTypeId: string,
    buildingId: string,
    usage: number,
    billingPeriod: string,
  ): Promise<{ amount: number; breakdown: Record<string, unknown> }> {
    const [year, month] = billingPeriod.split('-').map(Number);
    const periodDate = new Date(year, month - 1, 15);

    // Get tiers for this utility type and building
    const tiers = await this.prisma.utility_tiers.findMany({
      where: {
        utility_type_id: utilityTypeId,
        effective_from: { lte: periodDate },
        AND: [
          {
            OR: [
              { building_id: buildingId }, // Building-specific tiers
              { building_id: null }, // Global tiers
            ],
          },
          {
            OR: [
              { effective_to: null },
              { effective_to: { gte: periodDate } },
            ],
          },
        ],
      },
      orderBy: { tier_number: 'asc' },
    });

    // If no tiers found, use flat rate
    if (tiers.length === 0) {
      return {
        amount: usage * 3000, // Default rate (VND)
        breakdown: { flatRate: true, usage, unitPrice: 3000 },
      };
    }

    // Calculate tiered amount
    let remainingUsage = usage;
    let totalAmount = 0;
    const breakdown: Record<string, unknown> = { tiers: [] };

    for (const tier of tiers) {
      const tierMin = Number(tier.min_usage);
      const tierMax = tier.max_usage ? Number(tier.max_usage) : Infinity;
      const tierPrice = Number(tier.unit_price);

      const tierUsage = Math.min(
        Math.max(0, remainingUsage - tierMin),
        tierMax - tierMin,
      );

      if (tierUsage > 0) {
        const tierAmount = tierUsage * tierPrice;
        totalAmount += tierAmount;
        (breakdown.tiers as unknown[]).push({
          tier: tier.tier_number,
          usage: tierUsage,
          unitPrice: tierPrice,
          amount: tierAmount,
        });
        remainingUsage -= tierUsage;
      }

      if (remainingUsage <= 0) break;
    }

    return { amount: totalAmount, breakdown };
  }

  private async generateInvoiceNumber(billingPeriod: string): Promise<string> {
    const prefix = `INV-${billingPeriod.replace('-', '')}`;
    
    const lastInvoice = await this.prisma.invoices.findFirst({
      where: {
        invoice_number: { startsWith: prefix },
      },
      orderBy: { invoice_number: 'desc' },
    });

    if (!lastInvoice) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(lastInvoice.invoice_number.split('-').pop() || '0', 10);
    return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  private toResponseDto(invoice: any): InvoiceResponseDto {
    return {
      id: invoice.id,
      contractId: invoice.contract_id,
      invoice_number: invoice.invoice_number,
      billingPeriod: invoice.billing_period,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.tax_amount),
      totalAmount: Number(invoice.total_amount),
      paidAmount: Number(invoice.paid_amount),
      paid_at: invoice.paid_at,
      notes: invoice.notes,
      lineItems: invoice.invoice_line_items?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        amount: Number(item.amount),
        utilityTypeId: item.utility_type_id,
        meterReadingId: item.meter_reading_id,
        tierBreakdown: item.tier_breakdown,
      })) || [],
      created_at: invoice.created_at,
      updatedAt: invoice.updated_at,
      contract: invoice.contracts
        ? {
            id: invoice.contracts.id,
            apartments: {
              id: invoice.contracts.apartments.id,
              unit_number: invoice.contracts.apartments.unit_number,
              buildings: {
                id: invoice.contracts.apartments.buildings.id,
                name: invoice.contracts.apartments.buildings.name,
              },
            },
            tenant: {
              id: invoice.contracts.users_contracts_tenant_idTousers.id,
              firstName: invoice.contracts.users_contracts_tenant_idTousers.first_name,
              lastName: invoice.contracts.users_contracts_tenant_idTousers.last_name,
              email: invoice.contracts.users_contracts_tenant_idTousers.email,
            },
          }
        : undefined,
    };
  }
}

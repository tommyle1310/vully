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
    const contract = await this.prisma.contract.findUnique({
      where: { id: dto.contractId },
      include: {
        apartment: {
          include: {
            building: true,
          },
        },
        tenant: true,
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== 'active') {
      throw new BadRequestException('Contract is not active');
    }

    // Check for duplicate invoice
    const existing = await this.prisma.invoice.findFirst({
      where: {
        contractId: dto.contractId,
        billingPeriod: dto.billingPeriod,
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
      contract.apartment.id,
      contract.apartment.buildingId,
      dto.billingPeriod,
      Number(contract.rentAmount),
    );

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(dto.billingPeriod);

    // Parse billing period to get issue and due dates
    const [year, month] = dto.billingPeriod.split('-').map(Number);
    const issueDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, 15); // Due on 15th of billing month

    // Create invoice with line items
    const invoice = await this.prisma.invoice.create({
      data: {
        contractId: dto.contractId,
        invoiceNumber,
        billingPeriod: dto.billingPeriod,
        issueDate,
        dueDate,
        status: 'pending',
        subtotal: calculation.subtotal,
        taxAmount: calculation.taxAmount,
        totalAmount: calculation.totalAmount,
        notes: dto.notes,
        priceSnapshot: {
          rentAmount: Number(contract.rentAmount),
          calculatedAt: new Date().toISOString(),
        },
        lineItems: {
          create: calculation.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            utilityTypeId: item.utilityTypeId,
            meterReadingId: item.meterReadingId,
            tierBreakdown: item.tierBreakdown as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        lineItems: true,
        contract: {
          include: {
            apartment: {
              include: { building: true },
            },
            tenant: true,
          },
        },
      },
    });

    this.logger.log({
      event: 'invoice_created',
      actorId,
      invoiceId: invoice.id,
      invoiceNumber,
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

    const where: Prisma.InvoiceWhereInput = {};

    // Filter by contract
    if (filters.contractId) {
      where.contractId = filters.contractId;
    }

    // Filter by apartment (via contract)
    if (filters.apartmentId) {
      where.contract = { apartmentId: filters.apartmentId };
    }

    // Filter by billing period
    if (filters.billingPeriod) {
      where.billingPeriod = filters.billingPeriod;
    }

    // Filter by status
    if (filters.status) {
      where.status = filters.status;
    }

    // Filter by due date range
    if (filters.dueDateFrom || filters.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = new Date(filters.dueDateTo);
      }
    }

    // Residents can only see their own invoices
    if (userRole === 'resident' && userId) {
      where.contract = {
        ...(where.contract as Prisma.ContractWhereInput),
        tenant: { id: userId },
      };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lineItems: true,
          contract: {
            include: {
              apartment: {
                include: { building: true },
              },
              tenant: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map(this.toResponseDto),
      total,
    };
  }

  async findOne(id: string, userId?: string, userRole?: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            utilityType: true,
            meterReading: true,
          },
        },
        contract: {
          include: {
            apartment: {
              include: { building: true },
            },
            tenant: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check access for residents
    if (userRole === 'resident' && userId !== invoice.contract.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(invoice);
  }

  async update(
    id: string,
    dto: UpdateInvoiceDto,
    actorId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (dto.status) {
      updateData.status = dto.status;
      
      // If marking as paid, set paidAt and paidAmount
      if (dto.status === 'paid') {
        updateData.paidAt = new Date();
        updateData.paidAmount = dto.paidAmount ?? invoice.totalAmount;
      }
    }

    if (dto.paidAmount !== undefined) {
      updateData.paidAmount = dto.paidAmount;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        lineItems: true,
        contract: {
          include: {
            apartment: {
              include: { building: true },
            },
            tenant: true,
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

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      include: {
        lineItems: true,
        contract: {
          include: {
            apartment: {
              include: { building: true },
            },
            tenant: true,
          },
        },
      },
    });

    // Update status to overdue
    if (overdueInvoices.length > 0) {
      await this.prisma.invoice.updateMany({
        where: {
          id: { in: overdueInvoices.map((i) => i.id) },
        },
        data: { status: 'overdue' },
      });
    }

    return overdueInvoices.map(this.toResponseDto);
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
    const readings = await this.prisma.meterReading.findMany({
      where: {
        apartmentId,
        billingPeriod,
      },
      include: {
        utilityType: true,
      },
    });

    // Calculate utility charges with tiered pricing
    for (const reading of readings) {
      if (reading.previousValue === null) continue;

      const usage = Number(reading.currentValue) - Number(reading.previousValue);
      if (usage <= 0) continue;

      const { amount, breakdown } = await this.calculateTieredAmount(
        reading.utilityTypeId,
        buildingId,
        usage,
        billingPeriod,
      );

      lineItems.push({
        description: `${reading.utilityType.name} - ${usage} ${reading.utilityType.unit}`,
        quantity: usage,
        unitPrice: amount / usage,
        amount,
        utilityTypeId: reading.utilityTypeId,
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
    const tiers = await this.prisma.utilityTier.findMany({
      where: {
        utilityTypeId,
        effectiveFrom: { lte: periodDate },
        AND: [
          {
            OR: [
              { buildingId }, // Building-specific tiers
              { buildingId: null }, // Global tiers
            ],
          },
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: periodDate } },
            ],
          },
        ],
      },
      orderBy: { tierNumber: 'asc' },
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
      const tierMin = Number(tier.minUsage);
      const tierMax = tier.maxUsage ? Number(tier.maxUsage) : Infinity;
      const tierPrice = Number(tier.unitPrice);

      const tierUsage = Math.min(
        Math.max(0, remainingUsage - tierMin),
        tierMax - tierMin,
      );

      if (tierUsage > 0) {
        const tierAmount = tierUsage * tierPrice;
        totalAmount += tierAmount;
        (breakdown.tiers as unknown[]).push({
          tier: tier.tierNumber,
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
    
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    if (!lastInvoice) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0', 10);
    return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  private toResponseDto(invoice: any): InvoiceResponseDto {
    return {
      id: invoice.id,
      contractId: invoice.contractId,
      invoiceNumber: invoice.invoiceNumber,
      billingPeriod: invoice.billingPeriod,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      lineItems: invoice.lineItems?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        utilityTypeId: item.utilityTypeId,
        meterReadingId: item.meterReadingId,
        tierBreakdown: item.tierBreakdown,
      })) || [],
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      contract: invoice.contract
        ? {
            id: invoice.contract.id,
            apartment: {
              id: invoice.contract.apartment.id,
              unitNumber: invoice.contract.apartment.unitNumber,
              building: {
                id: invoice.contract.apartment.building.id,
                name: invoice.contract.apartment.building.name,
              },
            },
            tenant: {
              id: invoice.contract.tenant.id,
              firstName: invoice.contract.tenant.firstName,
              lastName: invoice.contract.tenant.lastName,
              email: invoice.contract.tenant.email,
            },
          }
        : undefined,
    };
  }
}

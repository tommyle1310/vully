import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFiltersDto,
  InvoiceResponseDto,
} from './dto/invoice.dto';
import {
  DEFAULT_INVOICE_DUE_DAY,
  DEFAULT_PAGINATION_LIMIT,
} from '../../common/constants/defaults';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { toInvoiceResponseDto } from './invoices.mapper';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InvoiceCalculatorService,
  ) {}

  async create(dto: CreateInvoiceDto, actorId: string): Promise<InvoiceResponseDto> {
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

    return toInvoiceResponseDto(invoice);
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
      where.contracts = { apartment_id: filters.apartmentId };
    }

    if (filters.billingPeriod) {
      where.billing_period = filters.billingPeriod;
    }

    if (filters.status) {
      where.status = filters.status;
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
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (userRole === 'resident' && userId !== invoice.contracts.tenant_id) {
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

    return toInvoiceResponseDto(updated);
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
}

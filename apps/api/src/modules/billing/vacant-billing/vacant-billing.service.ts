import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InvoiceCalculatorService } from '../invoice-calculator.service';
import { DEFAULT_INVOICE_DUE_DAY } from '../../../common/constants/defaults';
import { InvoiceResponseDto } from '../dto/invoice.dto';
import { toInvoiceResponseDto } from '../invoices/invoices.mapper';

const VACANT_INVOICE_INCLUDE = {
  invoice_line_items: true,
  contracts: {
    include: {
      apartments: { include: { buildings: true } },
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
export class VacantBillingService {
  private readonly logger = new Logger(VacantBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InvoiceCalculatorService,
  ) {}

  /**
   * Find vacant apartments in a building (or all buildings) that:
   * - Have status 'vacant'
   * - Have an owner_id set
   * - Don't have an active contract
   * - Don't already have an invoice for the billing period
   */
  async findBillableVacantApartments(
    billingPeriod: string,
    buildingId?: string,
  ) {
    const where: Prisma.apartmentsWhereInput = {
      status: 'vacant',
      owner_id: { not: null },
      contracts: {
        none: { status: 'active' },
      },
      invoices: {
        none: { billing_period: billingPeriod },
      },
    };

    if (buildingId) {
      where.building_id = buildingId;
    }

    return this.prisma.apartments.findMany({
      where,
      select: {
        id: true,
        unit_number: true,
        building_id: true,
        net_area: true,
        gross_area: true,
        owner_id: true,
      },
    });
  }

  /**
   * Generate an invoice for a vacant apartment.
   * Includes management fee (full month) and parking fees if any slots are assigned.
   */
  async generateVacantInvoice(
    apartmentId: string,
    buildingId: string,
    unitNumber: string,
    billingPeriod: string,
  ): Promise<InvoiceResponseDto> {
    const lineItems: {
      description: string;
      category: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      vatRate: number;
      vatAmount: number;
      environmentFee: number;
      utilityTypeId?: string;
      meterReadingId?: string;
      tierBreakdown?: Record<string, unknown>;
    }[] = [];

    // Management fee (full month, no pro-rate for vacant)
    const mgmtItem = await this.calculator.buildManagementFeeLineItem(
      apartmentId,
      buildingId,
      billingPeriod,
    );
    if (mgmtItem) lineItems.push(mgmtItem);

    // Parking fees (if any slots still assigned to this apartment)
    const slots = await this.prisma.parking_slots.findMany({
      where: {
        assigned_apt_id: apartmentId,
        status: 'assigned',
      },
      include: { parking_zones: true },
    });

    for (const slot of slots) {
      const monthlyFee = Number(slot.fee_override ?? slot.parking_zones.fee_per_month ?? 0);
      if (monthlyFee <= 0) continue;

      const slotType = slot.parking_zones.slot_type;
      const vatRate = 0.10;
      const vatAmount = Math.round(monthlyFee * vatRate);

      lineItems.push({
        description: `Parking Fee - ${slot.full_code} (${slotType})`,
        category: `parking_${slotType}`,
        quantity: 1,
        unitPrice: monthlyFee,
        amount: monthlyFee + vatAmount,
        vatRate,
        vatAmount,
        environmentFee: 0,
      });
    }

    if (lineItems.length === 0) {
      return null as unknown as InvoiceResponseDto;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = await this.calculator.generateInvoiceNumber(billingPeriod);
    const [year, month] = billingPeriod.split('-').map(Number);
    const issueDate = new Date(year, month - 1, 1);
    const dueDate = new Date(year, month - 1, DEFAULT_INVOICE_DUE_DAY);

    const periodCode = billingPeriod.replace('-', '');
    const paymentReference = `${unitNumber}_MGMT_${periodCode}`;

    const invoice = await this.prisma.invoices.create({
      data: {
        contract_id: null,
        apartment_id: apartmentId,
        invoice_number: invoiceNumber,
        billing_period: billingPeriod,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'pending',
        invoice_stream: 'operational',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_reference: paymentReference,
        notes: `Management fee for vacant unit ${unitNumber}`,
        price_snapshot: {
          vacantUnit: true,
          unitNumber,
          paymentReference,
          calculatedAt: new Date().toISOString(),
        },
        invoice_line_items: {
          create: lineItems.map((item) => ({
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
      include: VACANT_INVOICE_INCLUDE,
    });

    this.logger.log({
      event: 'vacant_invoice_created',
      apartmentId,
      unitNumber,
      invoiceId: invoice.id,
      billingPeriod,
      totalAmount,
    });

    return toInvoiceResponseDto(invoice);
  }
}

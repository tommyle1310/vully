import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEFAULT_UTILITY_RATE } from '../../common/constants/defaults';
import {
  InvoiceCalculation,
  InvoiceLineItemCalc,
} from '../../common/types/service-types';
import { ContractType } from '@prisma/client';

/** VAT rates by line item category (Vietnamese tax rules) */
const VAT_RATES: Record<string, number> = {
  rent: 0.10,
  installment: 0.10,
  milestone: 0.10,
  management_fee: 0.10,
  trash: 0.10,
  parking: 0.10,
  utility_electric: 0, // thu hộ - pass-through
  utility_water: 0, // thu hộ - pass-through
  utility_gas: 0.08,
};

/** Categories that incur 10% environment fee on top of tiered total */
const ENVIRONMENT_FEE_CATEGORIES = ['utility_water', 'utility_gas'];

@Injectable()
export class InvoiceCalculatorService {
  private readonly logger = new Logger(InvoiceCalculatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build all line items for an invoice. Supports rental, lease_to_own, and purchase contracts.
   */
  async calculateInvoice(
    contractId: string,
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    rentAmount: number,
    categories?: string[],
    contractType: ContractType = 'rental',
    unitNumber?: string,
    /** When true, skip milestone/installment line items (bulk generate = operational only) */
    operationalOnly = false,
  ): Promise<InvoiceCalculation> {
    const normalizedCategories = categories?.map((c) => c.toLowerCase());
    const includeAll =
      !normalizedCategories || normalizedCategories.length === 0;

    const lineItems: InvoiceLineItemCalc[] = [];

    // 1. Contract-type-specific line item
    if (contractType === 'rental') {
      const rentItem = this.buildRentLineItem(
        billingPeriod,
        rentAmount,
        contractId,
        includeAll,
        normalizedCategories,
      );
      if (rentItem) lineItems.push(rentItem);
    } else if (contractType === 'lease_to_own' && !operationalOnly) {
      const installmentItem = await this.buildInstallmentLineItem(
        contractId,
        billingPeriod,
        includeAll,
        normalizedCategories,
      );
      if (installmentItem) lineItems.push(installmentItem);
    } else if (contractType === 'purchase' && !operationalOnly) {
      const milestoneItems = await this.buildMilestoneLineItems(
        contractId,
        billingPeriod,
        includeAll,
        normalizedCategories,
      );
      lineItems.push(...milestoneItems);
    }

    // 2. Utility line items (all contract types)
    const utilityItems = await this.buildUtilityLineItems(
      apartmentId,
      buildingId,
      billingPeriod,
      includeAll,
      normalizedCategories,
    );
    lineItems.push(...utilityItems);

    // 3. Management fee (all occupied apartments)
    if (includeAll || normalizedCategories?.includes('management_fee')) {
      // Fetch contract dates for pro-rate calculation
      let contractStartDate: Date | undefined;
      let contractEndDate: Date | undefined;
      if (contractId) {
        const contract = await this.prisma.contracts.findUnique({
          where: { id: contractId },
          select: { start_date: true, end_date: true },
        });
        if (contract) {
          contractStartDate = contract.start_date;
          contractEndDate = contract.end_date ?? undefined;
        }
      }

      const mgmtItem = await this.buildManagementFeeLineItem(
        apartmentId,
        buildingId,
        billingPeriod,
        contractStartDate,
        contractEndDate,
      );
      if (mgmtItem) lineItems.push(mgmtItem);
    }

    // 4. Trash collection fee
    if (includeAll || normalizedCategories?.includes('trash')) {
      const trashItem = await this.buildTrashLineItem(
        buildingId,
        billingPeriod,
      );
      if (trashItem) lineItems.push(trashItem);
    }

    // 5. Parking fees (per assigned slot)
    if (includeAll || normalizedCategories?.includes('parking')) {
      const parkingItems = await this.buildParkingLineItems(
        apartmentId,
        billingPeriod,
      );
      lineItems.push(...parkingItems);
    }

    // Calculate totals with proper tax separation
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount = lineItems.reduce(
      (sum, item) => sum + item.vatAmount,
      0,
    );
    const totalAmount = subtotal + taxAmount + lineItems.reduce(
      (sum, item) => sum + item.environmentFee,
      0,
    );

    // Payment reference
    const typeCode =
      contractType === 'rental'
        ? 'RENT'
        : contractType === 'lease_to_own'
          ? 'LTO'
          : 'PUR';
    const periodCode = billingPeriod.replace('-', '');
    const paymentReference = unitNumber
      ? `${unitNumber}_${typeCode}_${periodCode}`
      : `${contractId.slice(0, 8)}_${typeCode}_${periodCode}`;

    return { subtotal, taxAmount, totalAmount, paymentReference, lineItems };
  }

  // ---------------------------------------------------------------------------
  // Rent (rental contracts)
  // ---------------------------------------------------------------------------
  private buildRentLineItem(
    billingPeriod: string,
    rentAmount: number,
    contractId: string,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): InvoiceLineItemCalc | null {
    if (
      (!includeAll && !normalizedCategories?.includes('rent')) ||
      rentAmount <= 0
    ) {
      return null;
    }

    const vatRate = VAT_RATES['rent'];
    const vatAmount = rentAmount * vatRate;

    return {
      description: `Rent for ${billingPeriod}`,
      category: 'rent',
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount + vatAmount,
      vatRate,
      vatAmount,
      environmentFee: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Installment (lease-to-own contracts)
  // ---------------------------------------------------------------------------
  private async buildInstallmentLineItem(
    contractId: string,
    billingPeriod: string,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): Promise<InvoiceLineItemCalc | null> {
    if (!includeAll && !normalizedCategories?.includes('installment')) {
      return null;
    }

    const contract = await this.prisma.contracts.findUnique({
      where: { id: contractId },
    });
    if (!contract || !contract.purchase_option_price) return null;

    const totalPrincipal = Number(contract.purchase_option_price);
    const monthlyBase = Number(contract.rent_amount) || 0;
    if (monthlyBase <= 0) return null;

    // Simple installment: monthly payment = rent_amount field
    // Split into principal & interest (MVP: 5% annual assumed if no field)
    const annualRate = 0.05;
    const monthlyRate = annualRate / 12;

    // Determine installment number from existing invoices
    const existingCount = await this.prisma.invoices.count({
      where: {
        contract_id: contractId,
        invoice_line_items: { some: { category: 'installment' } },
      },
    });
    const installmentNumber = existingCount + 1;

    // Calculate remaining principal (simplified)
    const totalMonths = contract.option_period_months || 60;
    const principalPerMonth = totalPrincipal / totalMonths;
    const remainingPrincipal = Math.max(
      0,
      totalPrincipal - principalPerMonth * existingCount,
    );
    const interestPayment = remainingPrincipal * monthlyRate;
    const principalPayment = monthlyBase - interestPayment;
    const totalPayment = principalPayment + interestPayment;

    const vatRate = VAT_RATES['installment'];
    const vatAmount = totalPayment * vatRate;

    return {
      description: `Installment ${installmentNumber}/${totalMonths} - ${billingPeriod}`,
      category: 'installment',
      quantity: 1,
      unitPrice: totalPayment,
      amount: totalPayment + vatAmount,
      vatRate,
      vatAmount,
      environmentFee: 0,
      metadata: {
        installmentNumber: `${installmentNumber}/${totalMonths}`,
        principalPayment: Math.round(principalPayment),
        interestPayment: Math.round(interestPayment),
        remainingPrincipal: Math.round(remainingPrincipal - principalPayment),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Milestone (purchase contracts)
  // ---------------------------------------------------------------------------
  private async buildMilestoneLineItems(
    contractId: string,
    billingPeriod: string,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): Promise<InvoiceLineItemCalc[]> {
    if (!includeAll && !normalizedCategories?.includes('milestone')) {
      return [];
    }

    const [year, month] = billingPeriod.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Find milestones due in this billing period
    const milestones = await this.prisma.contract_payment_schedules.findMany({
      where: {
        contract_id: contractId,
        due_date: { gte: periodStart, lte: periodEnd },
        status: { in: ['pending', 'overdue'] },
      },
      orderBy: { sequence_number: 'asc' },
    });

    return milestones.map((ms) => {
      const expectedAmount = Number(ms.expected_amount);
      const vatRate = VAT_RATES['milestone'];
      const vatAmount = expectedAmount * vatRate;

      return {
        description: `Milestone: ${ms.period_label}`,
        category: 'milestone',
        quantity: 1,
        unitPrice: expectedAmount,
        amount: expectedAmount + vatAmount,
        vatRate,
        vatAmount,
        environmentFee: 0,
        metadata: {
          scheduleId: ms.id,
          milestoneName: ms.period_label,
          sequenceNumber: ms.sequence_number,
        },
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities (all contract types)
  // ---------------------------------------------------------------------------
  private async buildUtilityLineItems(
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): Promise<InvoiceLineItemCalc[]> {
    // If specific categories were requested, resolve utility type codes to IDs
    let utilityTypeFilter: { id: { in: string[] } } | undefined;
    if (!includeAll && normalizedCategories) {
      const utilityCodes = normalizedCategories.filter(
        (c) => !['rent', 'installment', 'milestone', 'management_fee', 'trash', 'parking'].includes(c),
      );
      if (utilityCodes.length === 0) return [];

      const utilityTypes = await this.prisma.utility_types.findMany({
        where: { code: { in: utilityCodes } },
        select: { id: true },
      });
      if (utilityTypes.length === 0) return [];
      utilityTypeFilter = { id: { in: utilityTypes.map((ut) => ut.id) } };
    }

    const readings = await this.prisma.meter_readings.findMany({
      where: {
        apartment_id: apartmentId,
        billing_period: billingPeriod,
        ...(utilityTypeFilter ? { utility_type_id: utilityTypeFilter.id } : {}),
      },
      include: { utility_types: true },
    });

    const lineItems: InvoiceLineItemCalc[] = [];

    for (const reading of readings) {
      // Treat null previous_value as 0 (first reading for new apartment)
      const previousValue = reading.previous_value !== null
        ? Number(reading.previous_value)
        : 0;

      const usage = Number(reading.current_value) - previousValue;
      if (usage <= 0) continue;

      const { amount: tieredTotal, breakdown } =
        await this.calculateTieredAmount(
          reading.utility_type_id,
          buildingId,
          usage,
          billingPeriod,
        );

      const utilityCode = reading.utility_types.code.toLowerCase();
      const category = `utility_${utilityCode}`;
      const vatRate = VAT_RATES[category] ?? 0;
      const vatAmount = tieredTotal * vatRate;

      // Environment fee (10%) for water and gas
      const environmentFee = ENVIRONMENT_FEE_CATEGORIES.includes(category)
        ? tieredTotal * 0.1
        : 0;

      const totalAmount = tieredTotal + vatAmount + environmentFee;

      lineItems.push({
        description: `${reading.utility_types.name} - ${usage} ${reading.utility_types.unit}`,
        category,
        quantity: usage,
        unitPrice: tieredTotal / usage,
        amount: totalAmount,
        vatRate,
        vatAmount,
        environmentFee,
        utilityTypeId: reading.utility_type_id,
        meterReadingId: reading.id,
        tierBreakdown: breakdown,
      });
    }

    return lineItems;
  }

  // ---------------------------------------------------------------------------
  // Management Fee
  // ---------------------------------------------------------------------------
  async buildManagementFeeLineItem(
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    contractStartDate?: Date,
    contractEndDate?: Date,
  ): Promise<InvoiceLineItemCalc | null> {
    const [year, month] = billingPeriod.split('-').map(Number);
    const periodDate = new Date(year, month - 1, 15);

    const config = await this.prisma.management_fee_configs.findFirst({
      where: {
        building_id: buildingId,
        effective_from: { lte: periodDate },
        OR: [
          { effective_to: null },
          { effective_to: { gte: periodDate } },
        ],
      },
      orderBy: { effective_from: 'desc' },
    });

    if (!config) return null;

    const apartment = await this.prisma.apartments.findUnique({
      where: { id: apartmentId },
      select: { gross_area: true, net_area: true },
    });

    const area = Number(apartment?.net_area ?? apartment?.gross_area ?? 0);
    if (area <= 0) return null;

    const ratePerSqm = Number(config.price_per_sqm);
    const fullMonthAmount = area * ratePerSqm;

    // Pro-rate calculation
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // last day of month
    const totalDays = periodEnd.getDate();

    let billableDays = totalDays;
    const effectiveStart = contractStartDate && contractStartDate > periodStart
      ? contractStartDate
      : periodStart;
    const effectiveEnd = contractEndDate && contractEndDate < periodEnd
      ? contractEndDate
      : periodEnd;

    if (effectiveStart > periodStart || effectiveEnd < periodEnd) {
      billableDays = Math.max(
        0,
        Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
    }

    const proRateFactor = billableDays / totalDays;
    const isProRated = proRateFactor < 1.0;
    const baseAmount = Math.round(fullMonthAmount * proRateFactor);
    const vatRate = VAT_RATES['management_fee'];
    const vatAmount = Math.round(baseAmount * vatRate);

    const description = isProRated
      ? `Management Fee (${area} m² × ${ratePerSqm.toLocaleString()} VND/m²) — Pro-rated: ${billableDays}/${totalDays} days`
      : `Management Fee (${area} m² × ${ratePerSqm.toLocaleString()} VND/m²)`;

    return {
      description,
      category: 'management_fee',
      quantity: area,
      unitPrice: Math.round(ratePerSqm * proRateFactor),
      amount: baseAmount + vatAmount,
      vatRate,
      vatAmount,
      environmentFee: 0,
      ...(isProRated && {
        metadata: {
          proRated: true,
          billableDays,
          totalDays,
          fullMonthAmount,
        },
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Trash Collection Fee
  // ---------------------------------------------------------------------------
  private async buildTrashLineItem(
    buildingId: string,
    billingPeriod: string,
  ): Promise<InvoiceLineItemCalc | null> {
    const [year, month] = billingPeriod.split('-').map(Number);
    const periodDate = new Date(year, month - 1, 15);

    const policy = await this.prisma.building_policies.findFirst({
      where: {
        building_id: buildingId,
        effective_from: { lte: periodDate },
        OR: [
          { effective_to: null },
          { effective_to: { gte: periodDate } },
        ],
      },
      orderBy: { effective_from: 'desc' },
    });

    const trashFee = Number(policy?.trash_fee_per_month ?? 0);
    if (trashFee <= 0) return null;

    const vatRate = VAT_RATES['trash'];
    const vatAmount = trashFee * vatRate;

    return {
      description: `Trash Collection Fee - ${billingPeriod}`,
      category: 'trash',
      quantity: 1,
      unitPrice: trashFee,
      amount: trashFee + vatAmount,
      vatRate,
      vatAmount,
      environmentFee: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Parking Fees (per assigned slot)
  // ---------------------------------------------------------------------------
  private async buildParkingLineItems(
    apartmentId: string,
    billingPeriod: string,
  ): Promise<InvoiceLineItemCalc[]> {
    const slots = await this.prisma.parking_slots.findMany({
      where: {
        assigned_apt_id: apartmentId,
        status: 'assigned',
      },
      include: { parking_zones: true },
    });

    const lineItems: InvoiceLineItemCalc[] = [];

    for (const slot of slots) {
      const monthlyFee = Number(
        slot.fee_override ?? slot.parking_zones.fee_per_month ?? 0,
      );
      if (monthlyFee <= 0) continue;

      const slotType = slot.parking_zones.slot_type; // car | motorcycle | bicycle
      const vatRate = VAT_RATES['parking'];
      const vatAmount = monthlyFee * vatRate;

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

    return lineItems;
  }

  // ---------------------------------------------------------------------------
  // Tiered pricing
  // ---------------------------------------------------------------------------
  async calculateTieredAmount(
    utilityTypeId: string,
    buildingId: string,
    usage: number,
    billingPeriod: string,
  ): Promise<{ amount: number; breakdown: Record<string, unknown> }> {
    const [year, month] = billingPeriod.split('-').map(Number);
    const periodDate = new Date(year, month - 1, 15);

    const tiers = await this.prisma.utility_tiers.findMany({
      where: {
        utility_type_id: utilityTypeId,
        effective_from: { lte: periodDate },
        AND: [
          {
            OR: [
              { building_id: buildingId },
              { building_id: null },
            ],
          },
          {
            OR: [{ effective_to: null }, { effective_to: { gte: periodDate } }],
          },
        ],
      },
      orderBy: { tier_number: 'asc' },
    });

    if (tiers.length === 0) {
      return {
        amount: usage * DEFAULT_UTILITY_RATE,
        breakdown: { flatRate: true, usage, unitPrice: DEFAULT_UTILITY_RATE },
      };
    }

    // Sequential consumption across tiers
    let remaining = usage;
    let totalAmount = 0;
    const tierDetails: unknown[] = [];

    for (const tier of tiers) {
      if (remaining <= 0) break;

      const tierMin = Number(tier.min_usage);
      const tierMax = tier.max_usage ? Number(tier.max_usage) : Infinity;
      const tierCapacity = tierMax - tierMin;
      const tierPrice = Number(tier.unit_price);
      const qty = Math.min(remaining, tierCapacity);

      const tierAmount = qty * tierPrice;
      totalAmount += tierAmount;
      remaining -= qty;

      tierDetails.push({
        tier: tier.tier_number,
        qty,
        price: tierPrice,
        amount: tierAmount,
      });
    }

    return { amount: totalAmount, breakdown: { tiers: tierDetails } };
  }

  // ---------------------------------------------------------------------------
  // Invoice number generation
  // ---------------------------------------------------------------------------
  async generateInvoiceNumber(billingPeriod: string): Promise<string> {
    const prefix = `INV-${billingPeriod.replace('-', '')}`;

    const lastInvoice = await this.prisma.invoices.findFirst({
      where: { invoice_number: { startsWith: prefix } },
      orderBy: { invoice_number: 'desc' },
    });

    if (!lastInvoice) {
      return `${prefix}-0001`;
    }

    const lastNumber = parseInt(
      lastInvoice.invoice_number.split('-').pop() || '0',
      10,
    );
    return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
  }
}

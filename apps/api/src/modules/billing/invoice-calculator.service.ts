import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DEFAULT_UTILITY_RATE,
} from '../../common/constants/defaults';
import { InvoiceCalculation } from '../../common/types/service-types';

@Injectable()
export class InvoiceCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateInvoice(
    contractId: string,
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    rentAmount: number,
    categories?: string[],
  ): Promise<InvoiceCalculation> {
    const normalizedCategories = categories?.map((c) => c.toLowerCase());
    const includeAll = !normalizedCategories || normalizedCategories.length === 0;

    const rentItem = this.buildRentLineItem(billingPeriod, rentAmount, includeAll, normalizedCategories);
    const utilityItems = await this.buildUtilityLineItems(apartmentId, buildingId, billingPeriod, includeAll, normalizedCategories);

    const lineItems = [...(rentItem ? [rentItem] : []), ...utilityItems];
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = 0; // No VAT for residential rent in Vietnam
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount, lineItems };
  }

  private buildRentLineItem(
    billingPeriod: string,
    rentAmount: number,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): InvoiceCalculation['lineItems'][0] | null {
    if ((!includeAll && !normalizedCategories?.includes('rent')) || rentAmount <= 0) {
      return null;
    }
    return {
      description: `Rent for ${billingPeriod}`,
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount,
    };
  }

  private async buildUtilityLineItems(
    apartmentId: string,
    buildingId: string,
    billingPeriod: string,
    includeAll: boolean,
    normalizedCategories?: string[],
  ): Promise<InvoiceCalculation['lineItems']> {
    const readings = await this.prisma.meter_readings.findMany({
      where: {
        apartment_id: apartmentId,
        billing_period: billingPeriod,
      },
      take: 1000,
      include: {
        utility_types: true,
      },
    });

    const lineItems: InvoiceCalculation['lineItems'] = [];

    for (const reading of readings) {
      if (reading.previous_value === null) continue;

      const utilityCode = reading.utility_types.code.toLowerCase();
      if (!includeAll && !normalizedCategories?.includes(utilityCode)) continue;

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

    return lineItems;
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
        amount: usage * DEFAULT_UTILITY_RATE,
        breakdown: { flatRate: true, usage, unitPrice: DEFAULT_UTILITY_RATE },
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

  async generateInvoiceNumber(billingPeriod: string): Promise<string> {
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
}

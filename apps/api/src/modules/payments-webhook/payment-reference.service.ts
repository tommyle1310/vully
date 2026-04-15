import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Payment Reference Service
 * 
 * Generates unique payment references for invoices and contract schedules.
 * These references are used by residents in bank transfer descriptions
 * and parsed by the webhook service for auto-matching.
 * 
 * Format:
 * - Invoice: VULLY-INV-{6-char-suffix} (last 6 chars of UUID)
 * - Contract Schedule: VULLY-CTR-{6-char-suffix}
 */
@Injectable()
export class PaymentReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate payment reference for an invoice
   */
  generateInvoiceReference(invoiceId: string): string {
    const suffix = invoiceId.replace(/-/g, '').slice(-6).toUpperCase();
    return `VULLY-INV-${suffix}`;
  }

  /**
   * Generate payment reference for a contract payment schedule
   */
  generateContractReference(scheduleId: string): string {
    const suffix = scheduleId.replace(/-/g, '').slice(-6).toUpperCase();
    return `VULLY-CTR-${suffix}`;
  }

  /**
   * Parse payment reference from bank transfer description
   * Returns null if no valid reference found
   */
  parsePaymentReference(description: string): {
    type: 'invoice' | 'contract';
    reference: string;
    suffix: string;
  } | null {
    const regex = /VULLY-(INV|CTR)-([A-Z0-9]{6})/i;
    const match = description.match(regex);
    
    if (!match) {
      return null;
    }

    return {
      type: match[1].toUpperCase() === 'INV' ? 'invoice' : 'contract',
      reference: match[0].toUpperCase(),
      suffix: match[2].toUpperCase(),
    };
  }

  /**
   * Find invoice by payment reference
   */
  async findInvoiceByReference(reference: string) {
    return this.prisma.invoices.findFirst({
      where: {
        payment_reference: reference,
      },
      include: {
        contracts: {
          include: {
            users_contracts_tenant_idTousers: true,
          },
        },
        apartments: true,
      },
    });
  }

  /**
   * Find contract payment schedule by payment reference
   */
  async findScheduleByReference(reference: string) {
    return this.prisma.contract_payment_schedules.findFirst({
      where: {
        payment_reference: reference,
      },
      include: {
        contracts: {
          include: {
            users_contracts_tenant_idTousers: true,
            apartments: true,
          },
        },
      },
    });
  }

  /**
   * Ensure all invoices have payment references (backfill)
   */
  async backfillInvoiceReferences(): Promise<number> {
    const invoicesWithoutRef = await this.prisma.invoices.findMany({
      where: {
        payment_reference: null,
      },
      select: { id: true },
    });

    let updated = 0;
    for (const invoice of invoicesWithoutRef) {
      const reference = this.generateInvoiceReference(invoice.id);
      await this.prisma.invoices.update({
        where: { id: invoice.id },
        data: { payment_reference: reference },
      });
      updated++;
    }

    return updated;
  }

  /**
   * Ensure all contract schedules have payment references (backfill)
   */
  async backfillScheduleReferences(): Promise<number> {
    const schedulesWithoutRef = await this.prisma.contract_payment_schedules.findMany({
      where: {
        payment_reference: null,
      },
      select: { id: true },
    });

    let updated = 0;
    for (const schedule of schedulesWithoutRef) {
      const reference = this.generateContractReference(schedule.id);
      await this.prisma.contract_payment_schedules.update({
        where: { id: schedule.id },
        data: { payment_reference: reference },
      });
      updated++;
    }

    return updated;
  }
}

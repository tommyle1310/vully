import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Helper service to sync confirmed invoice payments to payment schedules.
 * Ensures Financial Summary in contract detail shows correct payment amounts.
 */
@Injectable()
export class InvoicesScheduleSyncHelper {
  private readonly logger = new Logger(InvoicesScheduleSyncHelper.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sync confirmed invoice payment to the corresponding payment schedule.
   * This ensures Financial Summary in contract detail shows the correct amounts.
   */
  async syncPaymentToSchedule(
    contractId: string | null,
    billingPeriod: string,
    lineItems: { category: string | null; unit_price: Prisma.Decimal }[],
    paidAmount: number,
    invoiceSubtotal: number,
    invoiceTotalAmount: number,
    reportedPayment: Record<string, unknown>,
    verifierId: string,
  ): Promise<void> {
    if (!contractId) {
      return; // Vacant invoice, no schedule to sync
    }

    const categoriesInInvoice = new Set(
      lineItems.map((item) => item.category).filter((c) => c !== null),
    );

    // Map invoice categories to payment types
    let paymentType: 'rent' | 'installment' | 'downpayment' | 'other' = 'other';
    if (categoriesInInvoice.has('rent')) {
      paymentType = 'rent';
    } else if (categoriesInInvoice.has('installment')) {
      paymentType = 'installment';
    } else if (categoriesInInvoice.has('milestone')) {
      paymentType = 'downpayment'; // Milestone payments map to downpayment schedules
    }

    // Find an existing schedule matching this billing period and payment type
    const schedules = await this.prisma.contract_payment_schedules.findMany({
      where: {
        contract_id: contractId,
        payment_type: paymentType === 'other' ? { not: 'rent' as const } : paymentType,
        status: { in: ['pending', 'overdue', 'partial'] },
      },
      orderBy: { due_date: 'asc' },
    });

    if (schedules.length === 0) {
      this.logger.debug({
        event: 'no_matching_schedule_found',
        contractId,
        billingPeriod,
        paymentType,
        message: 'No pending schedules to sync. Skipping.',
      });
      return;
    }

    // Pick the earliest pending schedule
    const schedule = schedules[0];
    const expectedAmount = Number(schedule.expected_amount);
    const currentReceived = Number(schedule.received_amount);
    const newReceived = currentReceived + paidAmount;

    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (newReceived >= expectedAmount) {
      newStatus = 'paid';
    } else if (newReceived > 0) {
      newStatus = 'partial';
    }

    await this.prisma.$transaction(async (tx) => {
      // Update schedule
      await tx.contract_payment_schedules.update({
        where: { id: schedule.id },
        data: {
          received_amount: newReceived,
          status: newStatus,
          ...(newStatus === 'paid' && { paid_date: new Date() }),
          updated_at: new Date(),
        },
      });

      // Create a contract_payments record
      const contract = await tx.contracts.findUnique({
        where: { id: contractId },
        select: { tenant_id: true },
      });

      await tx.contract_payments.create({
        data: {
          schedule_id: schedule.id,
          recorded_by: verifierId, // Admin who verified
          amount: paidAmount,
          payment_method: (reportedPayment.paymentMethod as 'bank_transfer' | 'cash' | 'check' | 'card' | 'other') ?? 'bank_transfer',
          reference_number: (reportedPayment.transactionRef as string) ?? null,
          payment_date: new Date((reportedPayment.transactionDate as string) ?? new Date()),
          recorded_at: new Date(),
          status: 'confirmed',
          notes: `Auto-synced from invoice payment (Billing Period: ${billingPeriod})`,
        },
      });
    });

    this.logger.log({
      event: 'invoice_payment_synced_to_schedule',
      scheduleId: schedule.id,
      contractId,
      billingPeriod,
      paymentType,
      paidAmount,
      newReceived,
      newStatus,
    });
  }
}

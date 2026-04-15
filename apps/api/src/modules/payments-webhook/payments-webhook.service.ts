import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentReferenceService } from './payment-reference.service';
import { PaymentInfoDto } from './dto/webhook-payload.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { IncidentsGateway } from '../incidents/incidents.gateway';
import { WS_EVENTS, WS_ROOMS } from '@vully/shared-types';

/**
 * Webhook processing result type
 */
export type WebhookProcessingResult = {
  status: 'matched' | 'unmatched' | 'already_processed' | 'skipped';
  entityType?: 'invoice' | 'contract_schedule';
  entityId?: string;
  message?: string;
};

/**
 * Payment Webhook Service
 * 
 * Core service for processing payment webhooks from VietQR gateways.
 * 
 * ⚠️ CRITICAL: Uses Prisma $transaction for atomic idempotency check and update
 * to prevent double-crediting when gateways send duplicate webhooks.
 */
@Injectable()
export class PaymentsWebhookService {
  private readonly logger = new Logger(PaymentsWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRefService: PaymentReferenceService,
    private readonly socketGateway: IncidentsGateway,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  /**
   * Process a single payment webhook
   * 
   * ⚠️ CRITICAL: This method uses $transaction for atomic:
   * 1. Idempotency check (has this transaction been processed?)
   * 2. Find matching invoice/schedule by payment_reference
   * 3. Update invoice OR store as unmatched payment
   * 
   * All operations MUST be in the same transaction to prevent race conditions
   * when gateways retry webhooks during slow responses.
   */
  async processPayment(payment: PaymentInfoDto): Promise<WebhookProcessingResult> {
    this.logger.log('Processing payment webhook', {
      transactionId: payment.transactionId,
      amount: payment.amount,
      gateway: payment.gateway,
    });

    // Parse payment reference from description
    const refInfo = this.paymentRefService.parsePaymentReference(payment.description);

    const result = await this.prisma.$transaction(async (tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0]) => {
      // 1. Check idempotency - has this transaction been processed?
      
      // Check invoices
      const existingInvoice = await tx.invoices.findFirst({
        where: { external_transaction_id: payment.transactionId },
        select: { id: true },
      });
      if (existingInvoice) {
        return {
          status: 'already_processed' as const,
          entityType: 'invoice' as const,
          entityId: existingInvoice.id,
          message: 'Invoice already updated with this transaction',
        };
      }

      // Check contract schedules
      const existingSchedule = await tx.contract_payment_schedules.findFirst({
        where: { external_transaction_id: payment.transactionId },
        select: { id: true },
      });
      if (existingSchedule) {
        return {
          status: 'already_processed' as const,
          entityType: 'contract_schedule' as const,
          entityId: existingSchedule.id,
          message: 'Schedule already updated with this transaction',
        };
      }

      // Check unmatched payments
      const existingUnmatched = await tx.unmatched_payments.findFirst({
        where: { transaction_id: payment.transactionId },
        select: { id: true },
      });
      if (existingUnmatched) {
        return {
          status: 'already_processed' as const,
          message: 'Already stored as unmatched payment',
        };
      }

      // 2. Try to find matching entity by payment_reference
      if (refInfo) {
        if (refInfo.type === 'invoice') {
          const invoice = await tx.invoices.findFirst({
            where: { payment_reference: refInfo.reference },
            include: {
              contracts: {
                include: {
                  users_contracts_tenant_idTousers: true,
                },
              },
            },
          });

          if (invoice) {
            // Update invoice as paid
            await tx.invoices.update({
              where: { id: invoice.id },
              data: {
                status: 'paid',
                paid_amount: new Decimal(payment.amount),
                paid_at: new Date(),
                external_transaction_id: payment.transactionId,
                raw_gateway_response: payment as any,
              },
            });

            return {
              status: 'matched' as const,
              entityType: 'invoice' as const,
              entityId: invoice.id,
              tenantId: invoice.contracts?.users_contracts_tenant_idTousers?.id,
            };
          }
        } else {
          // Contract payment schedule
          const schedule = await tx.contract_payment_schedules.findFirst({
            where: { payment_reference: refInfo.reference },
            include: {
              contracts: {
                include: {
                  users_contracts_tenant_idTousers: true,
                },
              },
            },
          });

          if (schedule) {
            // Update schedule as paid
            const newReceivedAmount = schedule.received_amount.add(new Decimal(payment.amount));
            const newStatus = newReceivedAmount.gte(schedule.expected_amount) ? 'paid' : 'partial';

            await tx.contract_payment_schedules.update({
              where: { id: schedule.id },
              data: {
                received_amount: newReceivedAmount,
                status: newStatus,
                external_transaction_id: payment.transactionId,
                raw_gateway_response: payment as any,
              },
            });

            return {
              status: 'matched' as const,
              entityType: 'contract_schedule' as const,
              entityId: schedule.id,
              tenantId: schedule.contracts?.users_contracts_tenant_idTousers?.id,
            };
          }
        }
      }

      // 3. No match found - store as unmatched payment for manual reconciliation
      const unmatched = await tx.unmatched_payments.create({
        data: {
          gateway: payment.gateway,
          transaction_id: payment.transactionId,
          amount: new Decimal(payment.amount),
          sender_name: payment.senderName,
          description: payment.description,
          received_at: new Date(payment.transactionTime),
          raw_payload: payment as any,
          status: 'pending',
        },
      });

      return {
        status: 'unmatched' as const,
        entityId: unmatched.id,
        message: 'No matching invoice or schedule found',
      };
    });

    // 4. Post-transaction actions (notifications, events)
    await this.handlePostProcessing(result as WebhookProcessingResult & { tenantId?: string }, payment);

    return result;
  }

  /**
   * Handle post-processing after successful transaction
   * Runs OUTSIDE the transaction to avoid blocking
   */
  private async handlePostProcessing(
    result: WebhookProcessingResult & { tenantId?: string },
    payment: PaymentInfoDto,
  ): Promise<void> {
    if (result.status === 'matched' && result.tenantId) {
      // Emit WebSocket event to tenant
      this.socketGateway.server
        .to(WS_ROOMS.user(result.tenantId))
        .emit(WS_EVENTS.PAYMENT_COMPLETED, {
          invoiceId: result.entityType === 'invoice' ? result.entityId : undefined,
          contractPaymentId: result.entityType === 'contract_schedule' ? result.entityId : undefined,
          amount: payment.amount,
          gateway: payment.gateway,
          transactionId: payment.transactionId,
          status: 'completed',
        });

      // Queue notification to tenant
      await this.notificationQueue.add('send', {
        type: 'payment_confirmed',
        userId: result.tenantId,
        data: {
          entityType: result.entityType,
          entityId: result.entityId,
          amount: payment.amount,
          gateway: payment.gateway,
          transactionId: payment.transactionId,
        },
      });

      this.logger.log('Payment matched and notification queued', {
        entityType: result.entityType,
        entityId: result.entityId,
        tenantId: result.tenantId,
      });
    } else if (result.status === 'unmatched') {
      // Emit WebSocket event to accountants/admins
      this.socketGateway.server
        .to(WS_ROOMS.accountant())
        .to(WS_ROOMS.admin())
        .emit(WS_EVENTS.PAYMENT_UNMATCHED, {
          unmatchedPaymentId: result.entityId,
          amount: payment.amount,
          gateway: payment.gateway,
          senderName: payment.senderName,
          description: payment.description,
          receivedAt: new Date().toISOString(),
        });

      // Queue notification to accountants
      await this.notificationQueue.add('send', {
        type: 'unmatched_payment',
        roles: ['accountant', 'admin'],
        data: {
          amount: payment.amount,
          senderName: payment.senderName,
          description: payment.description,
          gateway: payment.gateway,
        },
      });

      this.logger.warn('Unmatched payment stored', {
        transactionId: payment.transactionId,
        amount: payment.amount,
        description: payment.description,
      });
    }
  }

  /**
   * Process multiple payments (for gateways that batch transactions)
   */
  async processPayments(payments: PaymentInfoDto[]): Promise<WebhookProcessingResult[]> {
    const results: WebhookProcessingResult[] = [];

    for (const payment of payments) {
      try {
        const result = await this.processPayment(payment);
        results.push(result);
      } catch (error) {
        this.logger.error('Failed to process payment', {
          transactionId: payment.transactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.push({
          status: 'skipped',
          message: error instanceof Error ? error.message : 'Processing failed',
        });
      }
    }

    return results;
  }
}

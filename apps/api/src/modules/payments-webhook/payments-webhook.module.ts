import { Module, forwardRef } from '@nestjs/common';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsWebhookService } from './payments-webhook.service';
import { UnmatchedPaymentsController } from './unmatched-payments.controller';
import { UnmatchedPaymentsService } from './unmatched-payments.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { PayOSAdapter } from './adapters/payos.adapter';
import { CassoAdapter } from './adapters/casso.adapter';
import { SePayAdapter } from './adapters/sepay.adapter';
import { PaymentReferenceService } from './payment-reference.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BullModule } from '@nestjs/bull';
import { IncidentsModule } from '../incidents/incidents.module';

/**
 * Payment Webhook Module
 * 
 * Handles VietQR payment webhook processing from:
 * - PayOS
 * - Casso
 * - SePay
 * 
 * Features:
 * - Signature verification per gateway
 * - Atomic idempotency check with $transaction
 * - Unmatched payment handling for manual reconciliation
 * - Manual re-sync/reconciliation job
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    forwardRef(() => IncidentsModule),
  ],
  controllers: [
    PaymentsWebhookController,
    UnmatchedPaymentsController,
    ReconciliationController,
  ],
  providers: [
    PrismaService,
    PaymentsWebhookService,
    UnmatchedPaymentsService,
    ReconciliationService,
    PaymentReferenceService,
    PayOSAdapter,
    CassoAdapter,
    SePayAdapter,
  ],
  exports: [
    PaymentsWebhookService,
    PaymentReferenceService,
  ],
})
export class PaymentsWebhookModule {}

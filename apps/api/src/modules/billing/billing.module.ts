import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { InvoicesCoreService } from './invoices/invoices-core.service';
import { InvoicesPaymentService } from './invoices/invoices-payment.service';
import { InvoicesScheduleSyncHelper } from './invoices/invoices-schedule-sync.helper';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { MeterReadingsController } from './meter-readings/meter-readings.controller';
import { MeterReadingsService } from './meter-readings/meter-readings.service';
import { UtilityTypesController } from './utility-types/utility-types.controller';
import { UtilityTypesService } from './utility-types/utility-types.service';
import { BillingProcessor } from './billing.processor';
import { BillingQueueService } from './billing-queue.service';
import { BillingJobsController } from './billing-jobs.controller';
import { VietQRService } from './vietqr/vietqr.service';
import { VacantBillingService } from './vacant-billing/vacant-billing.service';
import { PaymentReminderJobs } from './payment-reminder-jobs';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'billing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    InvoicesController,
    MeterReadingsController,
    UtilityTypesController,
    BillingJobsController,
  ],
  providers: [
    // Invoice services (facade + specialized services)
    InvoicesService,
    InvoicesCoreService,
    InvoicesPaymentService,
    InvoicesScheduleSyncHelper,
    InvoiceCalculatorService,
    // Meter readings & utility types
    MeterReadingsService,
    UtilityTypesService,
    // Background processing
    BillingProcessor,
    BillingQueueService,
    // Additional services
    VietQRService,
    VacantBillingService,
    // Scheduled jobs
    PaymentReminderJobs,
  ],
  exports: [
    InvoicesService,
    InvoiceCalculatorService,
    MeterReadingsService,
    UtilityTypesService,
    BillingQueueService,
    VietQRService,
    VacantBillingService,
  ],
})
export class BillingModule {}

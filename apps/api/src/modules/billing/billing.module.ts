import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';
import { UtilityTypesController } from './utility-types.controller';
import { UtilityTypesService } from './utility-types.service';
import { BillingProcessor } from './billing.processor';
import { BillingQueueService } from './billing-queue.service';
import { BillingJobsController } from './billing-jobs.controller';
import { VietQRService } from './vietqr.service';

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
  ],
  controllers: [
    InvoicesController,
    MeterReadingsController,
    UtilityTypesController,
    BillingJobsController,
  ],
  providers: [
    InvoicesService,
    InvoiceCalculatorService,
    MeterReadingsService,
    UtilityTypesService,
    BillingProcessor,
    BillingQueueService,
    VietQRService,
  ],
  exports: [
    InvoicesService,
    InvoiceCalculatorService,
    MeterReadingsService,
    UtilityTypesService,
    BillingQueueService,
    VietQRService,
  ],
})
export class BillingModule {}

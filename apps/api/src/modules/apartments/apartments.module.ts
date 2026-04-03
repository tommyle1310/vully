import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedule.service';

@Module({
  controllers: [
    BuildingsController,
    ApartmentsController,
    ContractsController,
    PaymentScheduleController,
  ],
  providers: [
    BuildingsService,
    ApartmentsService,
    ContractsService,
    PaymentScheduleService,
  ],
  exports: [
    BuildingsService,
    ApartmentsService,
    ContractsService,
    PaymentScheduleService,
  ],
})
export class ApartmentsModule {}

import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedule.service';
import { BuildingPoliciesController } from './building-policies.controller';
import { BuildingPoliciesService } from './building-policies.service';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';

@Module({
  controllers: [
    BuildingsController,
    ApartmentsController,
    ContractsController,
    PaymentScheduleController,
    BuildingPoliciesController,
    ParkingController,
  ],
  providers: [
    BuildingsService,
    ApartmentsService,
    ContractsService,
    PaymentScheduleService,
    BuildingPoliciesService,
    ParkingService,
  ],
  exports: [
    BuildingsService,
    ApartmentsService,
    ContractsService,
    PaymentScheduleService,
    BuildingPoliciesService,
    ParkingService,
  ],
})
export class ApartmentsModule {}

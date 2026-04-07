import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { BuildingsSvgService } from './buildings-svg.service';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { ApartmentsConfigService } from './apartments-config.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { ContractsTenantService } from './contracts-tenant.service';
import { PaymentScheduleController } from './payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedule.service';
import { PaymentGeneratorService } from './payment-generator.service';
import { BuildingPoliciesController } from './building-policies.controller';
import { BuildingPoliciesService } from './building-policies.service';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';
import { ParkingZonesService } from './parking-zones.service';
import { AccessCardsController } from './access-cards.controller';
import { AccessCardsService } from './access-cards.service';
import { AccessCardsHelpersService } from './access-cards-helpers.service';
import { AccessCardsLifecycleService } from './access-cards-lifecycle.service';

@Module({
  controllers: [
    BuildingsController,
    ApartmentsController,
    ContractsController,
    PaymentScheduleController,
    BuildingPoliciesController,
    ParkingController,
    AccessCardsController,
  ],
  providers: [
    BuildingsService,
    BuildingsSvgService,
    ApartmentsService,
    ApartmentsConfigService,
    ContractsService,
    ContractsTenantService,
    PaymentScheduleService,
    PaymentGeneratorService,
    BuildingPoliciesService,
    ParkingService,
    ParkingZonesService,
    AccessCardsService,
    AccessCardsHelpersService,
    AccessCardsLifecycleService,
  ],
  exports: [
    BuildingsService,
    BuildingsSvgService,
    ApartmentsService,
    ApartmentsConfigService,
    ContractsService,
    ContractsTenantService,
    PaymentScheduleService,
    PaymentGeneratorService,
    BuildingPoliciesService,
    ParkingService,
    ParkingZonesService,
    AccessCardsService,
    AccessCardsHelpersService,
    AccessCardsLifecycleService,
  ],
})
export class ApartmentsModule implements OnModuleInit {
  private readonly logger = new Logger(ApartmentsModule.name);

  constructor(private readonly paymentGeneratorService: PaymentGeneratorService) {}

  async onModuleInit() {
    try {
      const count = await this.paymentGeneratorService.updateOverdueStatuses();
      if (count > 0) {
        this.logger.log(`Updated ${count} overdue payment schedule(s) on startup`);
      }
    } catch (error) {
      this.logger.error('Failed to update overdue statuses on startup', error);
    }
  }
}

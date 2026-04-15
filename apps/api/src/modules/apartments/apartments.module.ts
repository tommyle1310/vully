import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BuildingsController } from './buildings/buildings.controller';
import { BuildingsService } from './buildings/buildings.service';
import { BuildingsSvgService } from './buildings/buildings-svg.service';
import { ApartmentsController } from './apartments-entity/apartments.controller';
import { ApartmentsService } from './apartments-entity/apartments.service';
import { ApartmentsConfigService } from './apartments-entity/apartments-config.service';
import { ContractsController } from './contracts/contracts.controller';
import { ContractsService } from './contracts/contracts.service';
import { ContractsTenantService } from './contracts/contracts-tenant.service';
import { PaymentScheduleController } from './payment-schedules/payment-schedule.controller';
import { PaymentScheduleService } from './payment-schedules/payment-schedule.service';
import { SchedulesCoreService } from './payment-schedules/schedules-core.service';
import { PaymentRecordingService } from './payment-schedules/payment-recording.service';
import { PaymentVerificationService } from './payment-schedules/payment-verification.service';
import { PaymentGeneratorService } from './payment-generator/payment-generator.service';
import { BuildingPoliciesController } from './building-policies/building-policies.controller';
import { BuildingPoliciesService } from './building-policies/building-policies.service';
import { ParkingController } from './parking/parking.controller';
import { ParkingService } from './parking/parking.service';
import { ParkingZonesService } from './parking/parking-zones.service';
import { AccessCardsController } from './access-cards/access-cards.controller';
import { AccessCardsService } from './access-cards/access-cards.service';
import { AccessCardsHelpersService } from './access-cards/access-cards-helpers.service';
import { AccessCardsLifecycleService } from './access-cards/access-cards-lifecycle.service';
import { AccessCardRequestsController } from './access-card-requests/access-card-requests.controller';
import { AccessCardRequestsService } from './access-card-requests/access-card-requests.service';
import { BankAccountsController } from './bank-accounts/bank-accounts.controller';
import { BankAccountsService } from './bank-accounts/bank-accounts.service';

@Module({
  controllers: [
    BuildingsController,
    ApartmentsController,
    ContractsController,
    PaymentScheduleController,
    BuildingPoliciesController,
    ParkingController,
    AccessCardsController,
    AccessCardRequestsController,
    BankAccountsController,
  ],
  providers: [
    // Buildings & Apartments
    BuildingsService,
    BuildingsSvgService,
    ApartmentsService,
    ApartmentsConfigService,
    // Contracts
    ContractsService,
    ContractsTenantService,
    // Payment schedules (facade + specialized services)
    PaymentScheduleService,
    SchedulesCoreService,
    PaymentRecordingService,
    PaymentVerificationService,
    PaymentGeneratorService,
    // Building policies & parking
    BuildingPoliciesService,
    ParkingService,
    ParkingZonesService,
    // Access cards
    AccessCardsService,
    AccessCardsHelpersService,
    AccessCardsLifecycleService,
    AccessCardRequestsService,
    // Bank accounts
    BankAccountsService,
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
    AccessCardRequestsService,
    BankAccountsService,
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

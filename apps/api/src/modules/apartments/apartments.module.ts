import { Module } from '@nestjs/common';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [BuildingsController, ApartmentsController, ContractsController],
  providers: [BuildingsService, ApartmentsService, ContractsService],
  exports: [BuildingsService, ApartmentsService, ContractsService],
})
export class ApartmentsModule {}

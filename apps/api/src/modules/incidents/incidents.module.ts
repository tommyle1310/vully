import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { IncidentCommentsService } from './incident-comments.service';
import { IncidentsGateway } from './incidents.gateway';

@Module({
  controllers: [IncidentsController],
  providers: [
    IncidentsService,
    IncidentCommentsService,
    IncidentsGateway,
  ],
  exports: [IncidentsService, IncidentsGateway],
})
export class IncidentsModule {}

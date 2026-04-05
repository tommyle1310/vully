import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IncidentsController } from './incidents.controller';
import { IncidentCommentsController } from './incident-comments.controller';
import { IncidentsService } from './incidents.service';
import { IncidentCommentsService } from './incident-comments.service';
import { IncidentsGateway } from './incidents.gateway';
import { WsAuthMiddleware } from '../../common/middleware/ws-auth.middleware';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [IncidentsController, IncidentCommentsController],
  providers: [
    IncidentsService,
    IncidentCommentsService,
    IncidentsGateway,
    WsAuthMiddleware,
  ],
  exports: [IncidentsService, IncidentsGateway],
})
export class IncidentsModule {}

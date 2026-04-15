import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IncidentsController } from './incidents.controller';
import { IncidentCommentsController } from './incident-comments.controller';
import { IncidentsService } from './incidents.service';
import { IncidentCommentsService } from './incident-comments.service';
import { IncidentsGateway } from './incidents.gateway';
import { WsAuthMiddleware } from '../../common/middleware/ws-auth.middleware';
import { NotificationsModule } from '../notifications/notifications.module';

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
    forwardRef(() => NotificationsModule),
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

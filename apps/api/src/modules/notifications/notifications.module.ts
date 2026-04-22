import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DeviceTokensService } from './device-tokens.service';
import { DeviceTokensController } from './device-tokens.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationScheduledJobs } from './notification-scheduled-jobs';
import { FcmAdapter } from './adapters/fcm.adapter';
import { ZaloZnsAdapter } from './adapters/zalo-zns.adapter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IncidentsModule } from '../incidents/incidents.module';

/**
 * Notifications Module
 * 
 * Handles multi-channel notification delivery:
 * - FCM Push (mobile/web)
 * - Zalo ZNS (Official Account messages)
 * - Email (fallback)
 * 
 * Features:
 * - Device token management
 * - User notification preferences
 * - BullMQ queue for async delivery
 * - Channel priority routing
 * - Scheduled cleanup jobs
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
    forwardRef(() => IncidentsModule),
  ],
  controllers: [
    NotificationsController,
    DeviceTokensController,
    NotificationPreferencesController,
  ],
  providers: [
    PrismaService,
    NotificationsService,
    DeviceTokensService,
    NotificationPreferencesService,
    NotificationsProcessor,
    NotificationScheduledJobs,
    FcmAdapter,
    ZaloZnsAdapter,
  ],
  exports: [
    NotificationsService,
    DeviceTokensService,
    NotificationPreferencesService,
    FcmAdapter,
    ZaloZnsAdapter,
  ],
})
export class NotificationsModule {}

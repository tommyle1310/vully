import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { DeviceTokensService } from './device-tokens.service';
import { FcmAdapter } from './adapters/fcm.adapter';
import { ZaloZnsAdapter } from './adapters/zalo-zns.adapter';
import {
  NotificationJobPayload,
  NotificationChannel,
  NotificationType,
  DeliveryResult,
} from './dto/notification.dto';

/**
 * Notifications Processor
 * 
 * BullMQ processor for async notification delivery.
 * 
 * Jobs:
 * - 'send': Create notifications for target users and queue delivery
 * - 'deliver': Deliver notification via specific channel (FCM, Zalo, Email)
 */
@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly deviceTokensService: DeviceTokensService,
    private readonly fcmAdapter: FcmAdapter,
    private readonly zaloZnsAdapter: ZaloZnsAdapter,
  ) {}

  /**
   * Process 'send' job: create notifications for target users
   */
  @Process('send')
  async handleSend(job: Job<NotificationJobPayload>): Promise<void> {
    const { data } = job;
    this.logger.log('Processing notification send job', {
      jobId: job.id,
      type: data.type,
    });

    try {
      // Determine target users
      let userIds: string[] = [];

      if (data.userId) {
        userIds = [data.userId];
      } else if (data.userIds) {
        userIds = data.userIds;
      } else if (data.roles) {
        userIds = await this.getUserIdsByRoles(data.roles);
      } else if (data.buildingId) {
        userIds = await this.getUserIdsByBuilding(data.buildingId);
      }

      if (userIds.length === 0) {
        this.logger.warn('No target users for notification', {
          jobId: job.id,
          type: data.type,
        });
        return;
      }

      // Create notifications for each user
      for (const userId of userIds) {
        await this.createAndQueueDelivery(userId, data);
      }

      this.logger.log('Notification send job complete', {
        jobId: job.id,
        usersNotified: userIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to process notification send job', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process 'deliver' job: deliver notification via channel
   */
  @Process('deliver')
  async handleDeliver(
    job: Job<{
      notificationId: string;
      userId: string;
      channel: NotificationChannel;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    }>,
  ): Promise<DeliveryResult> {
    const { data } = job;
    this.logger.log('Processing notification delivery', {
      jobId: job.id,
      channel: data.channel,
      userId: data.userId,
    });

    try {
      let result: DeliveryResult;

      switch (data.channel) {
        case NotificationChannel.FCM:
          result = await this.deliverViaPush(data);
          break;
        case NotificationChannel.ZALO_ZNS:
          result = await this.deliverViaZalo(data);
          break;
        case NotificationChannel.EMAIL:
          result = await this.deliverViaEmail(data);
          break;
        default:
          result = {
            channel: data.channel,
            success: false,
            error: `Unknown channel: ${data.channel}`,
          };
      }

      // Update notification delivery status
      await this.updateDeliveryStatus(data.notificationId, data.channel, result);

      return result;
    } catch (error) {
      this.logger.error('Failed to deliver notification', {
        jobId: job.id,
        channel: data.channel,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create notification in DB and queue delivery for each enabled channel
   */
  private async createAndQueueDelivery(
    userId: string,
    payload: NotificationJobPayload,
  ): Promise<void> {
    // Get user preferences
    const prefs = await this.preferencesService.getByUserId(userId);
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { zalo_id: true, email: true },
    });

    // Check if user should receive this notification type
    const notificationType = this.getNotificationCategory(payload.type);
    const typeEnabled = {
      payment: prefs.payment_notifications,
      incident: prefs.incident_notifications,
      announcement: prefs.announcement_notifications,
      system: true, // System notifications always enabled
    }[notificationType];

    if (!typeEnabled) {
      this.logger.log('Notification type disabled for user', {
        userId,
        type: payload.type,
      });
      return;
    }

    // Create notification in database
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        resource_type: (payload.data?.resourceType as string) || null,
        resource_id: (payload.data?.resourceId as string) || null,
        is_read: false,
        delivery_status: 'pending',
      },
    });

    // Determine and queue channels
    const channels: NotificationChannel[] = [];

    // Priority 1: Zalo ZNS (highest read rate in Vietnam)
    if (prefs.zalo_enabled && user?.zalo_id) {
      channels.push(NotificationChannel.ZALO_ZNS);
    }

    // Priority 2: FCM Push
    if (prefs.push_enabled) {
      channels.push(NotificationChannel.FCM);
    }

    // Priority 3: Email
    if (prefs.email_enabled && user?.email) {
      channels.push(NotificationChannel.EMAIL);
    }

    // Queue delivery for each channel
    for (const channel of channels) {
      await this.notificationsQueue.add('deliver', {
        notificationId: notification.id,
        userId,
        channel,
        title: payload.title,
        message: payload.message,
        data: payload.data,
      });
    }
  }

  /**
   * Deliver notification via FCM Push
   */
  private async deliverViaPush(data: {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<DeliveryResult> {
    const tokens = await this.deviceTokensService.getByUserId(data.userId);

    if (tokens.length === 0) {
      return {
        channel: NotificationChannel.FCM,
        success: false,
        error: 'No device tokens registered',
      };
    }

    // Check if FCM is configured
    if (!this.fcmAdapter.isReady()) {
      this.logger.warn('FCM adapter not configured, skipping push delivery', {
        userId: data.userId,
      });
      return {
        channel: NotificationChannel.FCM,
        success: false,
        error: 'FCM not configured',
      };
    }

    // Send via FCM adapter - convert data to string values
    const tokenStrings = tokens.map((t: { token: string }) => t.token);
    const fcmData: Record<string, string> | undefined = data.data
      ? Object.fromEntries(
          Object.entries(data.data)
            .filter(([_, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string])
        )
      : undefined;

    const results = await this.fcmAdapter.sendToDevices(tokenStrings, {
      title: data.title,
      body: data.message,
      data: fcmData,
    });

    // Update last_used for all tokens
    for (const token of tokens) {
      await this.deviceTokensService.updateLastUsed(token.token);
    }

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const firstSuccess = results.find(r => r.success);

    return {
      channel: NotificationChannel.FCM,
      success: successCount > 0,
      messageId: firstSuccess?.messageId || `fcm-${Date.now()}`,
      error: failureCount > 0 ? `${failureCount} failures` : undefined,
    };
  }

  /**
   * Deliver notification via Zalo ZNS
   */
  private async deliverViaZalo(data: {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<DeliveryResult> {
    const user = await this.prisma.users.findUnique({
      where: { id: data.userId },
      select: { zalo_id: true, zalo_oa_follower: true, first_name: true, last_name: true },
    });

    if (!user?.zalo_id) {
      return {
        channel: NotificationChannel.ZALO_ZNS,
        success: false,
        error: 'User has no Zalo ID',
      };
    }

    if (!user.zalo_oa_follower) {
      return {
        channel: NotificationChannel.ZALO_ZNS,
        success: false,
        error: 'User does not follow official account',
      };
    }

    // Check if Zalo ZNS is configured
    if (!this.zaloZnsAdapter.isReady()) {
      this.logger.warn('Zalo ZNS adapter not configured, skipping delivery', {
        userId: data.userId,
      });
      return {
        channel: NotificationChannel.ZALO_ZNS,
        success: false,
        error: 'Zalo ZNS not configured',
      };
    }

    // Determine template based on notification data
    const templateData: Record<string, string> = {
      customer_name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : 'Cư dân',
    };

    // Add additional data based on notification type
    if (data.data) {
      Object.entries(data.data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          templateData[key] = value;
        }
      });
    }

    // Send via Zalo ZNS adapter
    const result = await this.zaloZnsAdapter.send({
      zaloId: user.zalo_id,
      template: {
        templateId: (data.data?.templateId as string) || 'general_notification',
        templateData,
      },
    });

    return {
      channel: NotificationChannel.ZALO_ZNS,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Deliver notification via Email
   */
  private async deliverViaEmail(data: {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<DeliveryResult> {
    const user = await this.prisma.users.findUnique({
      where: { id: data.userId },
      select: { email: true },
    });

    if (!user?.email) {
      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        error: 'User has no email',
      };
    }

    // TODO: Implement actual email sending (SendGrid, etc.)
    // For now, simulate successful delivery
    this.logger.log('Email would be sent to', {
      userId: data.userId,
      email: user.email,
      title: data.title,
    });

    return {
      channel: NotificationChannel.EMAIL,
      success: true,
      messageId: `email-${Date.now()}`,
    };
  }

  /**
   * Update notification delivery status
   */
  private async updateDeliveryStatus(
    notificationId: string,
    channel: NotificationChannel,
    result: DeliveryResult,
  ): Promise<void> {
    const status = result.success ? 'delivered' : 'failed';

    await this.prisma.notifications.update({
      where: { id: notificationId },
      data: {
        delivery_status: status,
        delivered_at: result.success ? new Date() : null,
        delivery_error: result.error || null,
      },
    });
  }

  /**
   * Get notification category from type
   */
  private getNotificationCategory(
    type: NotificationType,
  ): 'payment' | 'incident' | 'announcement' | 'system' {
    switch (type) {
      case NotificationType.PAYMENT_CONFIRMED:
      case NotificationType.PAYMENT_REMINDER:
        return 'payment';
      case NotificationType.INCIDENT_ASSIGNED:
      case NotificationType.INCIDENT_UPDATED:
      case NotificationType.INCIDENT_RESOLVED:
        return 'incident';
      case NotificationType.BUILDING_ANNOUNCEMENT:
        return 'announcement';
      default:
        return 'system';
    }
  }

  /**
   * Get user IDs by roles
   */
  private async getUserIdsByRoles(roles: string[]): Promise<string[]> {
    const roleAssignments = await this.prisma.user_role_assignments.findMany({
      where: {
        role: { in: roles as any },
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    return roleAssignments.map((r: { user_id: string }) => r.user_id);
  }

  /**
   * Get user IDs by building
   */
  private async getUserIdsByBuilding(buildingId: string): Promise<string[]> {
    // Get residents via contracts + apartments
    const contracts = await this.prisma.contracts.findMany({
      where: {
        status: 'active',
        apartments: {
          building_id: buildingId,
        },
      },
      select: { tenant_id: true },
    });

    const residentIds = contracts.map((c: { tenant_id: string | null }) => c.tenant_id).filter(Boolean) as string[];

    // Get staff assigned to building
    const assignments = await this.prisma.user_building_assignments.findMany({
      where: { building_id: buildingId },
      select: { user_id: true },
    });

    const staffIds = assignments.map((a: { user_id: string }) => a.user_id);

    return [...new Set([...residentIds, ...staffIds])];
  }
}

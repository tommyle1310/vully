import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from './dto/notification.dto';

/**
 * Notification Preferences Service
 * 
 * Manages user preferences for notification channels and types.
 * 
 * Channels:
 * - push_enabled: FCM push notifications
 * - email_enabled: Email notifications
 * - zalo_enabled: Zalo ZNS messages
 * 
 * Types:
 * - payment_notifications: Payment confirmations, reminders
 * - incident_notifications: Incident updates
 * - announcement_notifications: Building announcements
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user notification preferences
   * Creates default preferences if none exist
   */
  async getByUserId(userId: string): Promise<NotificationPreferencesResponseDto> {
    let preferences = await this.prisma.user_notification_preferences.findUnique({
      where: { user_id: userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.user_notification_preferences.create({
        data: {
          user_id: userId,
          push_enabled: true,
          email_enabled: true,
          zalo_enabled: true,
          payment_notifications: true,
          incident_notifications: true,
          announcement_notifications: true,
        },
      });

      this.logger.log('Created default notification preferences', { userId });
    }

    return {
      id: preferences.id,
      user_id: preferences.user_id,
      push_enabled: preferences.push_enabled,
      email_enabled: preferences.email_enabled,
      zalo_enabled: preferences.zalo_enabled,
      payment_notifications: preferences.payment_notifications,
      incident_notifications: preferences.incident_notifications,
      announcement_notifications: preferences.announcement_notifications,
    };
  }

  /**
   * Update user notification preferences
   */
  async update(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    // Ensure preferences exist
    await this.getByUserId(userId);

    const updated = await this.prisma.user_notification_preferences.update({
      where: { user_id: userId },
      data: {
        ...(dto.push_enabled !== undefined && { push_enabled: dto.push_enabled }),
        ...(dto.email_enabled !== undefined && { email_enabled: dto.email_enabled }),
        ...(dto.zalo_enabled !== undefined && { zalo_enabled: dto.zalo_enabled }),
        ...(dto.payment_notifications !== undefined && { payment_notifications: dto.payment_notifications }),
        ...(dto.incident_notifications !== undefined && { incident_notifications: dto.incident_notifications }),
        ...(dto.announcement_notifications !== undefined && { announcement_notifications: dto.announcement_notifications }),
      },
    });

    this.logger.log('Updated notification preferences', {
      userId,
      changes: dto,
    });

    return {
      id: updated.id,
      user_id: updated.user_id,
      push_enabled: updated.push_enabled,
      email_enabled: updated.email_enabled,
      zalo_enabled: updated.zalo_enabled,
      payment_notifications: updated.payment_notifications,
      incident_notifications: updated.incident_notifications,
      announcement_notifications: updated.announcement_notifications,
    };
  }

  /**
   * Get preferences for multiple users (for batch notifications)
   */
  async getByUserIds(
    userIds: string[],
  ): Promise<Map<string, NotificationPreferencesResponseDto>> {
    const preferences = await this.prisma.user_notification_preferences.findMany({
      where: { user_id: { in: userIds } },
    });

    const prefsMap = new Map<string, NotificationPreferencesResponseDto>();

    for (const pref of preferences) {
      prefsMap.set(pref.user_id, {
        id: pref.id,
        user_id: pref.user_id,
        push_enabled: pref.push_enabled,
        email_enabled: pref.email_enabled,
        zalo_enabled: pref.zalo_enabled,
        payment_notifications: pref.payment_notifications,
        incident_notifications: pref.incident_notifications,
        announcement_notifications: pref.announcement_notifications,
      });
    }

    return prefsMap;
  }

  /**
   * Check if user should receive notification type via channel
   */
  async shouldNotify(
    userId: string,
    type: 'payment' | 'incident' | 'announcement',
    channel: 'push' | 'email' | 'zalo',
  ): Promise<boolean> {
    const prefs = await this.getByUserId(userId);

    // Check channel preference
    const channelEnabled = {
      push: prefs.push_enabled,
      email: prefs.email_enabled,
      zalo: prefs.zalo_enabled,
    }[channel];

    if (!channelEnabled) return false;

    // Check type preference
    const typeEnabled = {
      payment: prefs.payment_notifications,
      incident: prefs.incident_notifications,
      announcement: prefs.announcement_notifications,
    }[type];

    return typeEnabled;
  }
}

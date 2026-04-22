import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { DeviceTokensService } from './device-tokens.service';
import { IncidentsGateway } from '../incidents/incidents.gateway';
import { WS_EVENTS } from '@vully/shared-types';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationJobPayload,
  NotificationType,
  NotificationChannel,
} from './dto/notification.dto';

/**
 * Notifications Service
 * 
 * Core service for creating and managing notifications.
 * 
 * Features:
 * - Multi-channel delivery (FCM, Zalo ZNS, Email)
 * - User preferences respected
 * - Channel priority routing
 * - Supports single user, multiple users, role-based, and building broadcasts
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly deviceTokensService: DeviceTokensService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    @Inject(forwardRef(() => IncidentsGateway))
    private readonly gateway: IncidentsGateway,
  ) {}

  /**
   * Create notification — writes to DB immediately (for in-app bell),
   * then queues delivery jobs for external channels (push/email/zalo).
   */
  async create(dto: CreateNotificationDto): Promise<{ queued: boolean; jobId?: string }> {
    this.logger.log('Creating notification', {
      type: dto.type,
      userId: dto.userId,
      userIds: dto.userIds?.length,
      roles: dto.roles,
      buildingId: dto.buildingId,
    });

    // 1. Resolve target users
    let userIds: string[] = [];
    if (dto.userId) {
      userIds = [dto.userId];
    } else if (dto.userIds && dto.userIds.length > 0) {
      userIds = dto.userIds;
    } else if (dto.roles && dto.roles.length > 0) {
      userIds = await this.getUserIdsByRoles(dto.roles);
    } else if (dto.buildingId) {
      userIds = await this.getUserIdsByBuilding(dto.buildingId);
    }

    if (userIds.length === 0) {
      this.logger.warn('No target users for notification', {
        type: dto.type,
        roles: dto.roles,
        buildingId: dto.buildingId,
      });
      return { queued: false };
    }

    // 2. Write notifications to DB immediately (in-app bell works instantly)
    const notificationIds: string[] = [];
    for (const userId of userIds) {
      try {
        const notification = await this.prisma.notifications.create({
          data: {
            user_id: userId,
            type: dto.type,
            title: dto.title,
            message: dto.message,
            resource_type: dto.resourceType || null,
            resource_id: dto.resourceId || null,
            is_read: false,
            delivery_status: 'pending',
          },
        });
        notificationIds.push(notification.id);
      } catch (error) {
        this.logger.error('Failed to create notification record', {
          userId,
          type: dto.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log('Notifications created in DB', {
      count: notificationIds.length,
      type: dto.type,
    });

    // 2b. Emit WebSocket event to each user for instant bell update
    for (const userId of userIds) {
      this.gateway.emitToUser(userId, WS_EVENTS.NOTIFICATION, {
        type: dto.type,
        title: dto.title,
        message: dto.message,
      });
    }

    // 3. Queue delivery for external channels (push/email/zalo) — non-blocking
    if (notificationIds.length > 0) {
      const job = await this.notificationQueue.add('deliver-batch', {
        notificationIds,
        userIds,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: {
          ...dto.data,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
        },
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      return { queued: true, jobId: job.id.toString() };
    }

    return { queued: false };
  }

  /**
   * Send notification directly (without queue) for immediate delivery
   */
  async sendDirect(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    // Get user preferences
    const prefs = await this.preferencesService.getByUserId(userId);
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { zalo_id: true, email: true },
    });

    const channels: NotificationChannel[] = [];

    // Determine channels based on preferences (priority order)
    if (prefs.zalo_enabled && user?.zalo_id) {
      channels.push(NotificationChannel.ZALO_ZNS);
    }
    if (prefs.push_enabled) {
      channels.push(NotificationChannel.FCM);
    }
    if (prefs.email_enabled && user?.email) {
      channels.push(NotificationChannel.EMAIL);
    }

    // Store notification in database
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        resource_type: (data?.resourceType as string) || null,
        resource_id: (data?.resourceId as string) || null,
        is_read: false,
        delivery_status: 'pending',
      },
    });

    // Queue delivery for each channel
    for (const channel of channels) {
      await this.notificationQueue.add('deliver', {
        notificationId: notification.id,
        userId,
        channel,
        title,
        message,
        data,
      });
    }
  }

  /**
   * Get user's notifications
   */
  async getByUserId(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    },
  ): Promise<{ items: NotificationResponseDto[]; total: number }> {
    const { page = 1, limit = 20, unreadOnly = false } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      ...(unreadOnly && { is_read: false }),
    };

    const [items, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      items: items.map((n: { id: string; user_id: string; type: string; title: string; message: string; is_read: boolean; resource_type: string | null; resource_id: string | null; created_at: Date }) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        is_read: n.is_read,
        resource_type: n.resource_type ?? undefined,
        resource_id: n.resource_id ?? undefined,
        created_at: n.created_at,
      })),
      total,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notifications.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.prisma.notifications.updateMany({
      where: {
        id: { in: notificationIds },
        user_id: userId,
      },
      data: { is_read: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });
  }

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notifications.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notifications.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Get users by role(s) for role-based notifications
   */
  async getUserIdsByRoles(roles: string[]): Promise<string[]> {
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
   * Get users in a building for building broadcasts
   */
  async getUserIdsByBuilding(buildingId: string): Promise<string[]> {
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

    // Combine and deduplicate
    return [...new Set([...residentIds, ...staffIds])];
  }

  // ============================================================
  // NOTIFICATION TRIGGERS (convenience methods for common events)
  // ============================================================

  /**
   * Notify when incident status changes
   * @param incidentId Incident ID
   * @param reporterId User who reported the incident
   * @param newStatus New status
   * @param note Optional note from technician
   */
  async notifyIncidentStatusChange(
    incidentId: string,
    reporterId: string,
    newStatus: string,
    note?: string,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      open: 'Đã tiếp nhận',
      in_progress: 'Đang xử lý',
      resolved: 'Đã giải quyết',
      closed: 'Đã đóng',
    };

    const statusLabel = statusLabels[newStatus] || newStatus;

    await this.create({
      type: NotificationType.INCIDENT_STATUS,
      userId: reporterId,
      title: `Cập nhật sự cố #${incidentId.slice(-6).toUpperCase()}`,
      message: note
        ? `Trạng thái: ${statusLabel}. ${note}`
        : `Trạng thái mới: ${statusLabel}`,
      resourceType: 'incident',
      resourceId: incidentId,
      data: {
        templateId: 'incident_status',
        status: newStatus,
        note: note || '',
      },
    });
  }

  /**
   * Send building-wide announcement
   * @param buildingId Building ID
   * @param title Announcement title
   * @param content Announcement content
   * @param announcementUrl Optional link to full announcement
   */
  async sendBuildingAnnouncement(
    buildingId: string,
    title: string,
    content: string,
    announcementUrl?: string,
  ): Promise<void> {
    const building = await this.prisma.buildings.findUnique({
      where: { id: buildingId },
      select: { name: true },
    });

    await this.create({
      type: NotificationType.ANNOUNCEMENT,
      buildingId,
      title: `📢 ${title}`,
      message: content.length > 200 ? `${content.slice(0, 200)}...` : content,
      data: {
        templateId: 'building_announcement',
        building_name: building?.name || 'Tòa nhà',
        announcement_content: content,
        announcement_url: announcementUrl || '',
      },
    });
  }

  /**
   * Send payment reminder to user
   * @param userId User ID
   * @param apartmentName Apartment name/number
   * @param amount Amount due
   * @param dueDate Due date
   * @param invoiceId Invoice ID
   */
  async sendPaymentReminder(
    userId: string,
    apartmentName: string,
    amount: number,
    dueDate: Date,
    invoiceId: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
    const formattedDate = dueDate.toLocaleDateString('vi-VN');

    await this.create({
      type: NotificationType.PAYMENT_REMINDER,
      userId,
      title: 'Nhắc nhở thanh toán',
      message: `Hóa đơn ${apartmentName}: ${formattedAmount}đ, hạn ${formattedDate}`,
      resourceType: 'invoice',
      resourceId: invoiceId,
      data: {
        templateId: 'payment_reminder',
        apartment_name: apartmentName,
        amount: formattedAmount,
        due_date: formattedDate,
      },
    });
  }

  /**
   * Notify payment confirmation
   * @param userId User ID
   * @param apartmentName Apartment name
   * @param amount Amount paid
   * @param billingPeriod Billing period
   * @param invoiceId Invoice ID
   */
  async notifyPaymentConfirmed(
    userId: string,
    apartmentName: string,
    amount: number,
    billingPeriod: string,
    invoiceId: string,
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);

    await this.create({
      type: NotificationType.PAYMENT_CONFIRMED,
      userId,
      title: 'Thanh toán thành công ✓',
      message: `${apartmentName}: ${formattedAmount}đ - ${billingPeriod}`,
      resourceType: 'invoice',
      resourceId: invoiceId,
      data: {
        templateId: 'payment_confirmed',
        apartment_name: apartmentName,
        amount: formattedAmount,
        billing_period: billingPeriod,
      },
    });
  }
}

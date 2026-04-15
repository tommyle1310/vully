import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DevicePlatform,
  RegisterDeviceDto,
  DeviceTokenResponseDto,
} from './dto/notification.dto';

/**
 * Device Tokens Service
 * 
 * Manages FCM registration tokens for push notifications.
 * 
 * Token Lifecycle:
 * - Register on app startup / login
 * - Update `last_used` on successful delivery
 * - Delete tokens that fail with invalid registration
 * - Daily cleanup removes tokens unused >90 days
 */
@Injectable()
export class DeviceTokensService {
  private readonly logger = new Logger(DeviceTokensService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a device token for push notifications
   */
  async register(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceTokenResponseDto> {
    this.logger.log('Registering device token', {
      userId,
      platform: dto.platform,
    });

    // Upsert: update if token exists, create if new
    const deviceToken = await this.prisma.device_tokens.upsert({
      where: { token: dto.token },
      create: {
        user_id: userId,
        token: dto.token,
        platform: dto.platform,
      },
      update: {
        user_id: userId,
        platform: dto.platform,
        last_used: new Date(),
      },
    });

    return {
      id: deviceToken.id,
      token: deviceToken.token,
      platform: deviceToken.platform as DevicePlatform,
      created_at: deviceToken.created_at,
      last_used: deviceToken.last_used,
    };
  }

  /**
   * Unregister a device token
   */
  async unregister(userId: string, token: string): Promise<void> {
    this.logger.log('Unregistering device token', { userId });

    const deleted = await this.prisma.device_tokens.deleteMany({
      where: {
        user_id: userId,
        token,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Device token not found');
    }
  }

  /**
   * Get all device tokens for a user
   */
  async getByUserId(userId: string): Promise<DeviceTokenResponseDto[]> {
    const tokens = await this.prisma.device_tokens.findMany({
      where: { user_id: userId },
      orderBy: { last_used: 'desc' },
    });

    return tokens.map((t: { id: string; token: string; platform: string; created_at: Date; last_used: Date }) => ({
      id: t.id,
      token: t.token,
      platform: t.platform as DevicePlatform,
      created_at: t.created_at,
      last_used: t.last_used,
    }));
  }

  /**
   * Get tokens for multiple users (for batch notifications)
   */
  async getByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const tokens = await this.prisma.device_tokens.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, token: true },
    });

    const tokenMap = new Map<string, string[]>();

    for (const { user_id, token } of tokens) {
      const existing = tokenMap.get(user_id) || [];
      tokenMap.set(user_id, [...existing, token]);
    }

    return tokenMap;
  }

  /**
   * Update last_used timestamp on successful delivery
   */
  async updateLastUsed(token: string): Promise<void> {
    await this.prisma.device_tokens.update({
      where: { token },
      data: { last_used: new Date() },
    });
  }

  /**
   * Delete invalid token (e.g., when FCM returns registration-token-not-registered)
   */
  async deleteInvalidToken(token: string): Promise<void> {
    this.logger.warn('Deleting invalid device token', { token: token.slice(0, 20) });

    await this.prisma.device_tokens.delete({
      where: { token },
    }).catch(() => {
      // Token may already be deleted
    });
  }

  /**
   * Cleanup stale tokens (unused > 90 days)
   * Called by scheduled job
   */
  async cleanupStaleTokens(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await this.prisma.device_tokens.deleteMany({
      where: {
        last_used: { lt: cutoffDate },
      },
    });

    this.logger.log('Cleaned up stale device tokens', {
      deleted: result.count,
      cutoffDate,
    });

    return result.count;
  }
}

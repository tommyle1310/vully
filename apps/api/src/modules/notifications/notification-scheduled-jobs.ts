import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeviceTokensService } from './device-tokens.service';
import { ZaloZnsAdapter } from './adapters/zalo-zns.adapter';

/**
 * Notification Scheduled Jobs
 * 
 * Handles scheduled tasks for the notification system:
 * 1. Stale device token cleanup (daily at 3 AM)
 * 2. Zalo access token refresh (weekly)
 */
@Injectable()
export class NotificationScheduledJobs {
  private readonly logger = new Logger(NotificationScheduledJobs.name);

  constructor(
    private readonly deviceTokensService: DeviceTokensService,
    private readonly zaloAdapter: ZaloZnsAdapter,
  ) {}

  /**
   * Clean up stale device tokens
   * Runs daily at 3:00 AM
   * 
   * Removes tokens that haven't been used in 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupStaleTokens(): Promise<void> {
    this.logger.log('Starting stale device token cleanup');

    try {
      const deletedCount = await this.deviceTokensService.cleanupStaleTokens();

      this.logger.log('Stale token cleanup completed', {
        deletedCount,
      });
    } catch (error) {
      this.logger.error('Stale token cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Refresh Zalo access token
   * Runs weekly on Sunday at 2:00 AM
   * 
   * Zalo tokens expire after ~90 days, refreshing weekly ensures continuity
   */
  @Cron('0 2 * * 0') // Every Sunday at 2:00 AM
  async refreshZaloToken(): Promise<void> {
    this.logger.log('Starting Zalo token refresh');

    try {
      const success = await this.zaloAdapter.refreshAccessToken();

      if (success) {
        this.logger.log('Zalo token refresh completed');
      } else {
        this.logger.warn('Zalo token refresh failed or skipped');
      }
    } catch (error) {
      this.logger.error('Zalo token refresh error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

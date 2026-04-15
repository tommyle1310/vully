import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
/**
 * Payment Reminder Scheduled Jobs
 * 
 * Sends automated reminders for:
 * - Invoices due in 3 days
 * - Invoices due tomorrow
 * - Overdue invoices (daily reminder)
 */
@Injectable()
export class PaymentReminderJobs {
  private readonly logger = new Logger(PaymentReminderJobs.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Send reminders for invoices due in 3 days
   * Runs daily at 9 AM
   */
  @Cron('0 9 * * *', { name: 'payment-reminder-3-days' })
  async sendThreeDayReminders(): Promise<void> {
    this.logger.log('Starting 3-day payment reminder job');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const threeDaysFromNowStart = new Date();
    threeDaysFromNowStart.setDate(threeDaysFromNowStart.getDate() + 3);
    threeDaysFromNowStart.setHours(0, 0, 0, 0);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] as any },
        due_date: {
          gte: threeDaysFromNowStart,
          lte: threeDaysFromNow,
        },
      },
      include: {
        apartments: {
          select: { unit_number: true, building_id: true },
        },
        contracts: {
          select: { tenant_id: true },
        },
      },
    });

    this.logger.log(`Found ${invoices.length} invoices due in 3 days`);

    for (const invoice of invoices) {
      const tenantId = invoice.contracts?.tenant_id;
      if (!tenantId) continue;

      try {
        await this.notificationsService.sendPaymentReminder(
          tenantId,
          `Căn ${invoice.apartments?.unit_number || 'N/A'}`,
          Number(invoice.total_amount) - Number(invoice.paid_amount || 0),
          invoice.due_date,
          invoice.id,
        );
      } catch (error) {
        this.logger.error(`Failed to send reminder for invoice ${invoice.id}`, error);
      }
    }

    this.logger.log('3-day payment reminder job completed');
  }

  /**
   * Send urgent reminders for invoices due tomorrow
   * Runs daily at 9 AM
   */
  @Cron('0 9 * * *', { name: 'payment-reminder-1-day' })
  async sendOneDayReminders(): Promise<void> {
    this.logger.log('Starting 1-day payment reminder job');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] as any },
        due_date: {
          gte: tomorrowStart,
          lte: tomorrow,
        },
      },
      include: {
        apartments: {
          select: { unit_number: true },
        },
        contracts: {
          select: { tenant_id: true },
        },
      },
    });

    this.logger.log(`Found ${invoices.length} invoices due tomorrow`);

    for (const invoice of invoices) {
      const tenantId = invoice.contracts?.tenant_id;
      if (!tenantId) continue;

      try {
        await this.notificationsService.sendPaymentReminder(
          tenantId,
          `Căn ${invoice.apartments?.unit_number || 'N/A'}`,
          Number(invoice.total_amount) - Number(invoice.paid_amount || 0),
          invoice.due_date,
          invoice.id,
        );
      } catch (error) {
        this.logger.error(`Failed to send reminder for invoice ${invoice.id}`, error);
      }
    }

    this.logger.log('1-day payment reminder job completed');
  }

  /**
   * Send overdue payment reminders
   * Runs daily at 10 AM (after due date reminders)
   */
  @Cron('0 10 * * *', { name: 'payment-reminder-overdue' })
  async sendOverdueReminders(): Promise<void> {
    this.logger.log('Starting overdue payment reminder job');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only remind for invoices overdue within last 30 days (avoid spamming old invoices)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] as any },
        due_date: {
          lt: today,
          gte: thirtyDaysAgo,
        },
      },
      include: {
        apartments: {
          select: { unit_number: true },
        },
        contracts: {
          select: { tenant_id: true },
        },
      },
    });

    this.logger.log(`Found ${invoices.length} overdue invoices`);

    for (const invoice of invoices) {
      const tenantId = invoice.contracts?.tenant_id;
      if (!tenantId) continue;

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (today.getTime() - invoice.due_date.getTime()) / (1000 * 60 * 60 * 24),
      );

      try {
        await this.notificationsService.create({
          type: NotificationType.PAYMENT_REMINDER,
          userId: tenantId,
          title: '⚠️ Hóa đơn quá hạn',
          message: `Căn ${invoice.apartments?.unit_number || 'N/A'}: Quá hạn ${daysOverdue} ngày`,
          resourceType: 'invoice',
          resourceId: invoice.id,
          data: {
            templateId: 'payment_overdue',
            days_overdue: daysOverdue.toString(),
            amount: new Intl.NumberFormat('vi-VN').format(
              Number(invoice.total_amount) - Number(invoice.paid_amount || 0),
            ),
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send overdue reminder for invoice ${invoice.id}`, error);
      }
    }

    this.logger.log('Overdue payment reminder job completed');
  }
}

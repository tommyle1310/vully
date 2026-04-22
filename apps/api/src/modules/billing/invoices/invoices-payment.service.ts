import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ReportInvoicePaymentDto,
  VerifyInvoicePaymentDto,
  InvoiceResponseDto,
} from '../dto/invoice.dto';
import { toInvoiceResponseDto } from './invoices.mapper';
import { INVOICE_INCLUDE } from './invoices-core.service';
import { InvoicesScheduleSyncHelper } from './invoices-schedule-sync.helper';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/dto/notification.dto';

/**
 * Invoice payment reporting and verification workflow.
 * Handles resident payment reports and admin verification.
 */
@Injectable()
export class InvoicesPaymentService {
  private readonly logger = new Logger(InvoicesPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleSyncHelper: InvoicesScheduleSyncHelper,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Resident reports a payment transfer for an invoice.
   * Stores reported payment info in price_snapshot for admin verification.
   */
  async reportPayment(
    id: string,
    dto: ReportInvoicePaymentDto,
    reporterId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.contracts && invoice.contracts.tenant_id !== reporterId) {
      throw new ForbiddenException('You can only report payments for your own invoices');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cannot report payment for cancelled invoice');
    }

    const existingSnapshot = invoice.price_snapshot as Record<string, unknown> | null;
    const reportedPayment = {
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      transactionDate: dto.transactionDate || new Date().toISOString(),
      transactionRef: dto.transactionRef,
      bankName: dto.bankName,
      notes: dto.notes,
      reportedAt: new Date().toISOString(),
      reportedBy: reporterId,
    };

    const updated = await this.prisma.invoices.update({
      where: { id },
      data: {
        price_snapshot: {
          ...(existingSnapshot ?? {}),
          reportedPayment,
        },
        updated_at: new Date(),
      },
      include: INVOICE_INCLUDE,
    });

    this.logger.log({
      event: 'payment_reported',
      invoiceId: id,
      reporterId,
      amount: dto.amount,
      transactionRef: dto.transactionRef,
    });

    // Notify admins about new payment report
    this.notificationsService.create({
      type: NotificationType.PAYMENT_REMINDER,
      roles: ['admin'],
      title: 'Thanh toán mới cần xác minh',
      message: `Cư dân đã báo thanh toán ${new Intl.NumberFormat('vi-VN').format(dto.amount)}đ cho hóa đơn #${id.slice(-6).toUpperCase()}`,
      resourceType: 'invoice',
      resourceId: id,
    }).catch((err) => {
      this.logger.warn('Failed to send payment report notification', { invoiceId: id, error: err.message });
    });

    return toInvoiceResponseDto(updated);
  }

  /**
   * Get invoices with reported (pending verification) payments.
   * Admin uses this to see which invoices need payment verification.
   */
  async getReportedPayments(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.invoices.findMany({
      where: {
        price_snapshot: {
          path: ['reportedPayment'],
          not: Prisma.AnyNull,
        },
        status: { in: ['pending', 'overdue'] },
      },
      orderBy: [
        { price_snapshot: { sort: 'asc' } },
        { created_at: 'desc' },
      ],
      include: INVOICE_INCLUDE,
    });

    return invoices.map((i) => toInvoiceResponseDto(i));
  }

  /**
   * Get invoices with verified or rejected payments (history).
   * Shows confirmed/rejected payment decisions within the last N days.
   */
  async getPaymentHistory(days: number = 30): Promise<InvoiceResponseDto[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        price_snapshot: {
          path: ['reportedPayment', 'verifiedAt'],
          not: Prisma.AnyNull,
        },
        updated_at: { gte: since },
      },
      orderBy: { updated_at: 'desc' },
      include: INVOICE_INCLUDE,
    });

    return invoices.map((i) => toInvoiceResponseDto(i));
  }

  /**
   * Verify a reported payment (admin).
   * If confirmed: mark invoice as paid, clear reportedPayment, sync to payment schedule.
   * If rejected: clear reportedPayment, leave invoice status unchanged.
   */
  async verifyPayment(
    id: string,
    dto: VerifyInvoicePaymentDto,
    verifierId: string,
  ): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const existingSnapshot = invoice.price_snapshot as Record<string, unknown> | null;
    const reportedPayment = existingSnapshot?.reportedPayment as Record<string, unknown> | null;

    if (!reportedPayment) {
      throw new BadRequestException('No reported payment found for this invoice');
    }

    const finalAmount = dto.actualAmount ?? Number(reportedPayment.amount);

    let updated: typeof invoice;

    if (dto.status === 'confirmed') {
      // Mark invoice as paid
      updated = await this.prisma.invoices.update({
        where: { id },
        data: {
          status: 'paid',
          paid_at: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          paid_amount: finalAmount,
          price_snapshot: {
            ...(existingSnapshot ?? {}),
            reportedPayment: {
              ...reportedPayment,
              verifiedAt: new Date().toISOString(),
              verifiedBy: verifierId,
              status: 'confirmed',
              actualAmount: finalAmount,
              adminNotes: dto.notes,
            },
          },
          updated_at: new Date(),
        },
        include: INVOICE_INCLUDE,
      });

      // Sync payment to payment schedule if contract exists
      if (invoice.contract_id) {
        await this.scheduleSyncHelper.syncPaymentToSchedule(
          invoice.contract_id,
          invoice.billing_period,
          invoice.invoice_line_items,
          finalAmount,
          Number(invoice.subtotal),
          Number(invoice.total_amount),
          reportedPayment,
          verifierId,
        );
      }

      this.logger.log({
        event: 'payment_verified_confirmed',
        invoiceId: id,
        verifierId,
        finalAmount,
      });

      // Notify resident about confirmed payment
      const tenantId = invoice.contracts?.tenant_id;
      const aptName = invoice.apartments?.unit_number || invoice.contracts?.apartments?.unit_number || 'N/A';
      if (tenantId) {
        this.notificationsService.notifyPaymentConfirmed(
          tenantId,
          aptName,
          finalAmount,
          invoice.billing_period,
          id,
        ).catch((err) => {
          this.logger.warn('Failed to send payment confirmed notification', { invoiceId: id, error: err.message });
        });
      }
    } else {
      // Rejected — clear reportedPayment but keep invoice pending
      updated = await this.prisma.invoices.update({
        where: { id },
        data: {
          price_snapshot: {
            ...(existingSnapshot ?? {}),
            reportedPayment: {
              ...reportedPayment,
              verifiedAt: new Date().toISOString(),
              verifiedBy: verifierId,
              status: 'rejected',
              adminNotes: dto.notes,
            },
          },
          updated_at: new Date(),
        },
        include: INVOICE_INCLUDE,
      });

      this.logger.log({
        event: 'payment_verified_rejected',
        invoiceId: id,
        verifierId,
        reason: dto.notes,
      });

      // Notify resident about rejected payment
      const rejectedTenantId = invoice.contracts?.tenant_id;
      const rejectedAptName = invoice.apartments?.unit_number || invoice.contracts?.apartments?.unit_number || 'N/A';
      if (rejectedTenantId) {
        this.notificationsService.create({
          type: NotificationType.PAYMENT_CONFIRMED,
          userId: rejectedTenantId,
          title: 'Thanh toán bị từ chối',
          message: `Thanh toán cho hóa đơn ${rejectedAptName} #${id.slice(-6).toUpperCase()} đã bị từ chối${dto.notes ? ': ' + dto.notes : ''}`,
          resourceType: 'invoice',
          resourceId: id,
        }).catch((err) => {
          this.logger.warn('Failed to send payment rejected notification', { invoiceId: id, error: err.message });
        });
      }
    }

    return toInvoiceResponseDto(updated);
  }
}

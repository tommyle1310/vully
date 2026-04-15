import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface UnmatchedPaymentListQuery {
  status?: 'pending' | 'matched' | 'rejected';
  page?: number;
  limit?: number;
}

export interface UnmatchedPaymentListResult {
  data: {
    id: string;
    gateway: string;
    transactionId: string;
    amount: number;
    senderName: string | null;
    description: string | null;
    receivedAt: Date;
    status: string;
    matchedInvoiceId: string | null;
    matchedBy: string | null;
    matchedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
  }[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Unmatched Payments Service
 * 
 * Handles manual reconciliation of payments that couldn't be auto-matched.
 * Accountants can view, match to invoices, or reject unmatched payments.
 */
@Injectable()
export class UnmatchedPaymentsService {
  private readonly logger = new Logger(UnmatchedPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  /**
   * List unmatched payments with pagination and filtering
   */
  async list(query: UnmatchedPaymentListQuery): Promise<UnmatchedPaymentListResult> {
    const { status = 'pending', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.unmatched_payments.findMany({
        where: { status },
        orderBy: { received_at: 'desc' },
        skip,
        take: limit,
        include: {
          matched_invoice: {
            select: { id: true, invoice_number: true },
          },
          matcher: {
            select: { id: true, first_name: true, last_name: true },
          },
        },
      }),
      this.prisma.unmatched_payments.count({
        where: { status },
      }),
    ]);

    return {
      data: data.map((item: { id: string; gateway: string; transaction_id: string; amount: { toNumber(): number }; sender_name: string | null; description: string | null; received_at: Date; status: string; matched_invoice_id: string | null; matched_by: string | null; matched_at: Date | null; rejection_reason: string | null; created_at: Date }) => ({
        id: item.id,
        gateway: item.gateway,
        transactionId: item.transaction_id,
        amount: item.amount.toNumber(),
        senderName: item.sender_name,
        description: item.description,
        receivedAt: item.received_at,
        status: item.status,
        matchedInvoiceId: item.matched_invoice_id,
        matchedBy: item.matched_by,
        matchedAt: item.matched_at,
        rejectionReason: item.rejection_reason,
        createdAt: item.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single unmatched payment by ID
   */
  async findById(id: string) {
    const payment = await this.prisma.unmatched_payments.findUnique({
      where: { id },
      include: {
        matched_invoice: true,
        matcher: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Unmatched payment ${id} not found`);
    }

    return payment;
  }

  /**
   * Manually match an unmatched payment to an invoice
   * 
   * This updates both the unmatched_payment record and the target invoice.
   * Uses transaction for atomicity.
   */
  async matchToInvoice(
    paymentId: string,
    invoiceId: string,
    matcherId: string,
  ): Promise<{ success: boolean; invoiceId: string }> {
    const payment = await this.prisma.unmatched_payments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Unmatched payment ${paymentId} not found`);
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment already ${payment.status}`);
    }

    // Verify invoice exists
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        contracts: {
          include: {
            users_contracts_tenant_idTousers: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    // Check if invoice already paid
    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    // Perform atomic update
    await this.prisma.$transaction([
      // Update invoice as paid
      this.prisma.invoices.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paid_amount: payment.amount,
          paid_at: payment.received_at,
          external_transaction_id: payment.transaction_id,
          raw_gateway_response: payment.raw_payload as any,
        },
      }),
      // Update unmatched payment as matched
      this.prisma.unmatched_payments.update({
        where: { id: paymentId },
        data: {
          status: 'matched',
          matched_invoice_id: invoiceId,
          matched_by: matcherId,
          matched_at: new Date(),
        },
      }),
    ]);

    // Notify tenant
    const tenantId = invoice.contracts?.users_contracts_tenant_idTousers?.id;
    if (tenantId) {
      await this.notificationQueue.add('send', {
        type: 'payment_confirmed',
        userId: tenantId,
        data: {
          entityType: 'invoice',
          entityId: invoiceId,
          amount: payment.amount.toNumber(),
          gateway: payment.gateway,
          transactionId: payment.transaction_id,
          manuallyMatched: true,
        },
      });
    }

    this.logger.log('Manually matched unmatched payment', {
      paymentId,
      invoiceId,
      matcherId,
    });

    return { success: true, invoiceId };
  }

  /**
   * Reject an unmatched payment with reason
   */
  async reject(
    paymentId: string,
    reason: string,
    rejectedBy: string,
  ): Promise<{ success: boolean }> {
    const payment = await this.prisma.unmatched_payments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Unmatched payment ${paymentId} not found`);
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException(`Payment already ${payment.status}`);
    }

    await this.prisma.unmatched_payments.update({
      where: { id: paymentId },
      data: {
        status: 'rejected',
        rejection_reason: reason,
        matched_by: rejectedBy, // Reusing field for rejected_by
        matched_at: new Date(), // Reusing field for rejected_at
      },
    });

    this.logger.log('Rejected unmatched payment', {
      paymentId,
      reason,
      rejectedBy,
    });

    return { success: true };
  }

  /**
   * Search invoices that could match an unmatched payment
   * Helps accountants find the right invoice to match
   */
  async searchPotentialMatches(paymentId: string) {
    const payment = await this.prisma.unmatched_payments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Unmatched payment ${paymentId} not found`);
    }

    // Search by amount (exact match or close)
    const tolerance = new Decimal(payment.amount).mul(0.05); // 5% tolerance
    const minAmount = new Decimal(payment.amount).sub(tolerance);
    const maxAmount = new Decimal(payment.amount).add(tolerance);

    const invoices = await this.prisma.invoices.findMany({
      where: {
        status: { in: ['pending', 'overdue'] },
        total_amount: {
          gte: minAmount,
          lte: maxAmount,
        },
      },
      orderBy: { issue_date: 'desc' },
      take: 10,
      include: {
        contracts: {
          include: {
            users_contracts_tenant_idTousers: {
              select: { id: true, first_name: true, last_name: true },
            },
            apartments: {
              select: { unit_number: true },
            },
          },
        },
        apartments: {
          select: { unit_number: true },
        },
      },
    });

    return invoices.map((inv: { id: string; invoice_number: string | null; total_amount: { toNumber(): number }; billing_period: string; due_date: Date; status: string; apartments: { unit_number: string } | null; contracts: { apartments: { unit_number: string } | null; users_contracts_tenant_idTousers: { first_name: string; last_name: string } | null } | null }) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      totalAmount: inv.total_amount.toNumber(),
      billingPeriod: inv.billing_period,
      dueDate: inv.due_date,
      status: inv.status,
      apartmentUnit: inv.apartments?.unit_number || inv.contracts?.apartments?.unit_number,
      tenantName: inv.contracts?.users_contracts_tenant_idTousers
        ? `${inv.contracts.users_contracts_tenant_idTousers.first_name} ${inv.contracts.users_contracts_tenant_idTousers.last_name}`
        : null,
    }));
  }

  /**
   * Get statistics for unmatched payments dashboard
   */
  async getStats() {
    const [pending, matched, rejected, totalPendingAmount] = await Promise.all([
      this.prisma.unmatched_payments.count({ where: { status: 'pending' } }),
      this.prisma.unmatched_payments.count({ where: { status: 'matched' } }),
      this.prisma.unmatched_payments.count({ where: { status: 'rejected' } }),
      this.prisma.unmatched_payments.aggregate({
        where: { status: 'pending' },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      matched,
      rejected,
      totalPendingAmount: totalPendingAmount._sum.amount?.toNumber() || 0,
    };
  }
}

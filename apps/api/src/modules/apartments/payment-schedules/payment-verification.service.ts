import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  ReportPaymentDto,
  VerifyPaymentDto,
  PaymentResponseDto,
  PendingPaymentResponseDto,
  ContractPaymentStatus,
} from '../dto/payment.dto';
import { isPast, format } from 'date-fns';
import { toPaymentResponseDto } from './payment-schedule.mapper';

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private get schedules() {
    return this.prisma.contract_payment_schedules;
  }

  private get payments() {
    return this.prisma.contract_payments;
  }

  // =========================================================================
  // Payment Reporting (Resident - awaiting verification)
  // =========================================================================

  async reportPayment(
    scheduleId: string,
    dto: ReportPaymentDto,
    reportedById: string,
  ): Promise<PaymentResponseDto> {
    const schedule = await this.schedules.findUnique({
      where: { id: scheduleId },
      include: {
        contracts: {
          select: { tenant_id: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    // Verify the reporter is the tenant
    if (schedule.contracts.tenant_id !== reportedById) {
      throw new BadRequestException('You can only report payments for your own contracts');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.contract_payments.create({
        data: {
          schedule_id: scheduleId,
          amount: dto.amount,
          payment_date: new Date(dto.paymentDate),
          payment_method: dto.paymentMethod,
          reference_number: dto.referenceNumber,
          status: 'reported', // Awaiting admin verification
          reported_by: reportedById,
          reported_at: new Date(),
          recorded_by: reportedById, // Initially same as reporter
          receipt_url: dto.receiptUrl,
          notes: dto.notes,
        },
        include: {
          users: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
          reporter: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      // Update schedule status to "reported" (pending verification)
      await tx.contract_payment_schedules.update({
        where: { id: scheduleId },
        data: {
          status: 'reported',
          updated_at: new Date(),
        },
      });

      return payment;
    });

    this.logger.log({
      event: 'payment_reported',
      paymentId: result.id,
      scheduleId,
      amount: dto.amount,
      reportedById,
    });

    // TODO: Send WebSocket notification to admins
    // this.socketGateway.server.to(`building:${buildingId}`).emit('payment:reported', {...});

    return toPaymentResponseDto(result);
  }

  // =========================================================================
  // Payment Verification (Admin)
  // =========================================================================

  async verifyPayment(
    paymentId: string,
    dto: VerifyPaymentDto,
    verifiedById: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.payments.findUnique({
      where: { id: paymentId },
      include: {
        schedule: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'reported') {
      throw new BadRequestException('Only reported payments can be verified');
    }

    const finalAmount = dto.actualAmount ?? Number(payment.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.contract_payments.update({
        where: { id: paymentId },
        data: {
          status: dto.status,
          amount: finalAmount,
          verified_by: verifiedById,
          verified_at: new Date(),
          recorded_by: verifiedById, // Update to verifying admin
          recorded_at: new Date(),
          notes: dto.notes ? `${payment.notes ?? ''}\n[Admin]: ${dto.notes}` : payment.notes,
          rejection_reason: dto.status === ContractPaymentStatus.rejected ? dto.rejectionReason : null,
        },
        include: {
          users: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
          reporter: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      if (dto.status === ContractPaymentStatus.confirmed) {
        // Payment confirmed - update schedule amounts
        const newReceivedAmount = Number(payment.schedule.received_amount) + finalAmount;
        const expectedAmount = Number(payment.schedule.expected_amount);

        let newStatus: PaymentStatus;
        if (newReceivedAmount >= expectedAmount) {
          newStatus = PaymentStatus.paid;
        } else if (newReceivedAmount > 0) {
          newStatus = PaymentStatus.partial;
        } else {
          newStatus = PaymentStatus.pending;
        }

        await tx.contract_payment_schedules.update({
          where: { id: payment.schedule_id },
          data: {
            received_amount: newReceivedAmount,
            status: newStatus,
            updated_at: new Date(),
          },
        });

        // =====================================================================
        // SYNC INVOICE: Update related invoice when rent payment is confirmed
        // =====================================================================
        const billingPeriod = format(payment.schedule.due_date, 'yyyy-MM');
        const contractId = payment.schedule.contract_id;

        const relatedInvoice = await tx.invoices.findFirst({
          where: {
            contract_id: contractId,
            billing_period: billingPeriod,
          },
          include: {
            invoice_line_items: true,
          },
        });

        if (relatedInvoice) {
          const newPaidAmount = Number(relatedInvoice.paid_amount) + finalAmount;
          const totalAmount = Number(relatedInvoice.total_amount);

          // Determine new invoice status
          let invoiceStatus: InvoiceStatus;
          if (newPaidAmount >= totalAmount) {
            invoiceStatus = InvoiceStatus.paid;
          } else if (newPaidAmount > 0) {
            // Partial payment - keep as pending (a partial status would be better but isn't in enum)
            invoiceStatus = relatedInvoice.status === InvoiceStatus.overdue
              ? InvoiceStatus.overdue
              : InvoiceStatus.pending;
          } else {
            invoiceStatus = relatedInvoice.status;
          }

          await tx.invoices.update({
            where: { id: relatedInvoice.id },
            data: {
              paid_amount: newPaidAmount,
              status: invoiceStatus,
              paid_at: invoiceStatus === InvoiceStatus.paid ? new Date() : relatedInvoice.paid_at,
              updated_at: new Date(),
            },
          });

          this.logger.log({
            event: 'invoice_synced_from_payment',
            invoiceId: relatedInvoice.id,
            contractId,
            billingPeriod,
            paidAmount: newPaidAmount,
            newStatus: invoiceStatus,
          });
        }
      } else if (dto.status === ContractPaymentStatus.rejected) {
        // Payment rejected - revert schedule to pending/overdue
        const pendingPayments = await tx.contract_payments.count({
          where: {
            schedule_id: payment.schedule_id,
            status: 'reported',
            id: { not: paymentId },
          },
        });

        // Only revert if no other pending payments
        if (pendingPayments === 0) {
          const newStatus = isPast(payment.schedule.due_date)
            ? PaymentStatus.overdue
            : PaymentStatus.pending;

          await tx.contract_payment_schedules.update({
            where: { id: payment.schedule_id },
            data: {
              status: newStatus,
              updated_at: new Date(),
            },
          });
        }
      }

      return updatedPayment;
    });

    this.logger.log({
      event: 'payment_verified',
      paymentId,
      status: dto.status,
      verifiedById,
      finalAmount,
    });

    // TODO: Send notification to resident
    // this.notificationService.notify(payment.reported_by, {...});

    return toPaymentResponseDto(result);
  }

  // =========================================================================
  // Pending Payments (for Admin verification tab)
  // =========================================================================

  async findPendingPayments(): Promise<PendingPaymentResponseDto[]> {
    const payments = await this.payments.findMany({
      where: {
        status: 'reported',
      },
      include: {
        users: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        reporter: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        schedule: {
          select: {
            id: true,
            period_label: true,
            expected_amount: true,
            received_amount: true,
            due_date: true,
            contract_id: true,
            contracts: {
              select: {
                id: true,
                apartment_id: true,
                tenant_id: true,
                users_contracts_tenant_idTousers: {
                  select: { first_name: true, last_name: true },
                },
                apartments: {
                  select: { apartment_code: true },
                },
              },
            },
          },
        },
      },
      orderBy: { reported_at: 'asc' },
    });

    return payments.map((p) => ({
      ...toPaymentResponseDto(p),
      schedule: {
        id: p.schedule.id,
        periodLabel: p.schedule.period_label,
        expectedAmount: Number(p.schedule.expected_amount),
        receivedAmount: Number(p.schedule.received_amount),
        dueDate: p.schedule.due_date,
        contractId: p.schedule.contract_id,
      },
      contract: {
        id: p.schedule.contracts.id,
        apartmentId: p.schedule.contracts.apartment_id,
        tenantId: p.schedule.contracts.tenant_id,
        tenantName: `${p.schedule.contracts.users_contracts_tenant_idTousers.first_name} ${p.schedule.contracts.users_contracts_tenant_idTousers.last_name}`,
        apartmentCode: p.schedule.contracts.apartments.apartment_code ?? 'N/A',
      },
    }));
  }

  // =========================================================================
  // Payment History (Confirmed/Rejected - for Admin history tab)
  // =========================================================================

  async findPaymentHistory(days: number = 30): Promise<PendingPaymentResponseDto[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await this.payments.findMany({
      where: {
        status: { in: ['confirmed', 'rejected'] },
        verified_at: { gte: since },
      },
      include: {
        users: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        reporter: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        verifier: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        schedule: {
          select: {
            id: true,
            period_label: true,
            expected_amount: true,
            received_amount: true,
            due_date: true,
            contract_id: true,
            contracts: {
              select: {
                id: true,
                apartment_id: true,
                tenant_id: true,
                users_contracts_tenant_idTousers: {
                  select: { first_name: true, last_name: true },
                },
                apartments: {
                  select: { apartment_code: true },
                },
              },
            },
          },
        },
      },
      orderBy: { verified_at: 'desc' },
    });

    return payments.map((p) => ({
      ...toPaymentResponseDto(p),
      schedule: {
        id: p.schedule.id,
        periodLabel: p.schedule.period_label,
        expectedAmount: Number(p.schedule.expected_amount),
        receivedAmount: Number(p.schedule.received_amount),
        dueDate: p.schedule.due_date,
        contractId: p.schedule.contract_id,
      },
      contract: {
        id: p.schedule.contracts.id,
        apartmentId: p.schedule.contracts.apartment_id,
        tenantId: p.schedule.contracts.tenant_id,
        tenantName: `${p.schedule.contracts.users_contracts_tenant_idTousers.first_name} ${p.schedule.contracts.users_contracts_tenant_idTousers.last_name}`,
        apartmentCode: p.schedule.contracts.apartments.apartment_code ?? 'N/A',
      },
    }));
  }
}

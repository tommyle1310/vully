import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  RecordPaymentDto,
  PaymentResponseDto,
} from '../dto/payment.dto';
import { isPast } from 'date-fns';
import { toPaymentResponseDto } from './payment-schedule.mapper';

@Injectable()
export class PaymentRecordingService {
  private readonly logger = new Logger(PaymentRecordingService.name);

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
  // Payment Recording (Admin)
  // =========================================================================

  async recordPayment(
    scheduleId: string,
    dto: RecordPaymentDto,
    recordedById: string,
  ): Promise<PaymentResponseDto> {
    const schedule = await this.schedules.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.contract_payments.create({
        data: {
          schedule_id: scheduleId,
          amount: dto.amount,
          payment_date: new Date(dto.paymentDate),
          payment_method: dto.paymentMethod,
          reference_number: dto.referenceNumber,
          status: 'confirmed', // Admin-recorded payments are auto-confirmed
          recorded_by: recordedById,
          receipt_url: dto.receiptUrl,
          notes: dto.notes,
        },
        include: {
          users: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
        },
      });

      const newReceivedAmount = Number(schedule.received_amount) + dto.amount;
      const expectedAmount = Number(schedule.expected_amount);

      let newStatus: PaymentStatus;
      if (newReceivedAmount >= expectedAmount) {
        newStatus = PaymentStatus.paid;
      } else if (newReceivedAmount > 0) {
        newStatus = PaymentStatus.partial;
      } else {
        newStatus = schedule.status as PaymentStatus;
      }

      await tx.contract_payment_schedules.update({
        where: { id: scheduleId },
        data: {
          received_amount: newReceivedAmount,
          status: newStatus,
          updated_at: new Date(),
        },
      });

      return payment;
    });

    // Emit event for cache invalidation
    const contract = await this.prisma.contracts.findUnique({
      where: { id: schedule.contract_id },
      select: { tenant_id: true },
    });

    if (contract) {
      this.eventEmitter.emit('payment.recorded', {
        userId: contract.tenant_id,
        contractId: schedule.contract_id,
        paymentId: result.id,
      });
    }

    this.logger.log({
      event: 'payment_recorded',
      paymentId: result.id,
      scheduleId,
      amount: dto.amount,
      recordedById,
    });

    return toPaymentResponseDto(result);
  }

  async findPaymentsByContract(contractId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.payments.findMany({
      where: {
        schedule: { contract_id: contractId },
      },
      include: {
        users: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        reporter: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        schedule: {
          select: { period_label: true, payment_type: true },
        },
      },
      orderBy: { recorded_at: 'desc' },
    });

    return payments.map(toPaymentResponseDto);
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.payments.findUnique({
      where: { id },
      include: { schedule: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contract_payments.delete({ where: { id } });

      const remainingPayments = await tx.contract_payments.aggregate({
        where: { schedule_id: payment.schedule_id },
        _sum: { amount: true },
      });

      const newReceivedAmount = Number(remainingPayments._sum.amount || 0);
      const expectedAmount = Number(payment.schedule.expected_amount);

      let newStatus: PaymentStatus;
      if (newReceivedAmount >= expectedAmount) {
        newStatus = PaymentStatus.paid;
      } else if (newReceivedAmount > 0) {
        newStatus = PaymentStatus.partial;
      } else if (isPast(payment.schedule.due_date)) {
        newStatus = PaymentStatus.overdue;
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
    });

    this.logger.log({
      event: 'payment_deleted',
      paymentId: id,
      scheduleId: payment.schedule_id,
    });
  }
}

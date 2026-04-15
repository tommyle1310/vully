import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreatePaymentScheduleDto,
  UpdatePaymentScheduleDto,
  PaymentScheduleResponseDto,
  ContractFinancialSummaryDto,
} from '../dto/payment.dto';
import { isPast } from 'date-fns';
import { toScheduleResponseDto, toPaymentResponseDto } from './payment-schedule.mapper';

@Injectable()
export class SchedulesCoreService {
  private readonly logger = new Logger(SchedulesCoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private get schedules() {
    return this.prisma.contract_payment_schedules;
  }

  // =========================================================================
  // Payment Schedule CRUD
  // =========================================================================

  async createSchedule(
    contractId: string,
    dto: CreatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const schedule = await this.schedules.create({
      data: {
        contract_id: contractId,
        period_label: dto.periodLabel,
        payment_type: dto.paymentType,
        sequence_number: dto.sequenceNumber,
        due_date: new Date(dto.dueDate),
        expected_amount: dto.expectedAmount,
        received_amount: 0,
        status: 'pending',
        notes: dto.notes,
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'payment_schedule_created',
      scheduleId: schedule.id,
      contractId,
      paymentType: dto.paymentType,
    });

    return toScheduleResponseDto(schedule);
  }

  async findAllByContract(contractId: string): Promise<PaymentScheduleResponseDto[]> {
    const schedules = await this.schedules.findMany({
      where: { contract_id: contractId },
      include: {
        payments: {
          include: {
            users: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
            reporter: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
          },
          orderBy: { recorded_at: 'desc' },
        },
      },
      orderBy: { sequence_number: 'asc' },
    });

    return schedules.map((s) => toScheduleResponseDto(s, true));
  }

  async findOne(id: string): Promise<PaymentScheduleResponseDto> {
    const schedule = await this.schedules.findUnique({
      where: { id },
      include: {
        payments: {
          include: {
            users: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
            reporter: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
          },
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    return toScheduleResponseDto(schedule, true);
  }

  async updateSchedule(
    id: string,
    dto: UpdatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    const schedule = await this.schedules.findUnique({ where: { id } });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    const updated = await this.schedules.update({
      where: { id },
      data: {
        ...(dto.periodLabel && { period_label: dto.periodLabel }),
        ...(dto.dueDate && { due_date: new Date(dto.dueDate) }),
        ...(dto.expectedAmount !== undefined && { expected_amount: dto.expectedAmount }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        updated_at: new Date(),
      },
    });

    this.logger.log({
      event: 'payment_schedule_updated',
      scheduleId: id,
      changes: dto,
    });

    return toScheduleResponseDto(updated);
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.schedules.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    if (schedule.payments.length > 0) {
      throw new BadRequestException(
        'Cannot delete schedule with existing payments. Delete payments first or waive the schedule.',
      );
    }

    await this.schedules.delete({ where: { id } });

    this.logger.log({
      event: 'payment_schedule_deleted',
      scheduleId: id,
    });
  }

  // =========================================================================
  // Financial Summary
  // =========================================================================

  async getContractFinancialSummary(contractId: string): Promise<ContractFinancialSummaryDto> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    const contractData = contract as {
      contract_type?: string;
      purchase_price?: unknown;
      purchase_option_price?: unknown;
      payment_due_day?: number | null;
      rent_amount: unknown;
      start_date: Date;
      deposit_amount?: unknown;
    };

    const schedules = await this.schedules.findMany({
      where: { contract_id: contractId },
      orderBy: { due_date: 'asc' },
      include: {
        payments: {
          include: {
            users: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
            reporter: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
          },
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    const totalExpected = schedules.reduce(
      (sum, s) => sum + Number(s.expected_amount),
      0,
    );
    const totalReceived = schedules.reduce(
      (sum, s) => sum + Number(s.received_amount),
      0,
    );
    
    // Calculate reported but pending verification payments
    const reportedPending = schedules.reduce((sum, s) => {
      const pendingPayments = s.payments?.filter((p) => p.status === 'reported') || [];
      return sum + pendingPayments.reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);

    const outstanding = schedules
      .filter((s) => s.status === 'overdue' || s.status === 'partial')
      .reduce((sum, s) => sum + (Number(s.expected_amount) - Number(s.received_amount)), 0);

    const nextDue = schedules.find(
      (s) => s.status === 'pending' && !isPast(s.due_date),
    );

    // Collect all payments and sort by date descending, take last 10
    const allPayments = schedules
      .flatMap((s) => s.payments || [])
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      .slice(0, 10);

    let totalContractValue: number;
    if (contractData.contract_type === 'purchase') {
      totalContractValue = Number(contractData.purchase_price || 0);
    } else if (contractData.contract_type === 'lease_to_own') {
      totalContractValue = Number(contractData.purchase_option_price || contractData.purchase_price || 0);
    } else {
      totalContractValue = totalExpected || Number(contractData.rent_amount) * 12;
    }

    return {
      totalContractValue,
      totalPaid: totalReceived,
      reportedPending,
      paidPercent: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
      outstanding,
      remainingBalance: totalExpected - totalReceived,
      nextDue: nextDue ? toScheduleResponseDto(nextDue) : undefined,
      recentPayments: allPayments.map(toPaymentResponseDto),
    };
  }
}

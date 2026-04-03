import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePaymentScheduleDto,
  UpdatePaymentScheduleDto,
  PaymentScheduleResponseDto,
  RecordPaymentDto,
  PaymentResponseDto,
  ContractFinancialSummaryDto,
  GenerateRentScheduleDto,
  PaymentType,
  PaymentStatus,
} from './dto/payment.dto';
import { addMonths, format, isPast, isBefore, startOfDay } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

// NOTE: If you see Prisma type errors, run `npx prisma generate` to regenerate the client

// Types for Prisma models (will be auto-generated after prisma generate)
interface PaymentScheduleModel {
  id: string;
  contract_id: string;
  period_label: string;
  payment_type: string;
  sequence_number: number;
  due_date: Date;
  expected_amount: Decimal;
  received_amount: Decimal;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  payments?: PaymentModel[];
}

interface PaymentModel {
  id: string;
  schedule_id: string;
  amount: Decimal;
  payment_date: Date;
  payment_method: string | null;
  reference_number: string | null;
  recorded_by: string;
  recorded_at: Date;
  receipt_url: string | null;
  notes: string | null;
  users?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

@Injectable()
export class PaymentScheduleService {
  private readonly logger = new Logger(PaymentScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Helper to access new Prisma models (cast until prisma generate is run)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get schedules(): any {
    return (this.prisma as any).contract_payment_schedules;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private get payments(): any {
    return (this.prisma as any).contract_payments;
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

    return this.toScheduleResponseDto(schedule);
  }

  async findAllByContract(contractId: string): Promise<PaymentScheduleResponseDto[]> {
    const schedules: PaymentScheduleModel[] = await this.schedules.findMany({
      where: { contract_id: contractId },
      include: {
        payments: {
          include: {
            users: {
              select: { id: true, email: true, first_name: true, last_name: true },
            },
          },
          orderBy: { recorded_at: 'desc' },
        },
      },
      orderBy: { sequence_number: 'asc' },
    });

    return schedules.map((s: PaymentScheduleModel) => this.toScheduleResponseDto(s, true));
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
          },
          orderBy: { recorded_at: 'desc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Payment schedule not found');
    }

    return this.toScheduleResponseDto(schedule, true);
  }

  async updateSchedule(
    id: string,
    dto: UpdatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    const schedule = await this.schedules.findUnique({
      where: { id },
    });

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

    return this.toScheduleResponseDto(updated);
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
  // Payment Recording
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

    // Use transaction to record payment and update schedule
    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await (tx as any).contract_payments.create({
        data: {
          schedule_id: scheduleId,
          amount: dto.amount,
          payment_date: new Date(dto.paymentDate),
          payment_method: dto.paymentMethod,
          reference_number: dto.referenceNumber,
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

      // Update schedule received amount and status
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

      await (tx as any).contract_payment_schedules.update({
        where: { id: scheduleId },
        data: {
          received_amount: newReceivedAmount,
          status: newStatus,
          updated_at: new Date(),
        },
      });

      return payment;
    });

    this.logger.log({
      event: 'payment_recorded',
      paymentId: result.id,
      scheduleId,
      amount: dto.amount,
      recordedById,
    });

    return this.toPaymentResponseDto(result);
  }

  async findPaymentsByContract(contractId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.payments.findMany({
      where: {
        schedule: {
          contract_id: contractId,
        },
      },
      include: {
        users: {
          select: { id: true, email: true, first_name: true, last_name: true },
        },
        schedule: {
          select: { period_label: true, payment_type: true },
        },
      },
      orderBy: { recorded_at: 'desc' },
    });

    return payments.map(this.toPaymentResponseDto);
  }

  async deletePayment(id: string): Promise<void> {
    const payment = await this.payments.findUnique({
      where: { id },
      include: { schedule: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Use transaction to delete payment and update schedule
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).contract_payments.delete({ where: { id } });

      // Recalculate schedule received amount
      const remainingPayments = await (tx as any).contract_payments.aggregate({
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

      await (tx as any).contract_payment_schedules.update({
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

    // Cast to any to access new fields until Prisma client is regenerated
    const contractData = contract as {
      contract_type?: string;
      purchase_price?: unknown;
      purchase_option_price?: unknown;
      payment_due_day?: number | null;
      rent_amount: unknown;
      start_date: Date;
      deposit_amount?: unknown;
    };

    const schedules: PaymentScheduleModel[] = await this.schedules.findMany({
      where: { contract_id: contractId },
      orderBy: { due_date: 'asc' },
    });

    const totalExpected = schedules.reduce(
      (sum: number, s: PaymentScheduleModel) => sum + Number(s.expected_amount),
      0,
    );
    const totalReceived = schedules.reduce(
      (sum: number, s: PaymentScheduleModel) => sum + Number(s.received_amount),
      0,
    );
    const outstanding = schedules
      .filter((s: PaymentScheduleModel) => s.status === 'overdue' || s.status === 'partial')
      .reduce((sum: number, s: PaymentScheduleModel) => sum + (Number(s.expected_amount) - Number(s.received_amount)), 0);

    // Find next pending schedule
    const nextDue = schedules.find(
      (s: PaymentScheduleModel) => s.status === 'pending' && !isPast(s.due_date),
    );

    // Calculate total contract value based on type
    let totalContractValue: number;
    if (contractData.contract_type === 'purchase') {
      totalContractValue = Number(contractData.purchase_price || 0);
    } else if (contractData.contract_type === 'lease_to_own') {
      totalContractValue = Number(contractData.purchase_option_price || contractData.purchase_price || 0);
    } else {
      // For rental, estimate based on rent amount * 12 months or total expected from schedules
      totalContractValue = totalExpected || Number(contractData.rent_amount) * 12;
    }

    return {
      totalContractValue,
      totalPaid: totalReceived,
      paidPercent: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
      outstanding,
      remainingBalance: totalExpected - totalReceived,
      nextDue: nextDue ? this.toScheduleResponseDto(nextDue) : undefined,
    };
  }

  // =========================================================================
  // Auto-Generation
  // =========================================================================

  async generateRentSchedules(
    contractId: string,
    dto: GenerateRentScheduleDto,
  ): Promise<PaymentScheduleResponseDto[]> {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Cast to any to access new fields until Prisma client is regenerated
    const contractData = contract as {
      contract_type?: string;
      payment_due_day?: number | null;
      rent_amount: unknown;
      start_date: Date;
      deposit_amount?: unknown;
    };

    if (contractData.contract_type !== 'rental' && contractData.contract_type !== undefined) {
      throw new BadRequestException(
        'Rent schedules can only be generated for rental contracts',
      );
    }

    // Check for existing schedules
    const existingCount = await this.schedules.count({
      where: { contract_id: contractId, payment_type: 'rent' },
    });

    if (existingCount > 0) {
      throw new BadRequestException(
        'Rent schedules already exist for this contract. Delete existing schedules first.',
      );
    }

    const months = dto.months || 12;
    const paymentDueDay = dto.paymentDueDay || contractData.payment_due_day || 5;
    const startDate = new Date(contractData.start_date);
    const rentAmount = Number(contractData.rent_amount);

    const schedules: Array<{
      contract_id: string;
      period_label: string;
      payment_type: PaymentType;
      sequence_number: number;
      due_date: Date;
      expected_amount: number;
      received_amount: number;
      status: PaymentStatus;
      updated_at: Date;
    }> = [];

    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(startDate, i);
      const dueDate = new Date(monthDate);
      dueDate.setDate(paymentDueDay);

      // Determine initial status based on due date
      const today = startOfDay(new Date());
      const status = isBefore(dueDate, today)
        ? PaymentStatus.overdue
        : PaymentStatus.pending;

      schedules.push({
        contract_id: contractId,
        period_label: `Rent ${format(monthDate, 'MMM yyyy')}`,
        payment_type: PaymentType.rent,
        sequence_number: i + 1,
        due_date: dueDate,
        expected_amount: rentAmount,
        received_amount: 0,
        status,
        updated_at: new Date(),
      });
    }

    // Also add deposit schedule if deposit exists
    if (contractData.deposit_amount && Number(contractData.deposit_amount) > 0) {
      schedules.unshift({
        contract_id: contractId,
        period_label: 'Security Deposit',
        payment_type: PaymentType.deposit,
        sequence_number: 0,
        due_date: new Date(contractData.start_date),
        expected_amount: Number(contractData.deposit_amount),
        received_amount: 0,
        status: PaymentStatus.pending,
        updated_at: new Date(),
      });
    }

    await this.schedules.createMany({
      data: schedules,
    });

    this.logger.log({
      event: 'rent_schedules_generated',
      contractId,
      count: schedules.length,
      months,
    });

    // Return the created schedules
    return this.findAllByContract(contractId);
  }

  // =========================================================================
  // Status Update (for cron job)
  // =========================================================================

  async updateOverdueStatuses(): Promise<number> {
    const today = startOfDay(new Date());

    const result = await this.schedules.updateMany({
      where: {
        status: 'pending',
        due_date: {
          lt: today,
        },
      },
      data: {
        status: 'overdue',
        updated_at: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log({
        event: 'overdue_statuses_updated',
        count: result.count,
      });
    }

    return result.count;
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private toScheduleResponseDto(
    schedule: {
      id: string;
      contract_id: string;
      period_label: string;
      payment_type: string;
      sequence_number: number;
      due_date: Date;
      expected_amount: unknown;
      received_amount: unknown;
      status: string;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
      payments?: Array<{
        id: string;
        schedule_id: string;
        amount: unknown;
        payment_date: Date;
        payment_method: string | null;
        reference_number: string | null;
        recorded_by: string;
        recorded_at: Date;
        receipt_url: string | null;
        notes: string | null;
        users?: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
      }>;
    },
    includePayments = false,
  ): PaymentScheduleResponseDto {
    const expectedAmount = Number(schedule.expected_amount);
    const receivedAmount = Number(schedule.received_amount);

    return {
      id: schedule.id,
      contractId: schedule.contract_id,
      periodLabel: schedule.period_label,
      paymentType: schedule.payment_type as PaymentType,
      sequenceNumber: schedule.sequence_number,
      dueDate: schedule.due_date,
      expectedAmount,
      receivedAmount,
      balance: expectedAmount - receivedAmount,
      status: schedule.status as PaymentStatus,
      notes: schedule.notes ?? undefined,
      created_at: schedule.created_at,
      updatedAt: schedule.updated_at,
      ...(includePayments && schedule.payments && {
        payments: schedule.payments.map(this.toPaymentResponseDto),
      }),
    };
  }

  private toPaymentResponseDto(
    payment: {
      id: string;
      schedule_id: string;
      amount: unknown;
      payment_date: Date;
      payment_method: string | null;
      reference_number: string | null;
      recorded_by: string;
      recorded_at: Date;
      receipt_url: string | null;
      notes: string | null;
      users?: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
      };
    },
  ): PaymentResponseDto {
    return {
      id: payment.id,
      scheduleId: payment.schedule_id,
      amount: Number(payment.amount),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method as PaymentResponseDto['paymentMethod'],
      referenceNumber: payment.reference_number ?? undefined,
      recordedBy: payment.recorded_by,
      recordedAt: payment.recorded_at,
      receiptUrl: payment.receipt_url ?? undefined,
      notes: payment.notes ?? undefined,
      ...(payment.users && {
        recordedByUser: {
          id: payment.users.id,
          email: payment.users.email,
          firstName: payment.users.first_name,
          lastName: payment.users.last_name,
        },
      }),
    };
  }
}

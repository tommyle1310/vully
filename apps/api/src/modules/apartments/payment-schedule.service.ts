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
  ReportPaymentDto,
  VerifyPaymentDto,
  PaymentResponseDto,
  ContractFinancialSummaryDto,
  PaymentType,
  PaymentStatus,
  ContractPaymentStatus,
  PendingPaymentResponseDto,
} from './dto/payment.dto';
import { isPast } from 'date-fns';
import { toScheduleResponseDto, toPaymentResponseDto } from './payment-schedule.mapper';

@Injectable()
export class PaymentScheduleService {
  private readonly logger = new Logger(PaymentScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get schedules() {
    return this.prisma.contract_payment_schedules;
  }

  private get payments() {
    return this.prisma.contract_payments;
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

    this.logger.log({
      event: 'payment_recorded',
      paymentId: result.id,
      scheduleId,
      amount: dto.amount,
      recordedById,
    });

    return toPaymentResponseDto(result);
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
    });

    const totalExpected = schedules.reduce(
      (sum, s) => sum + Number(s.expected_amount),
      0,
    );
    const totalReceived = schedules.reduce(
      (sum, s) => sum + Number(s.received_amount),
      0,
    );
    const outstanding = schedules
      .filter((s) => s.status === 'overdue' || s.status === 'partial')
      .reduce((sum, s) => sum + (Number(s.expected_amount) - Number(s.received_amount)), 0);

    const nextDue = schedules.find(
      (s) => s.status === 'pending' && !isPast(s.due_date),
    );

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
      paidPercent: totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0,
      outstanding,
      remainingBalance: totalExpected - totalReceived,
      nextDue: nextDue ? toScheduleResponseDto(nextDue) : undefined,
    };
  }
}

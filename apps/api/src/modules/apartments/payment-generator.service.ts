import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PaymentScheduleResponseDto,
  GenerateRentScheduleDto,
  GeneratePurchaseMilestonesDto,
  PaymentType,
  PaymentStatus,
} from './dto/payment.dto';
import { addMonths, format, isPast, isBefore, startOfDay } from 'date-fns';
import { DEFAULT_PAYMENT_DUE_DAY } from '../../common/constants/defaults';
import { toScheduleResponseDto } from './payment-schedule.mapper';

@Injectable()
export class PaymentGeneratorService {
  private readonly logger = new Logger(PaymentGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get schedules() {
    return this.prisma.contract_payment_schedules;
  }

  async generateRentSchedules(
    contractId: string,
    dto: GenerateRentScheduleDto,
  ): Promise<PaymentScheduleResponseDto[]> {
    const contract = await this.validateContractForGeneration(
      contractId,
      'rental',
      { payment_type: PaymentType.rent },
    );

    const months = dto.months || 12;
    const paymentDueDay = dto.paymentDueDay || contract.payment_due_day || DEFAULT_PAYMENT_DUE_DAY;
    const startDate = new Date(contract.start_date);
    const rentAmount = Number(contract.rent_amount);

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

    if (contract.deposit_amount && Number(contract.deposit_amount) > 0) {
      schedules.unshift(
        this.createDepositSchedule(contractId, startDate, Number(contract.deposit_amount)),
      );
    }

    await this.schedules.createMany({ data: schedules });

    this.logger.log({
      event: 'rent_schedules_generated',
      contractId,
      count: schedules.length,
      months,
    });

    return this.findAllByContract(contractId);
  }

  async generateLeaseToOwnSchedules(
    contractId: string,
    dto: GenerateRentScheduleDto,
  ): Promise<PaymentScheduleResponseDto[]> {
    const contract = await this.validateContractForGeneration(
      contractId,
      'lease_to_own',
      { payment_type: PaymentType.installment },
    );

    const totalMonths = contract.option_period_months || dto.months || 60;
    const months = dto.months || Math.min(totalMonths, 12);
    const paymentDueDay = dto.paymentDueDay || contract.payment_due_day || DEFAULT_PAYMENT_DUE_DAY;
    const startDate = new Date(contract.start_date);
    const installmentAmount = Number(contract.rent_amount);

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

    // Option fee schedule if applicable
    if (contract.option_fee && Number(contract.option_fee) > 0) {
      schedules.push({
        contract_id: contractId,
        period_label: 'Option Fee',
        payment_type: PaymentType.option_fee,
        sequence_number: 0,
        due_date: startDate,
        expected_amount: Number(contract.option_fee),
        received_amount: 0,
        status: isPast(startDate) ? PaymentStatus.overdue : PaymentStatus.pending,
        updated_at: new Date(),
      });
    }

    // Deposit schedule if applicable
    if (contract.deposit_amount && Number(contract.deposit_amount) > 0) {
      schedules.push(
        this.createDepositSchedule(contractId, startDate, Number(contract.deposit_amount)),
      );
    }

    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(startDate, i);
      const dueDate = new Date(monthDate);
      dueDate.setDate(paymentDueDay);

      const today = startOfDay(new Date());
      const status = isBefore(dueDate, today)
        ? PaymentStatus.overdue
        : PaymentStatus.pending;

      schedules.push({
        contract_id: contractId,
        period_label: `Installment ${i + 1}/${totalMonths} - ${format(monthDate, 'yyyy-MM')}`,
        payment_type: PaymentType.installment,
        sequence_number: i + 1,
        due_date: dueDate,
        expected_amount: installmentAmount,
        received_amount: 0,
        status,
        updated_at: new Date(),
      });
    }

    await this.schedules.createMany({ data: schedules });

    this.logger.log({
      event: 'lease_to_own_schedules_generated',
      contractId,
      count: schedules.length,
      months,
      totalMonths,
    });

    return this.findAllByContract(contractId);
  }

  async generatePurchaseMilestones(
    contractId: string,
    dto: GeneratePurchaseMilestonesDto,
  ): Promise<PaymentScheduleResponseDto[]> {
    const contract = await this.validateContractForGeneration(contractId, 'purchase');

    const purchasePrice = Number(contract.purchase_price || 0);
    if (purchasePrice <= 0) {
      throw new BadRequestException('Contract must have a valid purchase price');
    }

    const downPaymentPercent = dto.downPaymentPercent || 30;
    const progressPaymentCount = dto.progressPaymentCount || 3;

    const downPaymentAmount = Number(contract.down_payment) || (purchasePrice * downPaymentPercent / 100);
    const remaining = purchasePrice - downPaymentAmount;
    const progressAmount = Math.floor(remaining / (progressPaymentCount + 1));
    const finalAmount = remaining - (progressAmount * progressPaymentCount);

    const startDate = new Date(contract.start_date);
    const transferDate = contract.transfer_date
      ? new Date(contract.transfer_date)
      : contract.end_date
        ? new Date(contract.end_date)
        : addMonths(startDate, 12);

    const totalMonths = Math.max(
      1,
      Math.floor((transferDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    const interval = Math.max(1, Math.floor(totalMonths / (progressPaymentCount + 1)));

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

    schedules.push({
      contract_id: contractId,
      period_label: 'Down Payment',
      payment_type: PaymentType.downpayment,
      sequence_number: 1,
      due_date: startDate,
      expected_amount: downPaymentAmount,
      received_amount: 0,
      status: isPast(startDate) ? PaymentStatus.overdue : PaymentStatus.pending,
      updated_at: new Date(),
    });

    for (let i = 0; i < progressPaymentCount; i++) {
      const dueDate = addMonths(startDate, (i + 1) * interval);
      schedules.push({
        contract_id: contractId,
        period_label: `Progress Payment ${i + 1}`,
        payment_type: PaymentType.installment,
        sequence_number: i + 2,
        due_date: dueDate,
        expected_amount: progressAmount,
        received_amount: 0,
        status: isPast(dueDate) ? PaymentStatus.overdue : PaymentStatus.pending,
        updated_at: new Date(),
      });
    }

    schedules.push({
      contract_id: contractId,
      period_label: 'Final Payment - Property Transfer',
      payment_type: PaymentType.installment,
      sequence_number: progressPaymentCount + 2,
      due_date: transferDate,
      expected_amount: finalAmount,
      received_amount: 0,
      status: isPast(transferDate) ? PaymentStatus.overdue : PaymentStatus.pending,
      updated_at: new Date(),
    });

    await this.schedules.createMany({ data: schedules });

    this.logger.log({
      event: 'purchase_milestones_generated',
      contractId,
      count: schedules.length,
      purchasePrice,
      downPaymentAmount,
      progressPaymentCount,
    });

    return this.findAllByContract(contractId);
  }

  async updateOverdueStatuses(): Promise<number> {
    const today = startOfDay(new Date());

    const result = await this.schedules.updateMany({
      where: {
        status: 'pending',
        due_date: { lt: today },
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

  private async validateContractForGeneration(
    contractId: string,
    expectedType: string,
    scheduleFilter?: { payment_type: PaymentType },
  ) {
    const contract = await this.prisma.contracts.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (expectedType !== 'any' && contract.contract_type !== expectedType && contract.contract_type !== undefined) {
      throw new BadRequestException(
        `${expectedType === 'rental' ? 'Rent' : 'Purchase'} schedules can only be generated for ${expectedType} contracts`,
      );
    }

    const existingCount = await this.schedules.count({
      where: { contract_id: contractId, ...scheduleFilter },
    });

    if (existingCount > 0) {
      throw new BadRequestException(
        'Payment schedules already exist for this contract. Delete existing schedules first.',
      );
    }

    return contract;
  }

  private createDepositSchedule(
    contractId: string,
    startDate: Date,
    depositAmount: number,
  ) {
    return {
      contract_id: contractId,
      period_label: 'Security Deposit',
      payment_type: PaymentType.deposit,
      sequence_number: 0,
      due_date: startDate,
      expected_amount: depositAmount,
      received_amount: 0,
      status: PaymentStatus.pending,
      updated_at: new Date(),
    };
  }

  private async findAllByContract(contractId: string): Promise<PaymentScheduleResponseDto[]> {
    const schedules = await this.schedules.findMany({
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

    return schedules.map((s) => toScheduleResponseDto(s, true));
  }
}

import { Injectable } from '@nestjs/common';
import {
  CreatePaymentScheduleDto,
  UpdatePaymentScheduleDto,
  PaymentScheduleResponseDto,
  RecordPaymentDto,
  ReportPaymentDto,
  VerifyPaymentDto,
  PaymentResponseDto,
  ContractFinancialSummaryDto,
  PendingPaymentResponseDto,
} from '../dto/payment.dto';
import { SchedulesCoreService } from './schedules-core.service';
import { PaymentRecordingService } from './payment-recording.service';
import { PaymentVerificationService } from './payment-verification.service';

/**
 * Facade service for payment schedule operations.
 * Delegates to specialized services by concern:
 * - SchedulesCoreService: Schedule CRUD + financial summary
 * - PaymentRecordingService: Admin records confirmed payments
 * - PaymentVerificationService: Report + verify workflow
 */
@Injectable()
export class PaymentScheduleService {
  constructor(
    private readonly coreService: SchedulesCoreService,
    private readonly recordingService: PaymentRecordingService,
    private readonly verificationService: PaymentVerificationService,
  ) {}

  // =========================================================================
  // Payment Schedule CRUD (delegated to SchedulesCoreService)
  // =========================================================================

  async createSchedule(
    contractId: string,
    dto: CreatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    return this.coreService.createSchedule(contractId, dto);
  }

  async findAllByContract(contractId: string): Promise<PaymentScheduleResponseDto[]> {
    return this.coreService.findAllByContract(contractId);
  }

  async findOne(id: string): Promise<PaymentScheduleResponseDto> {
    return this.coreService.findOne(id);
  }

  async updateSchedule(
    id: string,
    dto: UpdatePaymentScheduleDto,
  ): Promise<PaymentScheduleResponseDto> {
    return this.coreService.updateSchedule(id, dto);
  }

  async deleteSchedule(id: string): Promise<void> {
    return this.coreService.deleteSchedule(id);
  }

  async getContractFinancialSummary(contractId: string): Promise<ContractFinancialSummaryDto> {
    return this.coreService.getContractFinancialSummary(contractId);
  }

  // =========================================================================
  // Direct Payment Recording (delegated to PaymentRecordingService)
  // =========================================================================

  async recordPayment(
    scheduleId: string,
    dto: RecordPaymentDto,
    recordedById: string,
  ): Promise<PaymentResponseDto> {
    return this.recordingService.recordPayment(scheduleId, dto, recordedById);
  }

  async findPaymentsByContract(contractId: string): Promise<PaymentResponseDto[]> {
    return this.recordingService.findPaymentsByContract(contractId);
  }

  async deletePayment(id: string): Promise<void> {
    return this.recordingService.deletePayment(id);
  }

  // =========================================================================
  // Payment Verification Workflow (delegated to PaymentVerificationService)
  // =========================================================================

  async reportPayment(
    scheduleId: string,
    dto: ReportPaymentDto,
    reporterId: string,
  ): Promise<PaymentResponseDto> {
    return this.verificationService.reportPayment(scheduleId, dto, reporterId);
  }

  async verifyPayment(
    id: string,
    dto: VerifyPaymentDto,
    verifierId: string,
  ): Promise<PaymentResponseDto> {
    return this.verificationService.verifyPayment(id, dto, verifierId);
  }

  async findPendingPayments(): Promise<PendingPaymentResponseDto[]> {
    return this.verificationService.findPendingPayments();
  }

  async findPaymentHistory(days: number = 30): Promise<PendingPaymentResponseDto[]> {
    return this.verificationService.findPaymentHistory(days);
  }
}

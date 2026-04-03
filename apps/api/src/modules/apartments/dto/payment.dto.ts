import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsDateString,
  IsUrl,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// Enums matching Prisma schema
export enum PaymentType {
  downpayment = 'downpayment',
  installment = 'installment',
  rent = 'rent',
  deposit = 'deposit',
  option_fee = 'option_fee',
  penalty = 'penalty',
  adjustment = 'adjustment',
}

export enum PaymentStatus {
  pending = 'pending',
  partial = 'partial',
  paid = 'paid',
  overdue = 'overdue',
  waived = 'waived',
}

export enum PaymentMethod {
  bank_transfer = 'bank_transfer',
  cash = 'cash',
  check = 'check',
  card = 'card',
  other = 'other',
}

export enum ContractType {
  rental = 'rental',
  purchase = 'purchase',
  lease_to_own = 'lease_to_own',
}

// ============================================================================
// Payment Schedule DTOs
// ============================================================================

export class CreatePaymentScheduleDto {
  @ApiProperty({ example: 'Rent April 2026', description: 'Label for this payment period' })
  @IsString()
  @MaxLength(100)
  periodLabel: string;

  @ApiProperty({ enum: PaymentType, example: PaymentType.rent })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({ example: 1, description: 'Display order sequence number' })
  @IsInt()
  @Min(1)
  sequenceNumber: number;

  @ApiProperty({ example: '2026-04-05', description: 'Payment due date' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 15000000, description: 'Expected payment amount in VND' })
  @IsNumber()
  @Min(0)
  expectedAmount: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentScheduleDto {
  @ApiPropertyOptional({ example: 'Rent April 2026 (Updated)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  periodLabel?: string;

  @ApiPropertyOptional({ example: '2026-04-10' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 16000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedAmount?: number;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentScheduleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contractId: string;

  @ApiProperty()
  periodLabel: string;

  @ApiProperty({ enum: PaymentType })
  paymentType: PaymentType;

  @ApiProperty()
  sequenceNumber: number;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty()
  expectedAmount: number;

  @ApiProperty()
  receivedAmount: number;

  @ApiProperty()
  balance: number;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: () => [PaymentResponseDto] })
  payments?: PaymentResponseDto[];
}

// ============================================================================
// Payment Transaction DTOs
// ============================================================================

export class RecordPaymentDto {
  @ApiProperty({ example: 15000000, description: 'Payment amount in VND' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-04-03', description: 'Date payment was received' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.bank_transfer })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'VCB-123456', description: 'Bank reference or receipt number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Receipt/proof URL' })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  scheduleId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  paymentDate: Date;

  @ApiPropertyOptional({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  referenceNumber?: string;

  @ApiProperty()
  recordedBy: string;

  @ApiProperty()
  recordedAt: Date;

  @ApiPropertyOptional()
  receiptUrl?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  recordedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// ============================================================================
// Contract Financial Summary DTO
// ============================================================================

export class ContractFinancialSummaryDto {
  @ApiProperty({ example: 3000000000, description: 'Total contract value' })
  totalContractValue: number;

  @ApiProperty({ example: 520000000, description: 'Total amount paid' })
  totalPaid: number;

  @ApiProperty({ example: 17.3, description: 'Percentage paid' })
  paidPercent: number;

  @ApiProperty({ example: 30000000, description: 'Outstanding amount (overdue + partial)' })
  outstanding: number;

  @ApiProperty({ example: 2450000000, description: 'Remaining balance to be paid' })
  remainingBalance: number;

  @ApiPropertyOptional({ type: () => PaymentScheduleResponseDto })
  nextDue?: PaymentScheduleResponseDto;
}

// ============================================================================
// Generate Schedules DTOs
// ============================================================================

export class GenerateRentScheduleDto {
  @ApiPropertyOptional({ example: 12, description: 'Number of months to generate (default: 12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;

  @ApiPropertyOptional({ example: 5, description: 'Day of month for due date (default: from contract or 5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;
}

export class GeneratePurchaseMilestonesDto {
  @ApiPropertyOptional({ example: 3, description: 'Number of progress payments (default: 3)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  progressPaymentCount?: number;

  @ApiPropertyOptional({ example: 30, description: 'Down payment percentage (default: 30%)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  downPaymentPercent?: number;
}

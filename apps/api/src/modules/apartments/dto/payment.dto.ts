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
  reported = 'reported', // Resident claimed transfer, awaiting admin verification
  verified = 'verified', // Admin confirmed payment received
  partial = 'partial',
  paid = 'paid',
  overdue = 'overdue',
  waived = 'waived',
}

// Contract Payment Status (for individual payment transaction verification)
export enum ContractPaymentStatus {
  reported = 'reported',   // Resident claimed transfer, awaiting verification
  confirmed = 'confirmed', // Admin verified and confirmed (default for admin-recorded)
  rejected = 'rejected',   // Admin rejected (invalid payment claim)
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

// DTO for resident to report a transfer (awaiting admin verification)
export class ReportPaymentDto {
  @ApiProperty({ example: 15000000, description: 'Payment amount claimed in VND' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-04-03', description: 'Date of claimed transfer' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.bank_transfer })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'VCB-123456', description: 'Bank transfer reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Receipt/proof image URL (MinIO upload)' })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Additional notes from resident' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for admin to verify a reported payment
export class VerifyPaymentDto {
  @ApiProperty({ description: 'Whether the payment is confirmed or rejected' })
  @IsEnum(ContractPaymentStatus)
  status: ContractPaymentStatus;

  @ApiPropertyOptional({ description: 'Admin notes (e.g., rejection reason)' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Override the payment amount if different from reported' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  actualAmount?: number;
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

  @ApiProperty({ enum: ContractPaymentStatus })
  status: ContractPaymentStatus;

  // Who reported/recorded the payment
  @ApiPropertyOptional({ description: 'User who reported the payment (resident)' })
  reportedBy?: string;

  @ApiPropertyOptional()
  reportedAt?: Date;

  @ApiProperty({ description: 'User who recorded/confirmed the payment (admin)' })
  recordedBy: string;

  @ApiProperty()
  recordedAt: Date;

  // Verification info
  @ApiPropertyOptional({ description: 'Admin who verified the payment' })
  verifiedBy?: string;

  @ApiPropertyOptional()
  verifiedAt?: Date;

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

  @ApiPropertyOptional()
  reportedByUser?: {
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

// ============================================================================
// Bank Account DTOs (for VietQR Payment)
// ============================================================================

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Vietinbank', description: 'Bank name' })
  @IsString()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({ example: 'vietinbank', description: 'Bank code for VietQR' })
  @IsString()
  @MaxLength(50)
  bankCode: string;

  @ApiProperty({ example: '1234567890', description: 'Bank account number' })
  @IsString()
  @MaxLength(30)
  accountNumber: string;

  @ApiProperty({ example: 'NGUYEN VAN A', description: 'Account holder name' })
  @IsString()
  @MaxLength(255)
  accountName: string;

  @ApiPropertyOptional({ example: true, description: 'If this is the primary account' })
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Link to building (for management) or owner (for rent)
  @ApiPropertyOptional({ description: 'Building ID (for management accounts)' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ description: 'Owner/User ID (for rent collection accounts)' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ example: 'Vietinbank' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ example: 'NGUYEN VAN A' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BankAccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  buildingId?: string;

  @ApiPropertyOptional()
  ownerId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ============================================================================
// Pending Verification DTOs
// ============================================================================

export class PendingPaymentResponseDto extends PaymentResponseDto {
  @ApiProperty({ description: 'Schedule info for context' })
  schedule: {
    id: string;
    periodLabel: string;
    expectedAmount: number;
    dueDate: Date;
    contractId: string;
  };

  @ApiPropertyOptional({ description: 'Contract info for context' })
  contract?: {
    id: string;
    apartmentId: string;
    tenantId: string;
    tenantName: string;
    apartmentCode: string;
  };
}

import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Normalized payment info extracted from gateway webhook
 */
export class PaymentInfoDto {
  @ApiProperty({ description: 'Gateway transaction ID (idempotency key)' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ description: 'Payment amount in VND' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Sender name from bank' })
  @IsString()
  @IsOptional()
  senderName?: string;

  @ApiProperty({ description: 'Transfer description containing payment reference' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  @IsDateString()
  transactionTime: string;

  @ApiProperty({
    description: 'Payment gateway source',
    enum: ['payos', 'casso', 'sepay'],
  })
  @IsIn(['payos', 'casso', 'sepay'])
  gateway: 'payos' | 'casso' | 'sepay';
}

// ============================================================================
// PayOS Webhook DTOs
// ============================================================================

/**
 * PayOS webhook payload structure
 * @see https://payos.vn/docs/webhook
 */
export class PayOSWebhookDto {
  @ApiProperty({ description: 'PayOS order code' })
  @IsString()
  orderCode: string;

  @ApiProperty({ description: 'PayOS transaction reference' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Amount in VND' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Description/content' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Account number that received payment' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: 'Sender bank account' })
  @IsString()
  @IsOptional()
  counterAccountBankId?: string;

  @ApiPropertyOptional({ description: 'Sender account number' })
  @IsString()
  @IsOptional()
  counterAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Sender account name' })
  @IsString()
  @IsOptional()
  counterAccountName?: string;

  @ApiProperty({ description: 'Transaction date YYYY-MM-DD' })
  @IsString()
  transactionDateTime: string;

  @ApiProperty({ description: 'Checksum for verification' })
  @IsString()
  signature: string;
}

// ============================================================================
// Casso Webhook DTOs
// ============================================================================

/**
 * Casso webhook payload structure
 * @see https://casso.vn/api-documents/webhook-api
 */
export class CassoTransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Bank sub account number' })
  @IsString()
  bankSubAccId: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Transaction note' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Correspondent bank name' })
  @IsString()
  @IsOptional()
  corresponsiveName?: string;

  @ApiPropertyOptional({ description: 'Correspondent bank account' })
  @IsString()
  @IsOptional()
  corresponsiveAccount?: string;

  @ApiProperty({ description: 'Transaction timestamp' })
  @IsString()
  when: string;
}

export class CassoWebhookDto {
  @ApiProperty({ description: 'Error code (0 = success)' })
  @IsNumber()
  error: number;

  @ApiProperty({ type: [CassoTransactionDto], description: 'List of transactions' })
  @ValidateNested({ each: true })
  @Type(() => CassoTransactionDto)
  data: CassoTransactionDto[];
}

// ============================================================================
// SePay Webhook DTOs
// ============================================================================

/**
 * SePay webhook payload structure
 * @see https://sepay.vn/developers/docs/webhook
 */
export class SePayWebhookDto {
  @ApiProperty({ description: 'SePay transaction ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Gateway' })
  @IsString()
  gateway: string;

  @ApiProperty({ description: 'Transaction date' })
  @IsString()
  transactionDate: string;

  @ApiProperty({ description: 'Account number' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ description: 'Sub account' })
  @IsString()
  @IsOptional()
  subAccount?: string;

  @ApiProperty({ description: 'Amount received or sent' })
  @IsNumber()
  transferAmount: number;

  @ApiProperty({ description: 'Transaction type: in or out' })
  @IsIn(['in', 'out'])
  transferType: 'in' | 'out';

  @ApiProperty({ description: 'Accumulated balance after transaction' })
  @IsNumber()
  @IsOptional()
  accumulated?: number;

  @ApiProperty({ description: 'Transaction content/description' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Reference number' })
  @IsString()
  referenceNumber: string;

  @ApiPropertyOptional({ description: 'Sender name from bank' })
  @IsString()
  @IsOptional()
  senderName?: string;
}

// ============================================================================
// Unmatched Payment DTOs
// ============================================================================

export class MatchUnmatchedPaymentDto {
  @ApiProperty({ description: 'Invoice ID to match the payment to' })
  @IsUUID()
  invoiceId: string;
}

export class RejectUnmatchedPaymentDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReconcileRequestDto {
  @ApiProperty({
    description: 'Gateway to reconcile',
    enum: ['payos', 'casso', 'sepay'],
  })
  @IsIn(['payos', 'casso', 'sepay'])
  gateway: 'payos' | 'casso' | 'sepay';

  @ApiPropertyOptional({
    description: 'Hours to look back (default: 24)',
    default: 24,
  })
  @IsNumber()
  @IsOptional()
  hours?: number;
}

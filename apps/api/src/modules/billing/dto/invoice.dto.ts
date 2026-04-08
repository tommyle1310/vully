import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  Matches,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Contract ID' })
  @IsUUID()
  contractId: string;

  @ApiProperty({ example: '2026-03', description: 'Billing period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Billing period must be in YYYY-MM format' })
  billingPeriod: string;

  @ApiPropertyOptional({ description: 'Notes for the invoice' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Invoice categories to include (e.g., ["rent", "water", "electric"]). Empty/null = all.',
    example: ['rent', 'water'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  categories?: string[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InvoiceFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  apartmentId?: string;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
}

export class InvoiceLineItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  vatRate: number;

  @ApiProperty()
  vatAmount: number;

  @ApiProperty()
  environmentFee: number;

  @ApiPropertyOptional()
  utilityTypeId?: string;

  @ApiPropertyOptional()
  meterReadingId?: string;

  @ApiPropertyOptional()
  tierBreakdown?: Record<string, unknown>;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contractId: string;

  @ApiProperty()
  invoice_number: string;

  @ApiProperty()
  billingPeriod: string;

  @ApiProperty()
  issueDate: Date;

  @ApiProperty()
  dueDate: Date;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  paidAmount: number;

  @ApiPropertyOptional()
  paid_at?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  paymentReference?: string;

  @ApiPropertyOptional({ description: 'Price snapshot including reported payment info' })
  priceSnapshot?: Record<string, unknown>;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  lineItems: InvoiceLineItemDto[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updatedAt: Date;

  // Nested relations
  @ApiPropertyOptional()
  contract?: {
    id: string;
    apartments: {
      id: string;
      unit_number: string;
      buildings: {
        id: string;
        name: string;
      };
    };
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export class ReportInvoicePaymentDto {
  @ApiProperty({ description: 'Amount transferred' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2026-04-08', description: 'Date of transfer' })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ enum: ['bank_transfer', 'cash', 'check', 'card', 'other'] })
  @IsOptional()
  @IsEnum(['bank_transfer', 'cash', 'check', 'card', 'other'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Bank transfer reference number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkGenerateInvoicesDto {
  @ApiProperty({ example: '2026-03', description: 'Billing period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Billing period must be in YYYY-MM format' })
  billingPeriod: string;

  @ApiPropertyOptional({ description: 'Filter by building ID' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({
    description: 'Invoice categories to include (e.g., ["rent", "water", "electric"]). Empty/null = all.',
    example: ['rent', 'water', 'electric'],
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  categories?: string[];
}

export class BulkGenerateResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  totalContracts: number;
}

export class VerifyInvoicePaymentDto {
  @ApiProperty({ enum: ['confirmed', 'rejected'], description: 'Verification decision' })
  @IsEnum(['confirmed', 'rejected'])
  status: 'confirmed' | 'rejected';

  @ApiPropertyOptional({ description: 'The actual amount verified (if different from reported)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualAmount?: number;

  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

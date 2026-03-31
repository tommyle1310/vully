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

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  amount: number;

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
  invoiceNumber: string;

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
  paidAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  lineItems: InvoiceLineItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Nested relations
  @ApiPropertyOptional()
  contract?: {
    id: string;
    apartment: {
      id: string;
      unitNumber: string;
      building: {
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

export class BulkGenerateInvoicesDto {
  @ApiProperty({ example: '2026-03', description: 'Billing period in YYYY-MM format' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Billing period must be in YYYY-MM format' })
  billingPeriod: string;

  @ApiPropertyOptional({ description: 'Filter by building ID' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;
}

export class BulkGenerateResponseDto {
  @ApiProperty()
  jobId: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  totalContracts: number;
}

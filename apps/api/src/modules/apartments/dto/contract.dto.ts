import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

// Contract type enum matching Prisma schema
export enum ContractTypeEnum {
  rental = 'rental',
  purchase = 'purchase',
  lease_to_own = 'lease_to_own',
}

export class CreateContractDto {
  @ApiProperty({ description: 'Apartment ID' })
  @IsUUID()
  apartmentId: string;

  @ApiProperty({ description: 'Tenant user ID' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Contract end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 15000000, description: 'Monthly rent in VND' })
  @IsNumber()
  @Min(0)
  rentAmount: number;

  @ApiPropertyOptional({ example: 2, description: 'Number of deposit months' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositMonths?: number;

  @ApiPropertyOptional({ example: 30000000, description: 'Deposit amount if different from rent * months' })
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @ApiPropertyOptional({ description: 'National citizen ID of tenant/buyer' })
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of residents who will occupy the unit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfResidents?: number;

  @ApiPropertyOptional({ description: 'Additional terms and notes' })
  @IsOptional()
  @IsString()
  termsNotes?: string;

  // Payment tracking fields
  @ApiPropertyOptional({ enum: ContractTypeEnum, default: ContractTypeEnum.rental })
  @IsOptional()
  @IsEnum(ContractTypeEnum)
  contractType?: ContractTypeEnum;

  @ApiPropertyOptional({ example: 3000000000, description: 'Purchase price in VND (for purchase/lease-to-own)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ example: 500000000, description: 'Down payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Property transfer date (for purchase)' })
  @IsOptional()
  @IsDateString()
  transferDate?: string;

  @ApiPropertyOptional({ example: 50000000, description: 'Option fee for lease-to-own' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  optionFee?: number;

  @ApiPropertyOptional({ example: 3200000000, description: 'Purchase option price for lease-to-own' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseOptionPrice?: number;

  @ApiPropertyOptional({ example: 24, description: 'Option period in months for lease-to-own' })
  @IsOptional()
  @IsInt()
  @Min(1)
  optionPeriodMonths?: number;

  @ApiPropertyOptional({ example: 50, description: 'Percent of rent credited to purchase (lease-to-own)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rentCreditPercent?: number;

  @ApiPropertyOptional({ example: 5, description: 'Day of month for payment due (1-28)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;
}

export class UpdateContractDto {
  @ApiPropertyOptional({ enum: ['draft', 'active', 'expired', 'terminated'] })
  @IsOptional()
  @IsEnum(['draft', 'active', 'expired', 'terminated'])
  status?: 'draft' | 'active' | 'expired' | 'terminated';

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citizenId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfResidents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsNotes?: string;
}

export class TerminateContractDto {
  @ApiProperty({ example: '2024-06-30', description: 'Contract termination date' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: 'Reason for termination' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ContractResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  apartmentId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: ['draft', 'active', 'expired', 'terminated'] })
  status: string;

  @ApiProperty()
  start_date: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  rentAmount: number;

  @ApiProperty()
  depositMonths: number;

  @ApiPropertyOptional()
  depositAmount?: number;

  @ApiPropertyOptional()
  citizenId?: string;

  @ApiPropertyOptional()
  numberOfResidents?: number;

  @ApiPropertyOptional()
  termsNotes?: string;

  // Payment tracking fields
  @ApiPropertyOptional({ enum: ContractTypeEnum })
  contractType?: ContractTypeEnum;

  @ApiPropertyOptional()
  purchasePrice?: number;

  @ApiPropertyOptional()
  downPayment?: number;

  @ApiPropertyOptional()
  transferDate?: Date;

  @ApiPropertyOptional()
  optionFee?: number;

  @ApiPropertyOptional()
  purchaseOptionPrice?: number;

  @ApiPropertyOptional()
  optionPeriodMonths?: number;

  @ApiPropertyOptional()
  rentCreditPercent?: number;

  @ApiPropertyOptional()
  paymentDueDay?: number;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Apartment info (when included)' })
  apartment?: {
    id: string;
    unit_number: string;
    floorIndex: number;
    buildingId: string;
    building?: {
      id: string;
      name: string;
    };
  };

  @ApiPropertyOptional({ description: 'Tenant info (when included)' })
  tenant?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

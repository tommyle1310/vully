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
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Additional terms and notes' })
  @IsOptional()
  @IsString()
  termsNotes?: string;
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
  termsNotes?: string;

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
  };

  @ApiPropertyOptional({ description: 'Tenant info (when included)' })
  tenant?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

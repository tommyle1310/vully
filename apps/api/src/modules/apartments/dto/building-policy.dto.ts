import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '@prisma/client';

export class CreateBuildingPolicyDto {
  @ApiPropertyOptional({ description: 'Default max residents (null = auto-calculate by area)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultMaxResidents?: number;

  @ApiProperty({ description: 'Default access card limit per apartment', default: 4 })
  @IsNumber()
  @Min(1)
  @Max(20)
  accessCardLimitDefault: number = 4;

  @ApiProperty({ description: 'Whether pets are allowed', default: false })
  @IsBoolean()
  petAllowed: boolean = false;

  @ApiProperty({ description: 'Default pet limit per apartment', default: 0 })
  @IsNumber()
  @Min(0)
  petLimitDefault: number = 0;

  @ApiProperty({ description: 'Default billing cycle', enum: BillingCycle, default: 'monthly' })
  @IsEnum(BillingCycle)
  defaultBillingCycle: BillingCycle = 'monthly';

  @ApiPropertyOptional({ description: 'Late fee rate percent (e.g., 5 for 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeeRatePercent?: number;

  @ApiProperty({ description: 'Late fee grace days', default: 7 })
  @IsNumber()
  @Min(0)
  lateFeeGraceDays: number = 7;

  @ApiPropertyOptional({ description: 'Trash collection days', example: ['monday', 'thursday'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trashCollectionDays?: string[];

  @ApiPropertyOptional({ description: 'Trash collection time window', example: '07:00-09:00' })
  @IsOptional()
  @IsString()
  trashCollectionTime?: string;

  @ApiPropertyOptional({ description: 'Trash fee per month (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  trashFeePerMonth?: number;

  @ApiProperty({ description: 'Effective date (policy starts from this date)' })
  @IsDateString()
  effectiveFrom: string;
}

export class UpdateBuildingPolicyDto extends PartialType(CreateBuildingPolicyDto) {}

export class BuildingPolicyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buildingId: string;

  @ApiPropertyOptional()
  defaultMaxResidents?: number | null;

  @ApiProperty()
  accessCardLimitDefault: number;

  @ApiProperty()
  petAllowed: boolean;

  @ApiProperty()
  petLimitDefault: number;

  @ApiProperty({ enum: BillingCycle })
  defaultBillingCycle: BillingCycle;

  @ApiPropertyOptional()
  lateFeeRatePercent?: number | null;

  @ApiProperty()
  lateFeeGraceDays: number;

  @ApiPropertyOptional()
  trashCollectionDays?: string[] | null;

  @ApiPropertyOptional()
  trashCollectionTime?: string | null;

  @ApiPropertyOptional()
  trashFeePerMonth?: number | null;

  @ApiProperty()
  effectiveFrom: string;

  @ApiPropertyOptional()
  effectiveTo?: string | null;

  @ApiProperty()
  isCurrent: boolean;

  @ApiPropertyOptional()
  createdBy?: string | null;

  @ApiProperty()
  createdAt: string;
}

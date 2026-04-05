import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { UNIT_TYPES, ORIENTATIONS, BILLING_CYCLES } from './apartment-constants';

export class ApartmentFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ 
    enum: ['vacant', 'occupied', 'maintenance', 'reserved'],
    description: 'Single status or array of statuses',
    isArray: true,
  })
  @IsOptional()
  status?: string | string[];

  @ApiPropertyOptional({ 
    enum: UNIT_TYPES, 
    description: 'Single unit type or array of unit types',
    isArray: true,
  })
  @IsOptional()
  unitType?: string | string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minBedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxBedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  minFloor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxFloor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxArea?: number;

  @ApiPropertyOptional({ enum: ORIENTATIONS })
  @IsOptional()
  @IsEnum(ORIENTATIONS)
  orientation?: typeof ORIENTATIONS[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ description: 'Search query for unit number' })
  @IsOptional()
  @IsString()
  search?: string;
}

// =====================
// Effective Config DTO - Policy Inheritance
// =====================

export class EffectiveValueDto<T = number | boolean | string> {
  @ApiProperty({ description: 'The effective value' })
  value: T;

  @ApiProperty({ description: 'Where the value comes from', enum: ['apartment', 'building', 'default'] })
  source: 'apartment' | 'building' | 'default';
}

export class ApartmentEffectiveConfigDto {
  @ApiProperty({ description: 'Apartment ID' })
  apartmentId: string;

  @ApiProperty({ description: 'Building ID' })
  buildingId: string;

  @ApiProperty({ description: 'Policy ID (if building has a current policy)' })
  policyId: string | null;

  @ApiProperty({ description: 'Effective max residents' })
  maxResidents: EffectiveValueDto<number>;

  @ApiProperty({ description: 'Effective access card limit' })
  accessCardLimit: EffectiveValueDto<number>;

  @ApiProperty({ description: 'Whether pets are allowed' })
  petAllowed: EffectiveValueDto<boolean>;

  @ApiProperty({ description: 'Effective pet limit' })
  petLimit: EffectiveValueDto<number>;

  @ApiProperty({ description: 'Effective billing cycle' })
  billingCycle: EffectiveValueDto<string>;

  @ApiPropertyOptional({ description: 'Late fee rate percent' })
  lateFeeRatePercent: number | null;

  @ApiPropertyOptional({ description: 'Late fee grace days' })
  lateFeeGraceDays: number | null;

  @ApiPropertyOptional({ description: 'Trash collection days' })
  trashCollectionDays: string[] | null;

  @ApiPropertyOptional({ description: 'Trash collection time window' })
  trashCollectionTime: string | null;

  @ApiPropertyOptional({ description: 'Trash fee per month (VND)' })
  trashFeePerMonth: number | null;
}

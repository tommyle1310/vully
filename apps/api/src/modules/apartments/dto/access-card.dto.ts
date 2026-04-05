import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
  ArrayNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import { AccessCardType, AccessCardStatus } from '@prisma/client';

// =====================
// Enums
// =====================

export enum DeactivationReason {
  lost = 'lost',
  stolen = 'stolen',
  resident_left = 'resident_left',
  admin_action = 'admin_action',
}

// =====================
// Request DTOs
// =====================

export class CreateAccessCardDto {
  @ApiPropertyOptional({ description: 'Physical card ID (auto-generated if not provided)', example: 'AC-2024-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cardNumber?: string;

  @ApiProperty({ description: 'Apartment UUID' })
  @IsUUID()
  apartmentId: string;

  @ApiPropertyOptional({ description: 'Optional holder (specific resident) UUID' })
  @IsOptional()
  @IsUUID()
  holderId?: string;

  @ApiProperty({ description: 'Card type', enum: AccessCardType })
  @IsEnum(AccessCardType)
  cardType: AccessCardType;

  @ApiPropertyOptional({
    description: 'Access zones (defaults to ["lobby", "elevator"])',
    example: ['lobby', 'elevator', 'gym'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessZones?: string[];

  @ApiPropertyOptional({
    description: 'Floor indices the card can access (defaults to all building floors)',
    example: [1, 2, 3, 15],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  floorAccess?: number[];

  @ApiPropertyOptional({ description: 'Expiry date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateAccessCardDto {
  @ApiPropertyOptional({
    description: 'Access zones',
    example: ['lobby', 'elevator', 'gym', 'pool'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessZones?: string[];

  @ApiPropertyOptional({
    description: 'Floor indices the card can access',
    example: [1, 12, 13, 14],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  floorAccess?: number[];

  @ApiPropertyOptional({ description: 'Expiry date (ISO 8601) or null to remove', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class DeactivateAccessCardDto {
  @ApiProperty({
    description: 'Deactivation reason',
    enum: DeactivationReason,
    example: DeactivationReason.lost,
  })
  @IsEnum(DeactivationReason)
  reason: DeactivationReason;

  @ApiPropertyOptional({ description: 'Additional notes about deactivation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AccessCardQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: AccessCardStatus })
  @IsOptional()
  @IsEnum(AccessCardStatus)
  status?: AccessCardStatus;

  @ApiPropertyOptional({ description: 'Filter by card type', enum: AccessCardType })
  @IsOptional()
  @IsEnum(AccessCardType)
  cardType?: AccessCardType;
}

// =====================
// Response DTOs
// =====================

export class AccessCardHolderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  email?: string;
}

export class AccessCardApartmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  unitNumber: string;

  @ApiPropertyOptional()
  buildingName?: string;
}

export class AccessCardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  cardNumber: string;

  @ApiProperty()
  apartmentId: string;

  @ApiPropertyOptional({ type: AccessCardApartmentDto })
  apartment?: AccessCardApartmentDto;

  @ApiPropertyOptional()
  holderId?: string | null;

  @ApiPropertyOptional({ type: AccessCardHolderDto })
  holder?: AccessCardHolderDto | null;

  @ApiProperty({ enum: AccessCardType })
  cardType: AccessCardType;

  @ApiProperty({ enum: AccessCardStatus })
  status: AccessCardStatus;

  @ApiProperty({ type: [String] })
  accessZones: string[];

  @ApiProperty({ type: [Number] })
  floorAccess: number[];

  @ApiProperty()
  issuedAt: string;

  @ApiPropertyOptional()
  expiresAt?: string | null;

  @ApiPropertyOptional()
  deactivatedAt?: string | null;

  @ApiPropertyOptional()
  deactivatedBy?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AccessCardListResponseDto {
  @ApiProperty({ type: [AccessCardResponseDto] })
  data: AccessCardResponseDto[];

  @ApiProperty({ description: 'Total count of cards' })
  total: number;

  @ApiProperty({ description: 'Active cards count' })
  activeCount: number;

  @ApiProperty({ description: 'Card limit for this apartment' })
  limit: number;
}

export class AccessCardStatsDto {
  @ApiProperty({ description: 'Total issued cards' })
  total: number;

  @ApiProperty({ description: 'Active cards' })
  active: number;

  @ApiProperty({ description: 'Lost cards' })
  lost: number;

  @ApiProperty({ description: 'Deactivated cards' })
  deactivated: number;

  @ApiProperty({ description: 'Expired cards' })
  expired: number;

  @ApiProperty({ description: 'Card limit for apartment' })
  limit: number;

  @ApiProperty({ description: 'Remaining slots available' })
  available: number;
}

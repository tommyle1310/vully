import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';
import { AccessCardType } from '@prisma/client';

export enum AccessCardRequestStatusDto {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

export class CreateAccessCardRequestDto {
  @ApiProperty({ description: 'Card type requested', enum: AccessCardType })
  @IsEnum(AccessCardType)
  cardType: AccessCardType;

  @ApiProperty({ description: 'Reason for requesting the card' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}

export class AccessCardRequestQueryDto {
  @ApiPropertyOptional({
    description: 'Filter requests by status',
    enum: AccessCardRequestStatusDto,
  })
  @IsOptional()
  @IsEnum(AccessCardRequestStatusDto)
  status?: AccessCardRequestStatusDto;
}

export class ApproveAccessCardRequestDto {
  @ApiPropertyOptional({
    description: 'Optional access zones for the issued card',
    example: ['lobby', 'elevator', 'gym'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessZones?: string[];

  @ApiPropertyOptional({
    description: 'Optional floor access for the issued card',
    example: [1, 2, 10],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  floorAccess?: number[];

  @ApiPropertyOptional({
    description: 'Optional expiry date for the issued card (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Optional note for approval decision' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;

  @ApiPropertyOptional({ description: 'Optional notes stored on the issued card' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cardNotes?: string;
}

export class RejectAccessCardRequestDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reviewNote: string;
}

export class AccessCardRequestUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiPropertyOptional()
  email?: string;
}

export class AccessCardRequestApartmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  unitNumber: string;

  @ApiPropertyOptional()
  buildingName?: string;
}

export class AccessCardRequestIssuedCardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  cardNumber: string;
}

export class AccessCardRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  apartmentId: string;

  @ApiProperty()
  requestedBy: string;

  @ApiProperty({ enum: AccessCardType })
  cardType: AccessCardType;

  @ApiProperty()
  reason: string;

  @ApiProperty({ enum: AccessCardRequestStatusDto })
  status: AccessCardRequestStatusDto;

  @ApiPropertyOptional()
  reviewedBy?: string | null;

  @ApiPropertyOptional()
  reviewedAt?: string | null;

  @ApiPropertyOptional()
  reviewNote?: string | null;

  @ApiPropertyOptional()
  issuedCardId?: string | null;

  @ApiPropertyOptional({ type: AccessCardRequestApartmentDto })
  apartment?: AccessCardRequestApartmentDto;

  @ApiPropertyOptional({ type: AccessCardRequestUserDto })
  requester?: AccessCardRequestUserDto;

  @ApiPropertyOptional({ type: AccessCardRequestUserDto })
  reviewer?: AccessCardRequestUserDto | null;

  @ApiPropertyOptional({ type: AccessCardRequestIssuedCardDto })
  issuedCard?: AccessCardRequestIssuedCardDto | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AccessCardRequestListResponseDto {
  @ApiProperty({ type: [AccessCardRequestResponseDto] })
  data: AccessCardRequestResponseDto[];

  @ApiProperty()
  total: number;
}

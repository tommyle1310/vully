import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ParkingType, ParkingSlotStatus } from '@prisma/client';

// =====================
// Parking Zone DTOs
// =====================

export class CreateParkingZoneDto {
  @ApiProperty({ description: 'Zone name', example: 'Basement 1 - Zone A' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Zone code', example: 'B1-A' })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ description: 'Type of parking slots', enum: ParkingType })
  @IsEnum(ParkingType)
  slotType: ParkingType;

  @ApiProperty({ description: 'Total number of slots in zone' })
  @IsNumber()
  @Min(1)
  totalSlots: number;

  @ApiPropertyOptional({ description: 'Monthly fee per slot (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feePerMonth?: number;
}

export class UpdateParkingZoneDto extends PartialType(CreateParkingZoneDto) {
  @ApiPropertyOptional({ description: 'Whether zone is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ParkingZoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buildingId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ enum: ParkingType })
  slotType: ParkingType;

  @ApiProperty()
  totalSlots: number;

  @ApiPropertyOptional()
  feePerMonth?: number | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({ description: 'Number of available slots' })
  availableSlots?: number;

  @ApiPropertyOptional({ description: 'Number of assigned slots' })
  assignedSlots?: number;
}

// =====================
// Parking Slot DTOs
// =====================

export class CreateParkingSlotsDto {
  @ApiProperty({ description: 'Number of slots to create' })
  @IsNumber()
  @Min(1)
  @Max(500)
  count: number;

  @ApiPropertyOptional({ description: 'Starting slot number (default: auto-increment)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  startNumber?: number;
}

export class UpdateParkingSlotDto {
  @ApiPropertyOptional({ description: 'Slot status', enum: ParkingSlotStatus })
  @IsOptional()
  @IsEnum(ParkingSlotStatus)
  status?: ParkingSlotStatus;

  @ApiPropertyOptional({ description: 'Override fee for this specific slot (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeOverride?: number | null;

  @ApiPropertyOptional({ description: 'Notes about the slot' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AssignSlotDto {
  @ApiProperty({ description: 'Apartment ID to assign the slot to' })
  @IsUUID()
  apartmentId: string;
}

export class ParkingSlotResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  zoneId: string;

  @ApiProperty()
  slotNumber: string;

  @ApiProperty({ description: 'Full code including zone', example: 'B1-A-023' })
  fullCode: string;

  @ApiPropertyOptional()
  assignedAptId?: string | null;

  @ApiPropertyOptional({ description: 'Apartment unit code if assigned' })
  assignedAptCode?: string | null;

  @ApiPropertyOptional()
  assignedAt?: string | null;

  @ApiPropertyOptional()
  feeOverride?: number | null;

  @ApiProperty({ enum: ParkingSlotStatus })
  status: ParkingSlotStatus;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Effective monthly fee (override or zone default)' })
  effectiveFee?: number | null;
}

// =====================
// Stats DTOs
// =====================

export class ParkingStatsDto {
  @ApiProperty({ description: 'Total parking zones' })
  totalZones: number;

  @ApiProperty({ description: 'Total parking slots' })
  totalSlots: number;

  @ApiProperty({ description: 'Available slots' })
  availableSlots: number;

  @ApiProperty({ description: 'Assigned slots' })
  assignedSlots: number;

  @ApiProperty({ description: 'Reserved slots' })
  reservedSlots: number;

  @ApiProperty({ description: 'Maintenance slots' })
  maintenanceSlots: number;

  @ApiProperty({ description: 'Breakdown by slot type' })
  byType: {
    car: { total: number; available: number; assigned: number };
    motorcycle: { total: number; available: number; assigned: number };
    bicycle: { total: number; available: number; assigned: number };
  };
}

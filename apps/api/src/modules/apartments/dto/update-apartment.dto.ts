import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { OWNERSHIP_TYPES, ORIENTATIONS, BILLING_CYCLES, SYNC_STATUSES } from './apartment-constants';
import { CreateApartmentDto } from './create-apartment.dto';

export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {
  @ApiPropertyOptional({
    enum: ['vacant', 'occupied', 'maintenance', 'reserved'],
    description: 'Apartment status',
  })
  @IsOptional()
  @IsEnum(['vacant', 'occupied', 'maintenance', 'reserved'])
  status?: 'vacant' | 'occupied' | 'maintenance' | 'reserved';

  // --- Ownership & Legal ---
  @ApiPropertyOptional({ description: 'Owner user ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ enum: OWNERSHIP_TYPES })
  @IsOptional()
  @IsEnum(OWNERSHIP_TYPES)
  ownershipType?: typeof OWNERSHIP_TYPES[number];

  @ApiPropertyOptional({ description: 'Sổ hồng certificate number (admin only)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pinkBookId?: string;

  @ApiPropertyOptional({ description: 'Developer handover date' })
  @IsOptional()
  @IsDateString()
  handoverDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date' })
  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Whether the unit is currently rented' })
  @IsOptional()
  @IsBoolean()
  isRented?: boolean;

  @ApiPropertyOptional({ example: 10.0, description: 'VAT rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  // --- Occupancy ---
  @ApiPropertyOptional({ description: 'Maximum residents allowed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxResidents?: number;

  @ApiPropertyOptional({ description: 'Current resident count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentResidentCount?: number;

  @ApiPropertyOptional({ description: 'Whether pets are allowed' })
  @IsOptional()
  @IsBoolean()
  petAllowed?: boolean;

  @ApiPropertyOptional({ description: 'Maximum pets allowed' })
  @IsOptional()
  @IsInt()
  @Min(0)
  petLimit?: number;

  @ApiPropertyOptional({ description: 'Max access cards for this unit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  accessCardLimit?: number;

  @ApiPropertyOptional({ example: '1205', description: 'Intercom/doorbell code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  intercomCode?: string;

  // --- Utility & Technical ---
  @ApiPropertyOptional({ description: 'Electric meter serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  electricMeterId?: string;

  @ApiPropertyOptional({ description: 'Water meter serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  waterMeterId?: string;

  @ApiPropertyOptional({ description: 'Gas meter serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gasMeterId?: string;

  @ApiPropertyOptional({ description: 'Max amperage for circuit breaker' })
  @IsOptional()
  @IsInt()
  @Min(0)
  powerCapacity?: number;

  @ApiPropertyOptional({ description: 'Number of AC connection points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  acUnitCount?: number;

  @ApiPropertyOptional({ description: 'Fire/smoke detector hardware ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fireDetectorId?: string;

  @ApiPropertyOptional({ description: 'Number of sprinkler heads' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sprinklerCount?: number;

  @ApiPropertyOptional({ description: 'Internet terminal location description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  internetTerminalLoc?: string;

  // --- Parking & Assets ---
  @ApiPropertyOptional({ example: 'B1-A-023', description: 'Assigned car parking slot' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  assignedCarSlot?: string;

  @ApiPropertyOptional({ description: 'Assigned motorbike parking slot' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  assignedMotoSlot?: string;

  @ApiPropertyOptional({ description: 'Mailbox number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mailboxNumber?: string;

  @ApiPropertyOptional({ description: 'Storage unit/locker ID' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  storageUnitId?: string;

  // --- Billing Config ---
  @ApiPropertyOptional({ description: 'Management fee config ID' })
  @IsOptional()
  @IsUUID()
  mgmtFeeConfigId?: string;

  @ApiPropertyOptional({ description: 'Date billing starts for this unit' })
  @IsOptional()
  @IsDateString()
  billingStartDate?: string;

  @ApiPropertyOptional({ enum: BILLING_CYCLES })
  @IsOptional()
  @IsEnum(BILLING_CYCLES)
  billingCycle?: typeof BILLING_CYCLES[number];

  @ApiPropertyOptional({ description: 'Virtual bank account for payment matching' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  bankAccountVirtual?: string;

  @ApiPropertyOptional({ description: 'Whether late fees are waived' })
  @IsOptional()
  @IsBoolean()
  lateFeeWaived?: boolean;

  // --- System Logic ---
  @ApiPropertyOptional({ description: 'Parent unit ID for merged units' })
  @IsOptional()
  @IsUUID()
  parentUnitId?: string;

  @ApiPropertyOptional({ description: 'Whether this unit is merged into parent' })
  @IsOptional()
  @IsBoolean()
  isMerged?: boolean;

  @ApiPropertyOptional({ enum: SYNC_STATUSES })
  @IsOptional()
  @IsEnum(SYNC_STATUSES)
  syncStatus?: typeof SYNC_STATUSES[number];

  @ApiPropertyOptional({ description: 'Whether portal access is enabled' })
  @IsOptional()
  @IsBoolean()
  portalAccessEnabled?: boolean;

  @ApiPropertyOptional({ description: 'URL to technical drawing PDF/image' })
  @IsOptional()
  @IsUrl()
  technicalDrawingUrl?: string;

  @ApiPropertyOptional({ description: 'Admin-only private notes' })
  @IsOptional()
  @IsString()
  notesAdmin?: string;

  // --- Policy Override Fields ---
  @ApiPropertyOptional({ description: 'Override max residents (null to inherit from building)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxResidentsOverride?: number | null;

  @ApiPropertyOptional({ description: 'Override access card limit (null to inherit from building)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  accessCardLimitOverride?: number | null;

  @ApiPropertyOptional({ description: 'Override pet allowed (null to inherit from building)' })
  @IsOptional()
  @IsBoolean()
  petAllowedOverride?: boolean | null;

  @ApiPropertyOptional({ description: 'Override pet limit (null to inherit from building)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  petLimitOverride?: number | null;

  @ApiPropertyOptional({ enum: BILLING_CYCLES, description: 'Override billing cycle (null to inherit from building)' })
  @IsOptional()
  @IsEnum(BILLING_CYCLES)
  billingCycleOverride?: typeof BILLING_CYCLES[number] | null;
}

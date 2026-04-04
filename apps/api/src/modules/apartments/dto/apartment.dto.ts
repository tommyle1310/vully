import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
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
  IsObject,
  IsDateString,
  IsUrl,
} from 'class-validator';

const UNIT_TYPES = ['studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse'] as const;
const OWNERSHIP_TYPES = ['permanent', 'fifty_year', 'leasehold'] as const;
const ORIENTATIONS = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] as const;
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
const SYNC_STATUSES = ['synced', 'pending', 'error', 'disconnected'] as const;

export class CreateApartmentDto {
  @ApiProperty({ description: 'Building ID' })
  @IsUUID()
  buildingId: string;

  @ApiProperty({ example: 'A-1201' })
  @IsString()
  @MaxLength(20)
  unit_number: string;

  @ApiProperty({ example: 12, description: 'Zero-based floor index for 3D positioning' })
  @IsInt()
  @Min(0)
  floorIndex: number;

  // --- Spatial ---
  @ApiPropertyOptional({ example: 'A-12.05', description: 'Human-readable apartment code' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  apartmentCode?: string;

  @ApiPropertyOptional({ example: '12A', description: 'Display name for the floor' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  floorLabel?: string;

  @ApiPropertyOptional({ enum: UNIT_TYPES, description: 'Unit type classification' })
  @IsOptional()
  @IsEnum(UNIT_TYPES)
  unitType?: typeof UNIT_TYPES[number];

  @ApiPropertyOptional({ example: 65.5, description: 'Net area (thông thủy) in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  netArea?: number;

  @ApiPropertyOptional({ example: 75.5, description: 'Gross area (tim tường) in m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  grossArea?: number;

  @ApiPropertyOptional({ example: 3.2, description: 'Ceiling height in meters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ceilingHeight?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedroomCount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathroomCount?: number;

  @ApiPropertyOptional({ description: 'Additional features as JSON' })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'SVG element ID for map highlighting' })
  @IsOptional()
  @IsString()
  svgElementId?: string;

  @ApiPropertyOptional({ description: 'Raw SVG path data for programmatic floor plans' })
  @IsOptional()
  @IsString()
  svgPathData?: string;

  @ApiPropertyOptional({ description: 'Centroid X in SVG space' })
  @IsOptional()
  @IsNumber()
  centroidX?: number;

  @ApiPropertyOptional({ description: 'Centroid Y in SVG space' })
  @IsOptional()
  @IsNumber()
  centroidY?: number;

  @ApiPropertyOptional({ enum: ORIENTATIONS, description: 'Main facing direction' })
  @IsOptional()
  @IsEnum(ORIENTATIONS)
  orientation?: typeof ORIENTATIONS[number];

  @ApiPropertyOptional({ enum: ORIENTATIONS, description: 'Balcony facing direction' })
  @IsOptional()
  @IsEnum(ORIENTATIONS)
  balconyDirection?: typeof ORIENTATIONS[number];

  @ApiPropertyOptional({ description: 'Whether this is a corner unit' })
  @IsOptional()
  @IsBoolean()
  isCornerUnit?: boolean;
}

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

export class ApartmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  buildingId!: string;

  @ApiProperty()
  unit_number!: string;

  @ApiProperty()
  floorIndex!: number;

  @ApiProperty({ enum: ['vacant', 'occupied', 'maintenance', 'reserved'] })
  status!: string;

  @ApiPropertyOptional()
  apartmentCode?: string | null;

  @ApiPropertyOptional()
  floorLabel?: string | null;

  @ApiPropertyOptional({ enum: UNIT_TYPES })
  unitType?: string | null;

  @ApiPropertyOptional()
  netArea?: number | null;

  @ApiPropertyOptional()
  grossArea?: number | null;

  @ApiPropertyOptional()
  ceilingHeight?: number | null;

  @ApiProperty()
  bedroomCount!: number;

  @ApiProperty()
  bathroomCount!: number;

  @ApiProperty()
  features!: Record<string, unknown>;

  @ApiPropertyOptional()
  svgElementId?: string | null;

  @ApiPropertyOptional()
  svgPathData?: string | null;

  @ApiPropertyOptional()
  centroidX?: number | null;

  @ApiPropertyOptional()
  centroidY?: number | null;

  @ApiPropertyOptional({ enum: ORIENTATIONS })
  orientation?: string | null;

  @ApiPropertyOptional({ enum: ORIENTATIONS })
  balconyDirection?: string | null;

  @ApiProperty()
  isCornerUnit!: boolean;

  // Ownership (admin-only fields like pinkBookId excluded by service)
  @ApiPropertyOptional()
  ownerId?: string | null;

  @ApiPropertyOptional({ enum: OWNERSHIP_TYPES })
  ownershipType?: string | null;

  @ApiPropertyOptional()
  handoverDate?: string | null;

  @ApiPropertyOptional()
  warrantyExpiryDate?: string | null;

  @ApiProperty()
  isRented!: boolean;

  @ApiPropertyOptional()
  vatRate?: number | null;

  // Occupancy
  @ApiPropertyOptional()
  maxResidents?: number | null;

  @ApiProperty()
  currentResidentCount!: number;

  @ApiPropertyOptional()
  petAllowed?: boolean | null;

  @ApiPropertyOptional()
  petLimit?: number | null;

  @ApiPropertyOptional()
  accessCardLimit?: number | null;

  @ApiPropertyOptional()
  intercomCode?: string | null;

  // Utility & Technical
  @ApiPropertyOptional()
  electricMeterId?: string | null;

  @ApiPropertyOptional()
  waterMeterId?: string | null;

  @ApiPropertyOptional()
  gasMeterId?: string | null;

  @ApiPropertyOptional()
  powerCapacity?: number | null;

  @ApiPropertyOptional()
  acUnitCount?: number | null;

  @ApiPropertyOptional()
  fireDetectorId?: string | null;

  @ApiPropertyOptional()
  sprinklerCount?: number | null;

  @ApiPropertyOptional()
  internetTerminalLoc?: string | null;

  // Parking & Assets
  @ApiPropertyOptional()
  assignedCarSlot?: string | null;

  @ApiPropertyOptional()
  assignedMotoSlot?: string | null;

  @ApiPropertyOptional()
  mailboxNumber?: string | null;

  @ApiPropertyOptional()
  storageUnitId?: string | null;

  // Billing Config
  @ApiPropertyOptional()
  mgmtFeeConfigId?: string | null;

  @ApiPropertyOptional()
  billingStartDate?: string | null;

  @ApiProperty({ enum: BILLING_CYCLES })
  billingCycle!: string;

  @ApiPropertyOptional()
  bankAccountVirtual?: string | null;

  @ApiProperty()
  lateFeeWaived!: boolean;

  // System Logic
  @ApiPropertyOptional()
  parentUnitId?: string | null;

  @ApiProperty()
  isMerged!: boolean;

  @ApiProperty({ enum: SYNC_STATUSES })
  syncStatus!: string;

  @ApiProperty()
  portalAccessEnabled!: boolean;

  @ApiPropertyOptional()
  technicalDrawingUrl?: string | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Building info (when included)' })
  building?: {
    id: string;
    name: string;
    address: string;
  };

  @ApiPropertyOptional({ description: 'Owner info (when included)' })
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;

  @ApiPropertyOptional({ description: 'Active contract with tenant info (when included)' })
  activeContract?: {
    id: string;
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    monthlyRent: number;
    startDate: string;
    endDate?: string | null;
    status: string;
  } | null;
}

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UNIT_TYPES, OWNERSHIP_TYPES, ORIENTATIONS, BILLING_CYCLES, SYNC_STATUSES } from './apartment-constants';

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

  // --- SVG & Spatial ---
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

  // --- Ownership & Legal ---
  // (admin-only fields like pinkBookId excluded by service)
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

  // --- Occupancy ---
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

  // --- Utility & Technical ---
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

  // --- Parking & Assets ---
  @ApiPropertyOptional()
  assignedCarSlot?: string | null;

  @ApiPropertyOptional()
  assignedMotoSlot?: string | null;

  @ApiPropertyOptional()
  mailboxNumber?: string | null;

  @ApiPropertyOptional()
  storageUnitId?: string | null;

  // --- Billing Config ---
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

  // --- System Logic ---
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

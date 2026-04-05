export interface Apartment {
  id: string;
  buildingId: string;
  unit_number: string;
  floorIndex: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';

  // Spatial
  apartmentCode?: string | null;
  floorLabel?: string | null;
  unitType?: string | null;
  netArea?: number | null;
  grossArea?: number | null;
  ceilingHeight?: number | null;
  bedroomCount: number;
  bathroomCount: number;
  features: Record<string, unknown>;
  svgElementId?: string | null;
  svgPathData?: string | null;
  centroidX?: number | null;
  centroidY?: number | null;
  orientation?: string | null;
  balconyDirection?: string | null;
  isCornerUnit: boolean;

  // Ownership & Legal
  ownerId?: string | null;
  ownershipType?: string | null;
  handoverDate?: string | null;
  warrantyExpiryDate?: string | null;
  isRented: boolean;
  vatRate?: number | null;

  // Occupancy
  maxResidents?: number | null;
  currentResidentCount: number;
  petAllowed?: boolean | null;
  petLimit?: number | null;
  accessCardLimit?: number | null;
  intercomCode?: string | null;

  // Utility & Technical
  electricMeterId?: string | null;
  waterMeterId?: string | null;
  gasMeterId?: string | null;
  powerCapacity?: number | null;
  acUnitCount?: number | null;
  fireDetectorId?: string | null;
  sprinklerCount?: number | null;
  internetTerminalLoc?: string | null;

  // Parking & Assets
  assignedCarSlot?: string | null;
  assignedMotoSlot?: string | null;
  mailboxNumber?: string | null;
  storageUnitId?: string | null;

  // Billing Config
  mgmtFeeConfigId?: string | null;
  billingStartDate?: string | null;
  billingCycle: string;
  bankAccountVirtual?: string | null;
  lateFeeWaived: boolean;

  // System Logic
  parentUnitId?: string | null;
  isMerged: boolean;
  syncStatus: string;
  portalAccessEnabled: boolean;
  technicalDrawingUrl?: string | null;
  notesAdmin?: string | null;

  // Relations & Meta
  building?: {
    id: string;
    name: string;
    address: string;
  };
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
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
  created_at: string;
  updatedAt: string;
}

export interface ApartmentFilters {
  buildingId?: string;
  status?: string | string[];
  unitType?: string | string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minFloor?: number;
  maxFloor?: number;
  minArea?: number;
  maxArea?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApartmentsResponse {
  data: Apartment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApartmentResponse {
  data: Apartment;
}

export interface CreateApartmentInput {
  buildingId: string;
  unit_number: string;
  floorIndex: number;
  apartmentCode?: string;
  floorLabel?: string;
  unitType?: string;
  netArea?: number;
  grossArea?: number;
  ceilingHeight?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  orientation?: string;
  balconyDirection?: string;
  isCornerUnit?: boolean;
  features?: Record<string, unknown>;
  svgElementId?: string;
}

export interface UpdateApartmentInput {
  buildingId?: string;
  unit_number?: string;
  floorIndex?: number;
  apartmentCode?: string;
  floorLabel?: string;
  unitType?: string;
  netArea?: number;
  grossArea?: number;
  ceilingHeight?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  orientation?: string;
  balconyDirection?: string;
  isCornerUnit?: boolean;
  features?: Record<string, unknown>;
  status?: string;
  ownerId?: string | null;
  ownershipType?: string | null;
  handoverDate?: string | null;
  warrantyExpiryDate?: string | null;
  isRented?: boolean;
  vatRate?: number | null;
  maxResidents?: number | null;
  currentResidentCount?: number;
  petAllowed?: boolean | null;
  petLimit?: number | null;
  accessCardLimit?: number | null;
  intercomCode?: string | null;
  electricMeterId?: string | null;
  waterMeterId?: string | null;
  gasMeterId?: string | null;
  powerCapacity?: number | null;
  acUnitCount?: number | null;
  fireDetectorId?: string | null;
  sprinklerCount?: number | null;
  internetTerminalLoc?: string | null;
  assignedCarSlot?: string | null;
  assignedMotoSlot?: string | null;
  mailboxNumber?: string | null;
  storageUnitId?: string | null;
  mgmtFeeConfigId?: string | null;
  billingStartDate?: string | null;
  billingCycle?: string;
  bankAccountVirtual?: string | null;
  lateFeeWaived?: boolean;
  parentUnitId?: string | null;
  isMerged?: boolean;
  syncStatus?: string;
  portalAccessEnabled?: boolean;
  technicalDrawingUrl?: string | null;
  notesAdmin?: string | null;
}

// Building type for the apartments dropdown
export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  floorCount: number;
  isActive: boolean;
  created_at: string;
  updatedAt: string;
}

export interface BuildingsResponse {
  data: Building[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// Effective Config (Policy Inheritance)
export interface EffectiveValue<T> {
  value: T;
  source: 'apartment' | 'building' | 'default';
  overrideValue?: T | null;
  buildingPolicyValue?: T | null;
}

export interface ApartmentEffectiveConfig {
  maxResidents: EffectiveValue<number | null>;
  accessCardLimit: EffectiveValue<number | null>;
  petAllowed: EffectiveValue<boolean | null>;
  petLimit: EffectiveValue<number | null>;
  billingCycle: EffectiveValue<string>;
}

export interface EffectiveConfigResponse {
  data: ApartmentEffectiveConfig;
}

// Parking Slots
export interface ApartmentParkingSlot {
  id: string;
  zoneId: string;
  slotNumber: string;
  fullCode: string;
  type: 'car' | 'motorcycle' | 'bicycle';
  monthlyFee: number;
  zone: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ApartmentParkingSlotsResponse {
  data: ApartmentParkingSlot[];
}

import { z } from 'zod';

export const UNIT_TYPES = ['studio', 'one_bedroom', 'two_bedroom', 'three_bedroom', 'duplex', 'penthouse', 'shophouse'] as const;
export const ORIENTATIONS = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'] as const;
export const OWNERSHIP_TYPES = ['permanent', 'fifty_year', 'leasehold'] as const;
export const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly'] as const;
export const SYNC_STATUSES = ['synced', 'pending', 'error', 'disconnected'] as const;

export const UNIT_TYPE_LABELS: Record<string, string> = {
  studio: 'Studio',
  one_bedroom: '1 Bedroom',
  two_bedroom: '2 Bedrooms',
  three_bedroom: '3 Bedrooms',
  duplex: 'Duplex',
  penthouse: 'Penthouse',
  shophouse: 'Shophouse',
};

export const ORIENTATION_LABELS: Record<string, string> = {
  north: 'North', south: 'South', east: 'East', west: 'West',
  northeast: 'Northeast', northwest: 'Northwest', southeast: 'Southeast', southwest: 'Southwest',
};

const optNum = (min = 0) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(min).optional());
const optInt = (min = 0) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().min(min).optional());

export const apartmentFormSchema = z.object({
  buildingId: z.string().uuid('Please select a building'),
  unit_number: z.string().min(1, 'Unit number is required').max(20),
  floorIndex: z.coerce.number().int().min(0, 'Floor must be 0 or higher'),
  apartmentCode: z.string().max(30).optional().or(z.literal('')),
  floorLabel: z.string().max(10).optional().or(z.literal('')),
  unitType: z.enum(UNIT_TYPES).optional(),
  netArea: optNum(),
  grossArea: optNum(),
  ceilingHeight: optNum(),
  bedroomCount: z.coerce.number().int().min(0).optional(),
  bathroomCount: z.coerce.number().int().min(0).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
  balconyDirection: z.enum(ORIENTATIONS).optional(),
  isCornerUnit: z.boolean().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance', 'reserved']).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  handoverDate: z.string().optional().or(z.literal('')),
  warrantyExpiryDate: z.string().optional().or(z.literal('')),
  isRented: z.boolean().optional(),
  vatRate: optNum(),
  maxResidents: optInt(),
  currentResidentCount: z.coerce.number().int().min(0).optional(),
  petAllowed: z.boolean().optional(),
  petLimit: optInt(),
  accessCardLimit: optInt(),
  intercomCode: z.string().max(20).optional().or(z.literal('')),
  electricMeterId: z.string().max(50).optional().or(z.literal('')),
  waterMeterId: z.string().max(50).optional().or(z.literal('')),
  gasMeterId: z.string().max(50).optional().or(z.literal('')),
  powerCapacity: optInt(),
  acUnitCount: optInt(),
  fireDetectorId: z.string().max(50).optional().or(z.literal('')),
  sprinklerCount: optInt(),
  internetTerminalLoc: z.string().max(255).optional().or(z.literal('')),
  assignedCarSlot: z.string().max(30).optional().or(z.literal('')),
  assignedMotoSlot: z.string().max(30).optional().or(z.literal('')),
  mailboxNumber: z.string().max(20).optional().or(z.literal('')),
  storageUnitId: z.string().max(30).optional().or(z.literal('')),
  billingStartDate: z.string().optional().or(z.literal('')),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  bankAccountVirtual: z.string().max(30).optional().or(z.literal('')),
  lateFeeWaived: z.boolean().optional(),
  isMerged: z.boolean().optional(),
  syncStatus: z.enum(SYNC_STATUSES).optional(),
  portalAccessEnabled: z.boolean().optional(),
  notesAdmin: z.string().optional().or(z.literal('')),
  maxResidentsOverride: z.boolean().optional(),
  accessCardLimitOverride: z.boolean().optional(),
  petAllowedOverride: z.boolean().optional(),
  billingCycleOverride: z.boolean().optional(),
});

export type ApartmentFormValues = z.infer<typeof apartmentFormSchema>;

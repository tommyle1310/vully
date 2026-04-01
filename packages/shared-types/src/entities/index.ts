/**
 * Entity Schemas for Vully Platform
 * Zod schemas matching Prisma models for runtime validation
 */

import { z } from 'zod';
import {
  UserRoleSchema,
  ApartmentStatusSchema,
  ContractStatusSchema,
  InvoiceStatusSchema,
  IncidentCategorySchema,
  IncidentStatusSchema,
  IncidentPrioritySchema,
  UnitTypeSchema,
  OwnershipTypeSchema,
  OrientationSchema,
  BillingCycleSchema,
  SyncStatusSchema,
} from '../enums';

// =============================================================================
// Base Schemas (common fields)
// =============================================================================

export const UUIDSchema = z.string().uuid();
export const EmailSchema = z.string().email().max(255);
export const PhoneSchema = z.string().max(20).optional();
export const TimestampSchema = z.string().datetime();

// =============================================================================
// User Entity
// =============================================================================

export const UserBaseSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  role: UserRoleSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: PhoneSchema,
  profileData: z.record(z.unknown()).optional(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const UserSchema = UserBaseSchema;
export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8).max(100),
  role: UserRoleSchema.optional().default('resident'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: PhoneSchema,
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// =============================================================================
// Building Entity
// =============================================================================

export const BuildingSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1).max(100),
  floorCount: z.number().int().positive(),
  svgMapData: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Building = z.infer<typeof BuildingSchema>;

export const CreateBuildingSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1).max(100),
  floorCount: z.number().int().positive(),
  amenities: z.array(z.string()).optional(),
});
export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>;

// =============================================================================
// Apartment Entity
// =============================================================================

export const ApartmentSchema = z.object({
  id: UUIDSchema,
  // Architectural & Spatial
  apartmentCode: z.string().max(30).nullable().optional(),
  buildingId: UUIDSchema,
  floorIndex: z.number().int().nonnegative(),
  floorLabel: z.string().max(10).nullable().optional(),
  unitNumber: z.string().min(1).max(20),
  unitType: UnitTypeSchema.nullable().optional(),
  netArea: z.number().positive().nullable().optional(),
  grossArea: z.number().positive().nullable().optional(),
  ceilingHeight: z.number().positive().nullable().optional(),
  svgPathData: z.string().nullable().optional(),
  svgElementId: z.string().nullable().optional(),
  centroidX: z.number().nullable().optional(),
  centroidY: z.number().nullable().optional(),
  orientation: OrientationSchema.nullable().optional(),
  balconyDirection: OrientationSchema.nullable().optional(),
  isCornerUnit: z.boolean(),
  // Ownership & Legal
  ownerId: UUIDSchema.nullable().optional(),
  ownershipType: OwnershipTypeSchema.nullable().optional(),
  pinkBookId: z.string().max(50).nullable().optional(),
  handoverDate: z.string().nullable().optional(),
  warrantyExpiryDate: z.string().nullable().optional(),
  isRented: z.boolean(),
  vatRate: z.number().nullable().optional(),
  // Occupancy
  maxResidents: z.number().int().positive().nullable().optional(),
  currentResidentCount: z.number().int().nonnegative(),
  petAllowed: z.boolean().nullable().optional(),
  petLimit: z.number().int().nonnegative().nullable().optional(),
  accessCardLimit: z.number().int().positive().nullable().optional(),
  intercomCode: z.string().max(20).nullable().optional(),
  // Utility & Technical
  electricMeterId: z.string().max(50).nullable().optional(),
  waterMeterId: z.string().max(50).nullable().optional(),
  gasMeterId: z.string().max(50).nullable().optional(),
  powerCapacity: z.number().int().positive().nullable().optional(),
  acUnitCount: z.number().int().nonnegative().nullable().optional(),
  fireDetectorId: z.string().max(50).nullable().optional(),
  sprinklerCount: z.number().int().nonnegative().nullable().optional(),
  internetTerminalLoc: z.string().max(255).nullable().optional(),
  // Parking & Assets
  assignedCarSlot: z.string().max(30).nullable().optional(),
  assignedMotoSlot: z.string().max(30).nullable().optional(),
  mailboxNumber: z.string().max(20).nullable().optional(),
  storageUnitId: z.string().max(30).nullable().optional(),
  // Billing Config
  mgmtFeeConfigId: UUIDSchema.nullable().optional(),
  billingStartDate: z.string().nullable().optional(),
  billingCycle: BillingCycleSchema,
  bankAccountVirtual: z.string().max(30).nullable().optional(),
  lateFeeWaived: z.boolean(),
  // System Logic
  parentUnitId: UUIDSchema.nullable().optional(),
  isMerged: z.boolean(),
  syncStatus: SyncStatusSchema,
  portalAccessEnabled: z.boolean(),
  technicalDrawingUrl: z.string().url().nullable().optional(),
  notesAdmin: z.string().nullable().optional(),
  // Existing
  status: ApartmentStatusSchema,
  bedroomCount: z.number().int().nonnegative(),
  bathroomCount: z.number().int().nonnegative(),
  features: z.record(z.unknown()).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Apartment = z.infer<typeof ApartmentSchema>;

export const CreateApartmentSchema = z.object({
  buildingId: UUIDSchema,
  unitNumber: z.string().min(1).max(20),
  floorIndex: z.number().int().nonnegative(),
  apartmentCode: z.string().max(30).optional(),
  floorLabel: z.string().max(10).optional(),
  unitType: UnitTypeSchema.optional(),
  netArea: z.number().positive().optional(),
  grossArea: z.number().positive().optional(),
  ceilingHeight: z.number().positive().optional(),
  svgElementId: z.string().optional(),
  svgPathData: z.string().optional(),
  centroidX: z.number().optional(),
  centroidY: z.number().optional(),
  orientation: OrientationSchema.optional(),
  balconyDirection: OrientationSchema.optional(),
  isCornerUnit: z.boolean().optional(),
  bedroomCount: z.number().int().nonnegative().optional().default(1),
  bathroomCount: z.number().int().nonnegative().optional().default(1),
  features: z.record(z.unknown()).optional(),
});
export type CreateApartmentInput = z.infer<typeof CreateApartmentSchema>;

// =============================================================================
// ManagementFeeConfig Entity
// =============================================================================

export const ManagementFeeConfigSchema = z.object({
  id: UUIDSchema,
  buildingId: UUIDSchema,
  unitType: UnitTypeSchema.nullable().optional(),
  pricePerSqm: z.number().positive(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  createdAt: TimestampSchema,
});
export type ManagementFeeConfig = z.infer<typeof ManagementFeeConfigSchema>;

// =============================================================================
// Contract Entity
// =============================================================================

export const ContractSchema = z.object({
  id: UUIDSchema,
  apartmentId: UUIDSchema,
  tenantId: UUIDSchema,
  status: ContractStatusSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rentAmount: z.number().positive(),
  depositMonths: z.number().int().nonnegative(),
  depositAmount: z.number().nonnegative().optional(),
  termsNotes: z.string().optional(),
  createdBy: UUIDSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Contract = z.infer<typeof ContractSchema>;

export const CreateContractSchema = z.object({
  apartmentId: UUIDSchema,
  tenantId: UUIDSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rentAmount: z.number().positive(),
  depositMonths: z.number().int().nonnegative().optional().default(2),
  termsNotes: z.string().optional(),
});
export type CreateContractInput = z.infer<typeof CreateContractSchema>;

// =============================================================================
// Invoice Entity
// =============================================================================

export const InvoiceLineItemSchema = z.object({
  id: UUIDSchema,
  invoiceId: UUIDSchema,
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  utilityTypeId: UUIDSchema.optional(),
  meterReadingId: UUIDSchema.optional(),
  tierBreakdown: z.array(z.object({
    tier: z.number().int().positive(),
    usage: z.number().nonnegative(),
    unitPrice: z.number().nonnegative(),
    amount: z.number().nonnegative(),
  })).optional(),
});
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoicePriceSnapshotSchema = z.object({
  utilityTiers: z.record(z.array(z.object({
    tierNumber: z.number().int().positive(),
    minUsage: z.number().nonnegative(),
    maxUsage: z.number().nonnegative().nullable(),
    unitPrice: z.number().nonnegative(),
  }))),
  rentAmount: z.number().nonnegative(),
  capturedAt: TimestampSchema,
});
export type InvoicePriceSnapshot = z.infer<typeof InvoicePriceSnapshotSchema>;

export const InvoiceSchema = z.object({
  id: UUIDSchema,
  contractId: UUIDSchema,
  invoiceNumber: z.string().min(1),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: InvoiceStatusSchema,
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  paidAt: TimestampSchema.optional(),
  notes: z.string().optional(),
  priceSnapshot: InvoicePriceSnapshotSchema.optional(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// =============================================================================
// Incident Entity
// =============================================================================

export const IncidentSchema = z.object({
  id: UUIDSchema,
  apartmentId: UUIDSchema,
  reportedBy: UUIDSchema,
  assignedTo: UUIDSchema.optional(),
  category: IncidentCategorySchema,
  priority: IncidentPrioritySchema,
  status: IncidentStatusSchema,
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  imageUrls: z.array(z.string().url()).optional(),
  resolvedAt: TimestampSchema.optional(),
  resolutionNotes: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Incident = z.infer<typeof IncidentSchema>;

export const CreateIncidentSchema = z.object({
  apartmentId: UUIDSchema,
  category: IncidentCategorySchema,
  priority: IncidentPrioritySchema.optional().default('medium'),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  imageUrls: z.array(z.string().url()).optional(),
});
export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

export const UpdateIncidentSchema = z.object({
  assignedTo: UUIDSchema.optional(),
  priority: IncidentPrioritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  resolutionNotes: z.string().optional(),
});
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentSchema>;

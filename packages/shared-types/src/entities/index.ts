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
  // Payment tracking enums
  ContractTypeSchema,
  PaymentTypeSchema,
  PaymentStatusSchema,
  PaymentMethodSchema,
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
  created_at: TimestampSchema,
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
  created_at: TimestampSchema,
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
  unit_number: z.string().min(1).max(20),
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
  created_at: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Apartment = z.infer<typeof ApartmentSchema>;

export const CreateApartmentSchema = z.object({
  buildingId: UUIDSchema,
  unit_number: z.string().min(1).max(20),
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
  created_at: TimestampSchema,
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
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rentAmount: z.number().positive(),
  depositMonths: z.number().int().nonnegative(),
  depositAmount: z.number().nonnegative().optional(),
  termsNotes: z.string().optional(),
  createdBy: UUIDSchema.optional(),
  // Payment tracking fields
  contractType: ContractTypeSchema.optional().default('rental'),
  purchasePrice: z.number().nonnegative().optional(),
  downPayment: z.number().nonnegative().optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  optionFee: z.number().nonnegative().optional(),
  purchaseOptionPrice: z.number().nonnegative().optional(),
  optionPeriodMonths: z.number().int().positive().optional(),
  rentCreditPercent: z.number().min(0).max(100).optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
  // Timestamps
  created_at: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Contract = z.infer<typeof ContractSchema>;

export const CreateContractSchema = z.object({
  apartmentId: UUIDSchema,
  tenantId: UUIDSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rentAmount: z.number().positive(),
  depositMonths: z.number().int().nonnegative().optional().default(2),
  termsNotes: z.string().optional(),
  // Payment tracking fields
  contractType: ContractTypeSchema.optional().default('rental'),
  purchasePrice: z.number().nonnegative().optional(),
  downPayment: z.number().nonnegative().optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  optionFee: z.number().nonnegative().optional(),
  purchaseOptionPrice: z.number().nonnegative().optional(),
  optionPeriodMonths: z.number().int().positive().optional(),
  rentCreditPercent: z.number().min(0).max(100).optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
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
  invoice_number: z.string().min(1),
  billingPeriod: z.string().regex(/^\d{4}-\d{2}$/),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: InvoiceStatusSchema,
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative(),
  paid_at: TimestampSchema.optional(),
  notes: z.string().optional(),
  priceSnapshot: InvoicePriceSnapshotSchema.optional(),
  lineItems: z.array(InvoiceLineItemSchema).optional(),
  created_at: TimestampSchema,
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
  resolved_at: TimestampSchema.optional(),
  resolutionNotes: z.string().optional(),
  created_at: TimestampSchema,
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

// =============================================================================
// Payment Schedule Entity
// =============================================================================

export const PaymentScheduleSchema = z.object({
  id: UUIDSchema,
  contractId: UUIDSchema,
  periodLabel: z.string().min(1).max(100),
  paymentType: PaymentTypeSchema,
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedAmount: z.number().nonnegative(),
  receivedAmount: z.number().nonnegative(),
  status: PaymentStatusSchema,
  notes: z.string().optional(),
  created_at: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>;

export const CreatePaymentScheduleSchema = z.object({
  periodLabel: z.string().min(1).max(100),
  paymentType: PaymentTypeSchema,
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedAmount: z.number().nonnegative(),
  notes: z.string().optional(),
});
export type CreatePaymentScheduleInput = z.infer<typeof CreatePaymentScheduleSchema>;

export const UpdatePaymentScheduleSchema = z.object({
  periodLabel: z.string().min(1).max(100).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedAmount: z.number().nonnegative().optional(),
  status: PaymentStatusSchema.optional(),
  notes: z.string().optional(),
});
export type UpdatePaymentScheduleInput = z.infer<typeof UpdatePaymentScheduleSchema>;

// =============================================================================
// Payment Transaction Entity
// =============================================================================

export const PaymentSchema = z.object({
  id: UUIDSchema,
  scheduleId: UUIDSchema,
  amount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: PaymentMethodSchema.optional(),
  referenceNumber: z.string().max(100).optional(),
  recordedBy: UUIDSchema,
  recordedAt: TimestampSchema,
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: PaymentMethodSchema.optional(),
  referenceNumber: z.string().max(100).optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

// =============================================================================
// Contract Financial Summary
// =============================================================================

export const ContractFinancialSummarySchema = z.object({
  totalContractValue: z.number().nonnegative(),
  totalPaid: z.number().nonnegative(),
  paidPercent: z.number().nonnegative(),
  outstanding: z.number().nonnegative(),
  remainingBalance: z.number().nonnegative(),
  nextDue: PaymentScheduleSchema.optional(),
});
export type ContractFinancialSummary = z.infer<typeof ContractFinancialSummarySchema>;

// =============================================================================
// Access Card Entity
// =============================================================================

import {
  AccessCardTypeSchema,
  AccessCardStatusSchema,
  DeactivationReasonSchema,
} from '../enums';

export const AccessCardHolderSchema = z.object({
  id: UUIDSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
});
export type AccessCardHolder = z.infer<typeof AccessCardHolderSchema>;

export const AccessCardApartmentSchema = z.object({
  id: UUIDSchema,
  unitNumber: z.string(),
  buildingName: z.string().optional(),
});
export type AccessCardApartment = z.infer<typeof AccessCardApartmentSchema>;

export const AccessCardSchema = z.object({
  id: UUIDSchema,
  cardNumber: z.string().max(50),
  apartmentId: UUIDSchema,
  apartment: AccessCardApartmentSchema.optional(),
  holderId: UUIDSchema.nullable().optional(),
  holder: AccessCardHolderSchema.nullable().optional(),
  cardType: AccessCardTypeSchema,
  status: AccessCardStatusSchema,
  accessZones: z.array(z.string()),
  floorAccess: z.array(z.number().int()),
  issuedAt: TimestampSchema,
  expiresAt: TimestampSchema.nullable().optional(),
  deactivatedAt: TimestampSchema.nullable().optional(),
  deactivatedBy: UUIDSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type AccessCard = z.infer<typeof AccessCardSchema>;

export const CreateAccessCardSchema = z.object({
  cardNumber: z.string().min(1).max(50),
  apartmentId: UUIDSchema,
  holderId: UUIDSchema.optional(),
  cardType: AccessCardTypeSchema,
  accessZones: z.array(z.string()).optional(),
  floorAccess: z.array(z.number().int().nonnegative()).optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateAccessCardInput = z.infer<typeof CreateAccessCardSchema>;

export const UpdateAccessCardSchema = z.object({
  accessZones: z.array(z.string()).optional(),
  floorAccess: z.array(z.number().int().nonnegative()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional(),
});
export type UpdateAccessCardInput = z.infer<typeof UpdateAccessCardSchema>;

export const DeactivateAccessCardSchema = z.object({
  reason: DeactivationReasonSchema,
  notes: z.string().max(500).optional(),
});
export type DeactivateAccessCardInput = z.infer<typeof DeactivateAccessCardSchema>;

export const AccessCardListResponseSchema = z.object({
  data: z.array(AccessCardSchema),
  total: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
export type AccessCardListResponse = z.infer<typeof AccessCardListResponseSchema>;

export const AccessCardStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  lost: z.number().int().nonnegative(),
  deactivated: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  available: z.number().int().nonnegative(),
});
export type AccessCardStats = z.infer<typeof AccessCardStatsSchema>;

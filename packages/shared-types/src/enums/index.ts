/**
 * Shared Enums for Vully Platform
 * Used by both backend (NestJS) and frontend (Next.js)
 * 
 * IMPORTANT: These enums mirror Prisma schema enums.
 * Any change here MUST be reflected in apps/api/prisma/schema.prisma
 */

import { z } from 'zod';

// ============================================================================
// User & RBAC
// ============================================================================

/**
 * User roles for RBAC
 * - admin: Full platform access (CRUD all resources)
 * - technician: Limited access (update incidents, read apartments)
 * - resident: Scoped access (own resources only)
 * - security: Building security guards (building-scoped)
 * - housekeeping: Cleaning/maintenance staff (building-scoped)
 * - accountant: Finance/billing staff (can be global or building-scoped)
 * - building_manager: Full access within assigned buildings
 * 
 * NOTE: A user can hold multiple roles simultaneously via UserRoleAssignment table
 */
export const UserRoleSchema = z.enum([
  'admin',
  'technician',
  'resident',
  'security',
  'housekeeping',
  'accountant',
  'building_manager',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Enum object for programmatic access (mirrors Prisma's generated enum)
 */
export const UserRole = {
  admin: 'admin' as const,
  technician: 'technician' as const,
  resident: 'resident' as const,
  security: 'security' as const,
  housekeeping: 'housekeeping' as const,
  accountant: 'accountant' as const,
  building_manager: 'building_manager' as const,
} as const;

// ============================================================================
// Apartments & Contracts
// ============================================================================

/**
 * Apartment availability status
 */
export const ApartmentStatusSchema = z.enum([
  'vacant',
  'occupied',
  'maintenance',
  'reserved',
]);
export type ApartmentStatus = z.infer<typeof ApartmentStatusSchema>;

export const ApartmentStatus = {
  vacant: 'vacant' as const,
  occupied: 'occupied' as const,
  maintenance: 'maintenance' as const,
  reserved: 'reserved' as const,
} as const;

/**
 * Apartment unit type classification
 */
export const UnitTypeSchema = z.enum([
  'studio',
  'one_bedroom',
  'two_bedroom',
  'three_bedroom',
  'duplex',
  'penthouse',
  'shophouse',
]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

export const UnitType = {
  studio: 'studio' as const,
  one_bedroom: 'one_bedroom' as const,
  two_bedroom: 'two_bedroom' as const,
  three_bedroom: 'three_bedroom' as const,
  duplex: 'duplex' as const,
  penthouse: 'penthouse' as const,
  shophouse: 'shophouse' as const,
} as const;

/**
 * Ownership type for Vietnamese real estate
 */
export const OwnershipTypeSchema = z.enum([
  'permanent',
  'fifty_year',
  'leasehold',
]);
export type OwnershipType = z.infer<typeof OwnershipTypeSchema>;

export const OwnershipType = {
  permanent: 'permanent' as const,
  fifty_year: 'fifty_year' as const,
  leasehold: 'leasehold' as const,
} as const;

/**
 * Compass direction for unit/balcony orientation
 */
export const OrientationSchema = z.enum([
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
]);
export type Orientation = z.infer<typeof OrientationSchema>;

export const Orientation = {
  north: 'north' as const,
  south: 'south' as const,
  east: 'east' as const,
  west: 'west' as const,
  northeast: 'northeast' as const,
  northwest: 'northwest' as const,
  southeast: 'southeast' as const,
  southwest: 'southwest' as const,
} as const;

/**
 * Billing cycle frequency
 */
export const BillingCycleSchema = z.enum([
  'monthly',
  'quarterly',
  'yearly',
]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const BillingCycle = {
  monthly: 'monthly' as const,
  quarterly: 'quarterly' as const,
  yearly: 'yearly' as const,
} as const;

/**
 * IoT device synchronization status
 */
export const SyncStatusSchema = z.enum([
  'synced',
  'pending',
  'error',
  'disconnected',
]);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const SyncStatus = {
  synced: 'synced' as const,
  pending: 'pending' as const,
  error: 'error' as const,
  disconnected: 'disconnected' as const,
} as const;

/**
 * Tenant contract lifecycle status
 */
export const ContractStatusSchema = z.enum([
  'draft',
  'active',
  'expired',
  'terminated',
]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

export const ContractStatus = {
  draft: 'draft' as const,
  active: 'active' as const,
  expired: 'expired' as const,
  terminated: 'terminated' as const,
} as const;

// ============================================================================
// Billing & Invoices
// ============================================================================

/**
 * Invoice payment status
 */
export const InvoiceStatusSchema = z.enum([
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceStatus = {
  draft: 'draft' as const,
  pending: 'pending' as const,
  paid: 'paid' as const,
  overdue: 'overdue' as const,
  cancelled: 'cancelled' as const,
} as const;

/**
 * Background billing job execution status
 */
export const BillingJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);
export type BillingJobStatus = z.infer<typeof BillingJobStatusSchema>;

export const BillingJobStatus = {
  pending: 'pending' as const,
  processing: 'processing' as const,
  completed: 'completed' as const,
  failed: 'failed' as const,
} as const;

// ============================================================================
// Incidents
// ============================================================================

/**
 * Incident classification category
 */
export const IncidentCategorySchema = z.enum([
  'plumbing',
  'electrical',
  'hvac',
  'structural',
  'appliance',
  'pest',
  'noise',
  'security',
  'other',
]);
export type IncidentCategory = z.infer<typeof IncidentCategorySchema>;

export const IncidentCategory = {
  plumbing: 'plumbing' as const,
  electrical: 'electrical' as const,
  hvac: 'hvac' as const,
  structural: 'structural' as const,
  appliance: 'appliance' as const,
  pest: 'pest' as const,
  noise: 'noise' as const,
  security: 'security' as const,
  other: 'other' as const,
} as const;

/**
 * Incident workflow status
 */
export const IncidentStatusSchema = z.enum([
  'open',
  'assigned',
  'in_progress',
  'pending_review',
  'resolved',
  'closed',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentStatus = {
  open: 'open' as const,
  assigned: 'assigned' as const,
  in_progress: 'in_progress' as const,
  pending_review: 'pending_review' as const,
  resolved: 'resolved' as const,
  closed: 'closed' as const,
} as const;

/**
 * Incident urgency level
 */
export const IncidentPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type IncidentPriority = z.infer<typeof IncidentPrioritySchema>;

export const IncidentPriority = {
  low: 'low' as const,
  medium: 'medium' as const,
  high: 'high' as const,
  urgent: 'urgent' as const,
} as const;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Utility service type codes
 */
export const UtilityTypeCodeSchema = z.enum(['electric', 'water', 'gas']);
export type UtilityTypeCode = z.infer<typeof UtilityTypeCodeSchema>;

// ============================================================================
// Notifications
// ============================================================================

/**
 * System notification event types
 */
export const NotificationTypeSchema = z.enum([
  'invoice_generated',
  'invoice_due',
  'invoice_overdue',
  'incident_created',
  'incident_assigned',
  'incident_updated',
  'incident_resolved',
  'contract_expiring',
  'announcement',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// ============================================================================
// Payment Tracking
// ============================================================================

/**
 * Contract type classification (rental, purchase, lease-to-own)
 */
export const ContractTypeSchema = z.enum([
  'rental',
  'purchase',
  'lease_to_own',
]);
export type ContractType = z.infer<typeof ContractTypeSchema>;

export const ContractType = {
  rental: 'rental' as const,
  purchase: 'purchase' as const,
  lease_to_own: 'lease_to_own' as const,
} as const;

/**
 * Payment category for schedule entries
 */
export const PaymentTypeSchema = z.enum([
  'downpayment',
  'installment',
  'rent',
  'deposit',
  'option_fee',
  'penalty',
  'adjustment',
]);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const PaymentType = {
  downpayment: 'downpayment' as const,
  installment: 'installment' as const,
  rent: 'rent' as const,
  deposit: 'deposit' as const,
  option_fee: 'option_fee' as const,
  penalty: 'penalty' as const,
  adjustment: 'adjustment' as const,
} as const;

/**
 * Payment schedule entry status
 */
export const PaymentStatusSchema = z.enum([
  'pending',
  'partial',
  'paid',
  'overdue',
  'waived',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentStatus = {
  pending: 'pending' as const,
  partial: 'partial' as const,
  paid: 'paid' as const,
  overdue: 'overdue' as const,
  waived: 'waived' as const,
} as const;

/**
 * Payment method for recording transactions
 */
export const PaymentMethodSchema = z.enum([
  'bank_transfer',
  'cash',
  'check',
  'card',
  'other',
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentMethod = {
  bank_transfer: 'bank_transfer' as const,
  cash: 'cash' as const,
  check: 'check' as const,
  card: 'card' as const,
  other: 'other' as const,
} as const;

// ============================================================================
// Access Card Management
// ============================================================================

/**
 * Access card type classification
 * - building: Lobby, elevator, amenities access
 * - parking: Parking lot gates only
 */
export const AccessCardTypeSchema = z.enum(['building', 'parking']);
export type AccessCardType = z.infer<typeof AccessCardTypeSchema>;

export const AccessCardType = {
  building: 'building' as const,
  parking: 'parking' as const,
} as const;

/**
 * Access card lifecycle status
 */
export const AccessCardStatusSchema = z.enum([
  'active',
  'lost',
  'deactivated',
  'expired',
]);
export type AccessCardStatus = z.infer<typeof AccessCardStatusSchema>;

export const AccessCardStatus = {
  active: 'active' as const,
  lost: 'lost' as const,
  deactivated: 'deactivated' as const,
  expired: 'expired' as const,
} as const;

/**
 * Deactivation reason for audit tracking
 */
export const DeactivationReasonSchema = z.enum([
  'lost',
  'stolen',
  'resident_left',
  'admin_action',
]);
export type DeactivationReason = z.infer<typeof DeactivationReasonSchema>;

export const DeactivationReason = {
  lost: 'lost' as const,
  stolen: 'stolen' as const,
  resident_left: 'resident_left' as const,
  admin_action: 'admin_action' as const,
} as const;

// ============================================================================
// Payment Webhook / VietQR Auto-Sync
// ============================================================================

/**
 * Supported VietQR payment gateways
 */
export const PaymentGatewaySchema = z.enum(['payos', 'casso', 'sepay']);
export type PaymentGateway = z.infer<typeof PaymentGatewaySchema>;

export const PaymentGateway = {
  payos: 'payos' as const,
  casso: 'casso' as const,
  sepay: 'sepay' as const,
} as const;

/**
 * Unmatched payment reconciliation status
 */
export const UnmatchedPaymentStatusSchema = z.enum([
  'pending',  // Awaiting accountant review
  'matched',  // Manually matched to invoice
  'rejected', // Rejected (invalid/duplicate/not our customer)
]);
export type UnmatchedPaymentStatus = z.infer<typeof UnmatchedPaymentStatusSchema>;

export const UnmatchedPaymentStatus = {
  pending: 'pending' as const,
  matched: 'matched' as const,
  rejected: 'rejected' as const,
} as const;

// ============================================================================
// Notification Delivery
// ============================================================================

/**
 * Notification delivery status for multi-channel push
 */
export const NotificationDeliveryStatusSchema = z.enum([
  'pending',   // Queued for delivery
  'delivered', // Successfully sent
  'failed',    // Delivery failed
  'skipped',   // Skipped (user disabled or no device)
]);
export type NotificationDeliveryStatus = z.infer<typeof NotificationDeliveryStatusSchema>;

export const NotificationDeliveryStatus = {
  pending: 'pending' as const,
  delivered: 'delivered' as const,
  failed: 'failed' as const,
  skipped: 'skipped' as const,
} as const;

/**
 * Device platform for FCM push notifications
 */
export const DevicePlatformSchema = z.enum(['web', 'android', 'ios']);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

export const DevicePlatform = {
  web: 'web' as const,
  android: 'android' as const,
  ios: 'ios' as const,
} as const;

// ============================================================================
// OAuth Providers
// ============================================================================

/**
 * Supported OAuth providers
 */
export const OAuthProviderSchema = z.enum(['google', 'zalo']);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

export const OAuthProvider = {
  google: 'google' as const,
  zalo: 'zalo' as const,
} as const;

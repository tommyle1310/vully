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
 * 
 * NOTE: A user can hold 1-3 roles simultaneously via UserRoleAssignment table
 */
export const UserRoleSchema = z.enum(['admin', 'technician', 'resident']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Enum object for programmatic access (mirrors Prisma's generated enum)
 */
export const UserRole = {
  admin: 'admin' as const,
  technician: 'technician' as const,
  resident: 'resident' as const,
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

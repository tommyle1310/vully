/**
 * Shared Enums for Vully Platform
 * Used by both backend (NestJS) and frontend (Next.js)
 */

import { z } from 'zod';

// User Roles
export const UserRoleSchema = z.enum(['admin', 'technician', 'resident']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Apartment Status
export const ApartmentStatusSchema = z.enum([
  'vacant',
  'occupied',
  'maintenance',
  'reserved',
]);
export type ApartmentStatus = z.infer<typeof ApartmentStatusSchema>;

// Contract Status
export const ContractStatusSchema = z.enum([
  'draft',
  'active',
  'expired',
  'terminated',
]);
export type ContractStatus = z.infer<typeof ContractStatusSchema>;

// Invoice Status
export const InvoiceStatusSchema = z.enum([
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

// Incident Category
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

// Incident Status
export const IncidentStatusSchema = z.enum([
  'open',
  'assigned',
  'in_progress',
  'pending_review',
  'resolved',
  'closed',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

// Incident Priority
export const IncidentPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type IncidentPriority = z.infer<typeof IncidentPrioritySchema>;

// Utility Types
export const UtilityTypeCodeSchema = z.enum(['electric', 'water', 'gas']);
export type UtilityTypeCode = z.infer<typeof UtilityTypeCodeSchema>;

// Billing Job Status
export const BillingJobStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);
export type BillingJobStatus = z.infer<typeof BillingJobStatusSchema>;

// Notification Type
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

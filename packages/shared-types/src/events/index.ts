/**
 * WebSocket Event Schemas for Vully Platform
 * Type-safe event definitions for Socket.IO
 */

import { z } from 'zod';
import { IncidentStatusSchema, InvoiceStatusSchema, NotificationTypeSchema } from '../enums';

// =============================================================================
// Event Payload Schemas
// =============================================================================

export const IncidentEventPayloadSchema = z.object({
  incidentId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  buildingId: z.string().uuid(),
  status: IncidentStatusSchema,
  title: z.string(),
  assignedTo: z.string().uuid().optional(),
  updatedAt: z.string().datetime(),
});
export type IncidentEventPayload = z.infer<typeof IncidentEventPayloadSchema>;

export const IncidentCommentEventPayloadSchema = z.object({
  commentId: z.string().uuid(),
  incidentId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  content: z.string(),
  isInternal: z.boolean(),
  created_at: z.string().datetime(),
});
export type IncidentCommentEventPayload = z.infer<typeof IncidentCommentEventPayloadSchema>;

export const InvoiceEventPayloadSchema = z.object({
  invoiceId: z.string().uuid(),
  contractId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  status: InvoiceStatusSchema,
  totalAmount: z.number().nonnegative(),
  dueDate: z.string(),
  updatedAt: z.string().datetime(),
});
export type InvoiceEventPayload = z.infer<typeof InvoiceEventPayloadSchema>;

export const PaymentEventPayloadSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  contractPaymentId: z.string().uuid().optional(),
  apartmentId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  amount: z.number().nonnegative(),
  gateway: z.string(),
  transactionId: z.string(),
  status: z.enum(['completed', 'unmatched', 'matched']),
  matchedAt: z.string().datetime().optional(),
});
export type PaymentEventPayload = z.infer<typeof PaymentEventPayloadSchema>;

export const UnmatchedPaymentEventPayloadSchema = z.object({
  unmatchedPaymentId: z.string().uuid(),
  amount: z.number().nonnegative(),
  gateway: z.string(),
  senderName: z.string().optional(),
  description: z.string().optional(),
  receivedAt: z.string().datetime(),
});
export type UnmatchedPaymentEventPayload = z.infer<typeof UnmatchedPaymentEventPayloadSchema>;

export const NotificationPayloadSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  created_at: z.string().datetime(),
});
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

// =============================================================================
// Event Name Constants
// =============================================================================

export const WS_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  
  // Server -> Client: Incidents
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  INCIDENT_ASSIGNED: 'incident:assigned',
  INCIDENT_RESOLVED: 'incident:resolved',
  INCIDENT_COMMENT_CREATED: 'incident:comment:created',
  
  // Server -> Client: Invoices
  INVOICE_GENERATED: 'invoice:generated',
  INVOICE_STATUS_CHANGED: 'invoice:status-changed',
  INVOICE_PAID: 'invoice:paid',
  
  // Server -> Client: Payments
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_UNMATCHED: 'payment:unmatched',
  PAYMENT_MATCHED: 'payment:matched', // Manual match by accountant
  
  // Server -> Client: Notifications
  NOTIFICATION: 'notification',
  
  // Server -> Client: Job Progress
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETED: 'job:completed',
  JOB_FAILED: 'job:failed',
} as const;

export type WsEventName = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// =============================================================================
// Room Name Helpers
// =============================================================================

export const WS_ROOMS = {
  buildings: (buildingId: string) => `buildings:${buildingId}`,
  apartments: (apartmentId: string) => `apartments:${apartmentId}`,
  incidents: (incidentId: string) => `incidents:${incidentId}`,
  user: (userId: string) => `user:${userId}`,
  admin: () => 'role:admin',
  technician: () => 'role:technician',
  accountant: () => 'role:accountant',
  security: () => 'role:security',
  housekeeping: () => 'role:housekeeping',
  buildingManager: () => 'role:building_manager',
} as const;

// =============================================================================
// Job Progress Schema
// =============================================================================

export const JobProgressPayloadSchema = z.object({
  jobId: z.string(),
  jobName: z.string(),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  totalSteps: z.number().int().nonnegative().optional(),
  completedSteps: z.number().int().nonnegative().optional(),
});
export type JobProgressPayload = z.infer<typeof JobProgressPayloadSchema>;

export const JobCompletedPayloadSchema = z.object({
  jobId: z.string(),
  jobName: z.string(),
  result: z.record(z.unknown()).optional(),
  duration: z.number().nonnegative(),
});
export type JobCompletedPayload = z.infer<typeof JobCompletedPayloadSchema>;

export const JobFailedPayloadSchema = z.object({
  jobId: z.string(),
  jobName: z.string(),
  error: z.string(),
  failedAt: z.string().datetime(),
});
export type JobFailedPayload = z.infer<typeof JobFailedPayloadSchema>;

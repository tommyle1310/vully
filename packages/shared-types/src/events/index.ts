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

export const NotificationPayloadSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
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
  
  // Server -> Client: Invoices
  INVOICE_GENERATED: 'invoice:generated',
  INVOICE_STATUS_CHANGED: 'invoice:status-changed',
  INVOICE_PAID: 'invoice:paid',
  
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
  building: (buildingId: string) => `building:${buildingId}`,
  apartment: (apartmentId: string) => `apartment:${apartmentId}`,
  user: (userId: string) => `user:${userId}`,
  admin: () => 'role:admin',
  technician: () => 'role:technician',
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

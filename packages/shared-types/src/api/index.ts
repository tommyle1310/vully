/**
 * API Response Schemas for Vully Platform
 * Standard response formats for REST API
 */

import { z } from 'zod';

// =============================================================================
// Base API Response Schemas
// =============================================================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const CursorPaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  cursor: z.string().nullable(),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type CursorPaginationMeta = z.infer<typeof CursorPaginationMetaSchema>;

// Generic API Response wrapper
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.record(z.unknown()).optional(),
    errors: z.array(ApiErrorSchema).optional(),
  });
}

// Generic Paginated Response wrapper
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
    errors: z.array(ApiErrorSchema).optional(),
  });
}

// =============================================================================
// Auth Schemas
// =============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// =============================================================================
// Query Parameter Schemas
// =============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const SortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type SortQuery = z.infer<typeof SortQuerySchema>;

export const SearchQuerySchema = z.object({
  search: z.string().optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// Combined query schema for list endpoints
export const ListQuerySchema = PaginationQuerySchema.merge(SortQuerySchema).merge(SearchQuerySchema);
export type ListQuery = z.infer<typeof ListQuerySchema>;

// =============================================================================
// File Upload Schemas
// =============================================================================

export const PresignedUrlRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
});
export type PresignedUrlRequest = z.infer<typeof PresignedUrlRequestSchema>;

export const PresignedUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string(),
  publicUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});
export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>;

// =============================================================================
// Dashboard Schemas
// =============================================================================

export const OccupancyStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  occupied: z.number().int().nonnegative(),
  vacant: z.number().int().nonnegative(),
  maintenance: z.number().int().nonnegative(),
  occupancyRate: z.number().min(0).max(100),
});
export type OccupancyStats = z.infer<typeof OccupancyStatsSchema>;

export const RevenueStatsSchema = z.object({
  currentMonth: z.number().nonnegative(),
  previousMonth: z.number().nonnegative(),
  percentChange: z.number(),
  collected: z.number().nonnegative(),
  pending: z.number().nonnegative(),
  overdue: z.number().nonnegative(),
});
export type RevenueStats = z.infer<typeof RevenueStatsSchema>;

export const IncidentStatsSchema = z.object({
  open: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  avgResolutionHours: z.number().nonnegative(),
});
export type IncidentStats = z.infer<typeof IncidentStatsSchema>;

export const DashboardStatsSchema = z.object({
  occupancy: OccupancyStatsSchema,
  revenue: RevenueStatsSchema,
  incidents: IncidentStatsSchema,
  lastUpdated: z.string().datetime(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

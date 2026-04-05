'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DashboardStats {
  apartments: {
    total: number;
    vacant: number;
    occupied: number;
    maintenance: number;
  };
  residents: {
    total: number;
    active: number;
  };
  invoices: {
    pending: number;
    overdue: number;
    paidThisMonth: number;
    totalOutstanding: number;
  };
  incidents: {
    open: number;
    inProgress: number;
    resolvedThisMonth: number;
  };
}

export interface AdminStats extends DashboardStats {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  buildings: {
    total: number;
  };
}

interface DashboardStatsResponse {
  data: DashboardStats;
}

interface AdminStatsResponse {
  data: AdminStats;
}

interface UseDashboardStatsOptions {
  enabled?: boolean;
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: (): Promise<DashboardStatsResponse> =>
      apiClient.get<DashboardStatsResponse>('/stats/dashboard'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    enabled,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['stats', 'admin'],
    queryFn: (): Promise<AdminStatsResponse> =>
      apiClient.get<AdminStatsResponse>('/stats/admin'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

// =============================================================================
// Analytics Hooks
// =============================================================================

export interface OccupancyTrendData {
  month: string;
  occupancyRate: number;
  total: number;
  occupied: number;
}

export interface RevenueBreakdownData {
  month: string;
  rent: number;
  utilities: number;
  fees: number;
  total: number;
}

export interface IncidentAnalytics {
  byCategory: Array<{ category: string; count: number; avgResolutionTime: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export function useOccupancyTrend(months = 12) {
  return useQuery({
    queryKey: ['analytics', 'occupancy', months],
    queryFn: (): Promise<{ data: OccupancyTrendData[] }> =>
      apiClient.get<{ data: OccupancyTrendData[] }>(
        `/stats/analytics/occupancy?months=${months}`
      ),
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
  });
}

export function useRevenueBreakdown(months = 6) {
  return useQuery({
    queryKey: ['analytics', 'revenue', months],
    queryFn: (): Promise<{ data: RevenueBreakdownData[] }> =>
      apiClient.get<{ data: RevenueBreakdownData[] }>(
        `/stats/analytics/revenue?months=${months}`
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIncidentAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'incidents'],
    queryFn: (): Promise<{ data: IncidentAnalytics }> =>
      apiClient.get<{ data: IncidentAnalytics }>(
        '/stats/analytics/incidents'
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export interface RecentActivity {
  id: string;
  type: 'incident' | 'invoice' | 'contract';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  priority?: string;
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['stats', 'recent-activity', limit],
    queryFn: (): Promise<{ data: RecentActivity[] }> =>
      apiClient.get<{ data: RecentActivity[] }>(
        `/stats/recent-activity?limit=${limit}`
      ),
    staleTime: 60 * 1000, // 1 minute (matches backend cache)
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes for fresh activity
  });
}


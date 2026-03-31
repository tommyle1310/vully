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

export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: async (): Promise<DashboardStatsResponse> => {
      return apiClient.get<DashboardStatsResponse>('/stats/dashboard');
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['stats', 'admin'],
    queryFn: async (): Promise<AdminStatsResponse> => {
      return apiClient.get<AdminStatsResponse>('/stats/admin');
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

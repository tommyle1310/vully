'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UtilityType {
  id: string;
  code: string;
  name: string;
  unit: string;
  isActive: boolean;
}

interface UtilityTypesResponse {
  data: UtilityType[];
}

// List utility types
export function useUtilityTypes() {
  return useQuery({
    queryKey: ['utility-types'],
    queryFn: async (): Promise<UtilityTypesResponse> => {
      return apiClient.get<UtilityTypesResponse>('/utility-types');
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (rarely changes)
  });
}

// Seed default utility types
export function useSeedUtilityTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<UtilityTypesResponse> => {
      return apiClient.post<UtilityTypesResponse>('/utility-types/seed', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-types'] });
    },
  });
}

// Billing job types
export interface BillingJob {
  id: string;
  jobType: string;
  billingPeriod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalContracts: number;
  processedCount: number;
  failedCount: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  errorLog?: unknown;
}

interface BillingJobsResponse {
  data: BillingJob[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface BillingJobResponse {
  data: BillingJob;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// List billing jobs
export function useBillingJobs(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['billing-jobs', page, limit],
    queryFn: async (): Promise<BillingJobsResponse> => {
      return apiClient.get<BillingJobsResponse>(
        `/billing-jobs?page=${page}&limit=${limit}`,
      );
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get billing job status
export function useBillingJob(id: string, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['billing-jobs', id],
    queryFn: async (): Promise<BillingJobResponse> => {
      return apiClient.get<BillingJobResponse>(`/billing-jobs/${id}`);
    },
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

// Get queue stats
export function useQueueStats() {
  return useQuery({
    queryKey: ['billing-jobs', 'stats'],
    queryFn: async (): Promise<{ data: QueueStats }> => {
      return apiClient.get<{ data: QueueStats }>('/billing-jobs/stats');
    },
    staleTime: 10 * 1000, // 10 seconds
  });
}

// Trigger bulk invoice generation
export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billingPeriod,
      buildingId,
    }: {
      billingPeriod: string;
      buildingId?: string;
    }): Promise<{
      data: {
        jobId: string;
        message: string;
        totalContracts: number;
      };
    }> => {
      return apiClient.post('/billing-jobs/generate', {
        billingPeriod,
        buildingId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-jobs'] });
    },
  });
}

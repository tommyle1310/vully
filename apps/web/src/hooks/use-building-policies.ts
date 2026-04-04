import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// =====================
// Types
// =====================

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface BuildingPolicy {
  id: string;
  buildingId: string;
  defaultMaxResidents: number | null;
  accessCardLimitDefault: number;
  petAllowed: boolean;
  petLimitDefault: number;
  defaultBillingCycle: BillingCycle;
  lateFeeRatePercent: number | null;
  lateFeeGraceDays: number;
  trashCollectionDays: string[] | null;
  trashCollectionTime: string | null;
  trashFeePerMonth: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrent: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateBuildingPolicyInput {
  defaultMaxResidents?: number;
  accessCardLimitDefault?: number;
  petAllowed?: boolean;
  petLimitDefault?: number;
  defaultBillingCycle?: BillingCycle;
  lateFeeRatePercent?: number;
  lateFeeGraceDays?: number;
  trashCollectionDays?: string[];
  trashCollectionTime?: string;
  trashFeePerMonth?: number;
  effectiveFrom: string;
}

export interface UpdateBuildingPolicyInput extends Partial<CreateBuildingPolicyInput> {}

interface PolicyResponse {
  data: BuildingPolicy;
}

interface PoliciesResponse {
  data: BuildingPolicy[];
}

// =====================
// Hooks
// =====================

/**
 * Get all policies for a building (versioned history)
 */
export function useBuildingPolicies(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'policies'],
    queryFn: () => 
      apiClient.get<PoliciesResponse>(`/buildings/${buildingId}/policies`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get currently effective policy for a building
 */
export function useCurrentBuildingPolicy(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'policies', 'current'],
    queryFn: () => 
      apiClient.get<PolicyResponse>(`/buildings/${buildingId}/policies/current`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific policy by ID
 */
export function useBuildingPolicy(buildingId: string, policyId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'policies', policyId],
    queryFn: () => 
      apiClient.get<PolicyResponse>(`/buildings/${buildingId}/policies/${policyId}`),
    enabled: !!buildingId && !!policyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new policy version
 */
export function useCreateBuildingPolicy(buildingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBuildingPolicyInput) =>
      apiClient.post<PolicyResponse>(`/buildings/${buildingId}/policies`, input),
    onSuccess: () => {
      // Invalidate policies list and current policy
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'policies'] 
      });
    },
  });
}

/**
 * Update a future policy (not yet effective)
 */
export function useUpdateBuildingPolicy(buildingId: string, policyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBuildingPolicyInput) =>
      apiClient.patch<PolicyResponse>(
        `/buildings/${buildingId}/policies/${policyId}`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'policies'] 
      });
    },
  });
}

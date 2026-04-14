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
  paymentDueDay: number;
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
  // Occupancy
  defaultMaxResidents?: number;
  accessCardLimitDefault?: number;
  petAllowed?: boolean;
  petLimitDefault?: number;
  petRules?: string;
  
  // Billing
  defaultBillingCycle?: BillingCycle;
  lateFeeRatePercent?: number;
  lateFeeGraceDays?: number;
  paymentDueDay?: number;
  
  // Trash
  trashCollectionDays?: string[];
  trashCollectionTime?: string;
  trashFeePerMonth?: number;
  
  // Amenities - Pool
  poolAvailable?: boolean;
  poolHours?: string;
  poolFeePerMonth?: number;
  
  // Amenities - Gym
  gymAvailable?: boolean;
  gymHours?: string;
  gymFeePerMonth?: number;
  gymBookingRequired?: boolean;
  
  // Amenities - Sports
  sportsCourtAvailable?: boolean;
  sportsCourtHours?: string;
  sportsCourtBookingRules?: string;
  
  // Guest Rules
  guestRegistrationRequired?: boolean;
  guestParkingRules?: string;
  visitorHours?: string;
  
  // Renovation
  renovationApprovalRequired?: boolean;
  renovationAllowedHours?: string;
  renovationDeposit?: number;
  renovationApprovalProcess?: string;
  
  // Quiet Hours
  quietHoursStart?: string;
  quietHoursEnd?: string;
  noiseComplaintProcess?: string;
  
  // Package
  packagePickupLocation?: string;
  packagePickupHours?: string;
  packageHoldingDays?: number;
  
  // Emergency
  emergencyContacts?: Array<{ name: string; role: string; phone: string }>;
  managementOfficeHours?: string;
  security24hPhone?: string;
  
  // Access Cards
  accessCardReplacementFee?: number;
  accessCardReplacementProcess?: string;
  
  // Move In/Out
  moveAllowedHours?: string;
  moveElevatorBookingRequired?: boolean;
  moveDeposit?: number;
  
  // Parking Fees
  motorcycleParkingFee?: number;
  carParkingFee?: number;
  
  // Required
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

// =====================
// Extended Policy Interface (for detailed view)
// Matches the actual Prisma schema field names
// =====================

export interface ExtendedBuildingPolicy extends BuildingPolicy {
  // Occupancy
  petRules: string | null;
  
  // Amenities - Pool
  poolAvailable: boolean;
  poolHours: string | null;
  poolFeePerMonth: number | null;
  
  // Amenities - Gym
  gymAvailable: boolean;
  gymHours: string | null;
  gymFeePerMonth: number | null;
  gymBookingRequired: boolean;
  
  // Amenities - Sports Courts
  sportsCourtAvailable: boolean;
  sportsCourtHours: string | null;
  sportsCourtBookingRules: string | null;
  
  // Guest & Visitor Rules
  guestRegistrationRequired: boolean;
  guestParkingRules: string | null;
  visitorHours: string | null;
  
  // Renovation
  renovationApprovalRequired: boolean;
  renovationAllowedHours: string | null;
  renovationDeposit: number | null;
  renovationApprovalProcess: string | null;
  
  // Quiet hours
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  noiseComplaintProcess: string | null;
  
  // Package & Deliveries
  packagePickupLocation: string | null;
  packagePickupHours: string | null;
  packageHoldingDays: number;
  
  // Emergency
  emergencyContacts: Array<{ name: string; role: string; phone: string }> | null;
  managementOfficeHours: string | null;
  security24hPhone: string | null;
  
  // Access cards
  accessCardReplacementFee: number | null;
  accessCardReplacementProcess: string | null;
  
  // Move in/out
  moveAllowedHours: string | null;
  moveElevatorBookingRequired: boolean;
  moveDeposit: number | null;
  
  // Parking fees
  motorcycleParkingFee: number | null;
  carParkingFee: number | null;
  
  // Payment
  paymentDueDay: number;
}

interface MyPoliciesResponse {
  data: {
    buildingId: string;
    buildingName: string;
    policy: ExtendedBuildingPolicy | null;
  };
}

/**
 * Get the current policy for the resident's building
 * Used on the /policies page for residents
 */
export function useMyBuildingPolicies() {
  return useQuery({
    queryKey: ['my-building-policies'],
    queryFn: () => apiClient.get<MyPoliciesResponse>('/buildings/my/policies'),
    staleTime: 10 * 60 * 1000, // 10 minutes - policies don't change often
  });
}

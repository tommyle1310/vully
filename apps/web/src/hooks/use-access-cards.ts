import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// =====================
// Types
// =====================

export type AccessCardType = 'building' | 'parking';
export type AccessCardStatus = 'active' | 'lost' | 'deactivated' | 'expired';
export type AccessCardRequestStatus = 'pending' | 'approved' | 'rejected';
export type DeactivationReason = 'lost' | 'stolen' | 'resident_left' | 'admin_action';

export interface AccessCardHolder {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface AccessCardApartment {
  id: string;
  unitNumber: string;
  buildingName?: string;
}

export interface AccessCard {
  id: string;
  cardNumber: string;
  apartmentId: string;
  apartment?: AccessCardApartment;
  holderId?: string | null;
  holder?: AccessCardHolder | null;
  cardType: AccessCardType;
  status: AccessCardStatus;
  accessZones: string[];
  floorAccess: number[];
  issuedAt: string;
  expiresAt?: string | null;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessCardStats {
  total: number;
  active: number;
  lost: number;
  deactivated: number;
  expired: number;
  limit: number;
  available: number;
}

export interface AccessCardRequestApartment {
  id: string;
  unitNumber: string;
  buildingName?: string;
}

export interface AccessCardRequestUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface AccessCardRequestIssuedCard {
  id: string;
  cardNumber: string;
}

export interface AccessCardRequest {
  id: string;
  apartmentId: string;
  requestedBy: string;
  cardType: AccessCardType;
  reason: string;
  status: AccessCardRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  issuedCardId?: string | null;
  apartment?: AccessCardRequestApartment;
  requester?: AccessCardRequestUser;
  reviewer?: AccessCardRequestUser | null;
  issuedCard?: AccessCardRequestIssuedCard | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessCardInput {
  apartmentId: string;
  holderId?: string;
  cardType: AccessCardType;
  accessZones?: string[];
  floorAccess?: number[];
  expiresAt?: string;
  notes?: string;
}

export interface UpdateAccessCardInput {
  accessZones?: string[];
  floorAccess?: number[];
  expiresAt?: string | null;
  notes?: string;
}

export interface DeactivateAccessCardInput {
  reason: DeactivationReason;
  notes?: string;
}

export interface AccessCardQueryParams {
  status?: AccessCardStatus;
  cardType?: AccessCardType;
}

export interface AccessCardRequestQueryParams {
  status?: AccessCardRequestStatus;
}

export interface CreateAccessCardRequestInput {
  apartmentId: string;
  cardType: AccessCardType;
  reason: string;
}

export interface ApproveAccessCardRequestInput {
  id: string;
  reviewNote?: string;
  accessZones?: string[];
  floorAccess?: number[];
  expiresAt?: string;
  cardNotes?: string;
}

export interface RejectAccessCardRequestInput {
  id: string;
  reviewNote: string;
}

// =====================
// Response Types
// =====================

interface AccessCardListResponse {
  data: AccessCard[];
  total: number;
  activeCount: number;
  limit: number;
}

interface AccessCardResponse {
  data: AccessCard;
}

interface AccessCardStatsResponse {
  data: AccessCardStats;
}

interface AccessCardRequestResponse {
  data: AccessCardRequest;
}

interface AccessCardRequestListResponse {
  data: AccessCardRequest[];
  total: number;
}

// =====================
// Query Keys
// =====================

export const accessCardKeys = {
  all: ['access-cards'] as const,
  lists: () => [...accessCardKeys.all, 'list'] as const,
  // For querying with specific params
  list: (apartmentId: string, params?: AccessCardQueryParams) =>
    [...accessCardKeys.lists(), apartmentId, params] as const,
  // For invalidating all lists for an apartment (partial match)
  listsByApartment: (apartmentId: string) =>
    [...accessCardKeys.lists(), apartmentId] as const,
  details: () => [...accessCardKeys.all, 'detail'] as const,
  detail: (id: string) => [...accessCardKeys.details(), id] as const,
  stats: (apartmentId: string) =>
    [...accessCardKeys.all, 'stats', apartmentId] as const,
  requests: ['access-card-requests'] as const,
  requestLists: () => [...accessCardKeys.requests, 'list'] as const,
  requestList: (params?: AccessCardRequestQueryParams) =>
    [...accessCardKeys.requestLists(), params] as const,
};

// =====================
// Query Hooks
// =====================

/**
 * Get all access cards for an apartment
 */
export function useAccessCards(
  apartmentId: string,
  params?: AccessCardQueryParams,
) {
  return useQuery({
    queryKey: accessCardKeys.list(apartmentId, params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.cardType) searchParams.append('cardType', params.cardType);

      const query = searchParams.toString();
      const url = `/apartments/${apartmentId}/access-cards${query ? `?${query}` : ''}`;

      return apiClient.get<AccessCardListResponse>(url);
    },
    enabled: !!apartmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get access card statistics for an apartment
 */
export function useAccessCardStats(apartmentId: string) {
  return useQuery({
    queryKey: accessCardKeys.stats(apartmentId),
    queryFn: () =>
      apiClient.get<AccessCardStatsResponse>(
        `/apartments/${apartmentId}/access-cards/stats`,
      ),
    enabled: !!apartmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get a single access card by ID
 */
export function useAccessCard(id: string) {
  return useQuery({
    queryKey: accessCardKeys.detail(id),
    queryFn: () => apiClient.get<AccessCardResponse>(`/access-cards/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get access card requests (admin view)
 */
export function useAccessCardRequests(params?: AccessCardRequestQueryParams) {
  return useQuery({
    queryKey: accessCardKeys.requestList(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);

      const query = searchParams.toString();
      const url = `/access-card-requests${query ? `?${query}` : ''}`;

      return apiClient.get<AccessCardRequestListResponse>(url);
    },
    staleTime: 60 * 1000,
  });
}

// =====================
// Mutation Hooks
// =====================

/**
 * Issue a new access card
 */
export function useIssueAccessCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccessCardInput) =>
      apiClient.post<AccessCardResponse>('/access-cards', data),
    onSuccess: (_, variables) => {
      // Invalidate all access card lists for this apartment (partial key match)
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.listsByApartment(variables.apartmentId),
      });
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.stats(variables.apartmentId),
      });
    },
  });
}

/**
 * Create a new access card request (resident flow)
 */
export function useCreateAccessCardRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccessCardRequestInput) =>
      apiClient.post<AccessCardRequestResponse>(
        `/apartments/${data.apartmentId}/access-card-requests`,
        {
          cardType: data.cardType,
          reason: data.reason,
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessCardKeys.requestLists() });
    },
  });
}

/**
 * Approve an access card request and issue card
 */
export function useApproveAccessCardRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: ApproveAccessCardRequestInput) =>
      apiClient.post<AccessCardRequestResponse>(
        `/access-card-requests/${id}/approve`,
        data,
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: accessCardKeys.requestLists() });
      const apartmentId = result.data.apartmentId;
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.listsByApartment(apartmentId),
      });
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.stats(apartmentId),
      });
    },
  });
}

/**
 * Reject an access card request
 */
export function useRejectAccessCardRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reviewNote }: RejectAccessCardRequestInput) =>
      apiClient.post<AccessCardRequestResponse>(
        `/access-card-requests/${id}/reject`,
        { reviewNote },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessCardKeys.requestLists() });
    },
  });
}

/**
 * Update an access card's zones or floor access
 */
export function useUpdateAccessCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateAccessCardInput;
    }) => apiClient.patch<AccessCardResponse>(`/access-cards/${id}`, data),
    onSuccess: (result) => {
      const card = result.data;
      // Invalidate all access card lists for this apartment (partial key match)
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.listsByApartment(card.apartmentId),
      });
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.stats(card.apartmentId),
      });
      // Update the individual card cache
      queryClient.setQueryData(accessCardKeys.detail(card.id), result);
    },
  });
}

/**
 * Deactivate an access card
 */
export function useDeactivateAccessCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: DeactivateAccessCardInput;
    }) =>
      apiClient.post<AccessCardResponse>(`/access-cards/${id}/deactivate`, {
        json: data,
      }),
    onSuccess: (result) => {
      const card = result.data;
      // Invalidate all access card lists for this apartment (partial key match)
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.listsByApartment(card.apartmentId),
      });
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.stats(card.apartmentId),
      });
      // Update the individual card cache
      queryClient.setQueryData(accessCardKeys.detail(card.id), result);
    },
  });
}

/**
 * Reactivate a deactivated or lost access card
 */
export function useReactivateAccessCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<AccessCardResponse>(`/access-cards/${id}/reactivate`),
    onSuccess: (result) => {
      const card = result.data;
      // Invalidate all access card lists for this apartment (partial key match)
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.listsByApartment(card.apartmentId),
      });
      queryClient.invalidateQueries({
        queryKey: accessCardKeys.stats(card.apartmentId),
      });
      // Update the individual card cache
      queryClient.setQueryData(accessCardKeys.detail(card.id), result);
    },
  });
}

// =====================
// Utility Functions
// =====================

/**
 * Get display text for card status
 */
export function getStatusLabel(status: AccessCardStatus): string {
  const labels: Record<AccessCardStatus, string> = {
    active: 'Active',
    lost: 'Lost',
    deactivated: 'Deactivated',
    expired: 'Expired',
  };
  return labels[status];
}

/**
 * Get display text for card type
 */
export function getCardTypeLabel(type: AccessCardType): string {
  const labels: Record<AccessCardType, string> = {
    building: 'Building',
    parking: 'Parking',
  };
  return labels[type];
}

/**
 * Get display text for deactivation reason
 */
export function getReasonLabel(reason: DeactivationReason): string {
  const labels: Record<DeactivationReason, string> = {
    lost: 'Lost',
    stolen: 'Stolen',
    resident_left: 'Resident Left',
    admin_action: 'Admin Action',
  };
  return labels[reason];
}

/**
 * Get status badge variant
 */
export function getStatusVariant(
  status: AccessCardStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'lost':
      return 'destructive';
    case 'deactivated':
      return 'secondary';
    case 'expired':
      return 'outline';
    default:
      return 'outline';
  }
}

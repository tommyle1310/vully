'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Contract {
  id: string;
  apartmentId: string;
  tenantId: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  start_date: string;
  endDate?: string;
  rentAmount: number;
  depositMonths: number;
  depositAmount?: number;
  citizenId?: string;
  numberOfResidents?: number;
  termsNotes?: string;
  created_at: string;
  updatedAt: string;
  apartment?: {
    id: string;
    unit_number: string;
    floorIndex: number;
    buildingId: string;
    building?: {
      id: string;
      name: string;
    };
  };
  tenant?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface ContractFilters {
  page?: number;
  limit?: number;
  apartmentId?: string;
  tenantId?: string;
  status?: string;
}

interface ContractsResponse {
  data: Contract[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface ContractResponse {
  data: Contract;
}

export interface CreateContractInput {
  apartmentId: string;
  tenantId: string;
  start_date: string;
  endDate?: string;
  rentAmount: number;
  depositMonths?: number;
  depositAmount?: number;
  citizenId?: string;
  numberOfResidents?: number;
  termsNotes?: string;
}

export interface UpdateContractInput {
  status?: 'draft' | 'active' | 'expired' | 'terminated';
  endDate?: string;
  rentAmount?: number;
  citizenId?: string;
  numberOfResidents?: number;
  depositAmount?: number;
  termsNotes?: string;
}

export interface TerminateContractInput {
  end_date: string;
  reason?: string;
}

export function useContracts(filters: ContractFilters = {}) {
  const queryString = new URLSearchParams();

  if (filters.page) queryString.set('page', String(filters.page));
  if (filters.limit) queryString.set('limit', String(filters.limit));
  if (filters.apartmentId) queryString.set('apartmentId', filters.apartmentId);
  if (filters.tenantId) queryString.set('tenantId', filters.tenantId);
  if (filters.status) queryString.set('status', filters.status);

  const endpoint = `/contracts${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['contracts', filters],
    queryFn: () => apiClient.get<ContractsResponse>(endpoint),
    staleTime: 5 * 60 * 1000,
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contracts', id],
    queryFn: () => apiClient.get<ContractResponse>(`/contracts/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateContractInput) => {
      return apiClient.post<ContractResponse>('/contracts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractInput }) => {
      return apiClient.patch<ContractResponse>(`/contracts/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] });
    },
  });
}

export function useTerminateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TerminateContractInput }) => {
      return apiClient.post<ContractResponse>(`/contracts/${id}/terminate`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

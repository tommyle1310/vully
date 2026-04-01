'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface MeterReading {
  id: string;
  apartmentId: string;
  utilityTypeId: string;
  currentValue: number;
  previousValue?: number;
  usage: number;
  billingPeriod: string;
  readingDate: string;
  recordedById?: string;
  imageProofUrl?: string;
  created_at: string;
  apartment?: {
    id: string;
    unit_number: string;
    buildings: {
      id: string;
      name: string;
    };
  };
  utilityType?: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  recordedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface MeterReadingFilters {
  page?: number;
  limit?: number;
  apartmentId?: string;
  utilityTypeId?: string;
  billingPeriod?: string;
}

interface MeterReadingsResponse {
  data: MeterReading[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface MeterReadingResponse {
  data: MeterReading;
}

export interface CreateMeterReadingDto {
  apartmentId: string;
  utilityTypeId: string;
  currentValue: number;
  previousValue?: number;
  billingPeriod: string;
  readingDate: string;
  imageProofUrl?: string;
}

export interface UpdateMeterReadingDto {
  currentValue?: number;
  readingDate?: string;
  imageProofUrl?: string;
}

// List meter readings
export function useMeterReadings(filters: MeterReadingFilters = {}) {
  const queryParams = new URLSearchParams();
  
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.apartmentId) queryParams.set('apartmentId', filters.apartmentId);
  if (filters.utilityTypeId) queryParams.set('utilityTypeId', filters.utilityTypeId);
  if (filters.billingPeriod) queryParams.set('billingPeriod', filters.billingPeriod);

  return useQuery({
    queryKey: ['meter-readings', filters],
    queryFn: async (): Promise<MeterReadingsResponse> => {
      const url = `/meter-readings?${queryParams.toString()}`;
      return apiClient.get<MeterReadingsResponse>(url);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get single meter reading
export function useMeterReading(id: string) {
  return useQuery({
    queryKey: ['meter-readings', id],
    queryFn: async (): Promise<MeterReadingResponse> => {
      return apiClient.get<MeterReadingResponse>(`/meter-readings/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get latest readings for an apartment
export function useLatestMeterReadings(apartmentId: string) {
  return useQuery({
    queryKey: ['meter-readings', 'latest', apartmentId],
    queryFn: async (): Promise<{ data: MeterReading[] }> => {
      return apiClient.get<{ data: MeterReading[] }>(
        `/meter-readings/apartment/${apartmentId}/latest`,
      );
    },
    enabled: !!apartmentId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create meter reading
export function useCreateMeterReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateMeterReadingDto): Promise<MeterReadingResponse> => {
      return apiClient.post<MeterReadingResponse>('/meter-readings', dto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      queryClient.invalidateQueries({ 
        queryKey: ['meter-readings', 'latest', variables.apartmentId] 
      });
    },
  });
}

// Update meter reading
export function useUpdateMeterReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMeterReadingDto;
    }): Promise<MeterReadingResponse> => {
      return apiClient.patch<MeterReadingResponse>(`/meter-readings/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      queryClient.invalidateQueries({ queryKey: ['meter-readings', variables.id] });
    },
  });
}

// Delete meter reading
export function useDeleteMeterReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/meter-readings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
    },
  });
}

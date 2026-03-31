import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Apartment {
  id: string;
  unitNumber: string;
  floor: number;
  areaSqm?: number;
  bedroomCount: number;
  bathroomCount: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  buildingId: string;
  building?: {
    id: string;
    name: string;
    address: string;
  };
  features: Record<string, unknown>;
  svgElementId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApartmentFilters {
  buildingId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface ApartmentsResponse {
  data: Apartment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ApartmentResponse {
  data: Apartment;
}

export interface CreateApartmentInput {
  buildingId: string;
  unitNumber: string;
  floor: number;
  areaSqm?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  features?: Record<string, unknown>;
}

export interface UpdateApartmentInput {
  buildingId?: string;
  unitNumber?: string;
  floor?: number;
  areaSqm?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  features?: Record<string, unknown>;
  status?: string;
}

export function useApartments(filters: ApartmentFilters = {}) {
  const queryString = new URLSearchParams();
  
  if (filters.buildingId) queryString.set('buildingId', filters.buildingId);
  if (filters.status) queryString.set('status', filters.status);
  if (filters.page) queryString.set('page', String(filters.page));
  if (filters.limit) queryString.set('limit', String(filters.limit));

  const endpoint = `/apartments${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['apartments', filters],
    queryFn: () => apiClient.get<ApartmentsResponse>(endpoint),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useApartment(id: string) {
  return useQuery({
    queryKey: ['apartments', id],
    queryFn: () => apiClient.get<ApartmentResponse>(`/apartments/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateApartmentInput) => {
      return apiClient.post<ApartmentResponse>('/apartments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateApartmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiClient.patch<ApartmentResponse>(`/apartments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateApartmentInput }) => {
      return apiClient.patch<ApartmentResponse>(`/apartments/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      queryClient.invalidateQueries({ queryKey: ['apartments', variables.id] });
    },
  });
}

export function useDeleteApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/apartments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

// Buildings
export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  floorCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BuildingsResponse {
  data: Building[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.get<BuildingsResponse>('/buildings'),
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
  });
}

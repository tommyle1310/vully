import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  ApartmentFilters,
  ApartmentsResponse,
  ApartmentResponse,
  BuildingsResponse,
  EffectiveConfigResponse,
  ApartmentParkingSlotsResponse,
} from './apartment.types';

export function useApartments(filters: ApartmentFilters = {}) {
  const queryString = new URLSearchParams();
  
  if (filters.buildingId) queryString.set('buildingId', filters.buildingId);
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach(s => queryString.append('status', s));
  }
  if (filters.unitType) {
    const types = Array.isArray(filters.unitType) ? filters.unitType : [filters.unitType];
    types.forEach(t => queryString.append('unitType', t));
  }
  if (filters.minBedrooms !== undefined) queryString.set('minBedrooms', String(filters.minBedrooms));
  if (filters.maxBedrooms !== undefined) queryString.set('maxBedrooms', String(filters.maxBedrooms));
  if (filters.minFloor !== undefined) queryString.set('minFloor', String(filters.minFloor));
  if (filters.maxFloor !== undefined) queryString.set('maxFloor', String(filters.maxFloor));
  if (filters.minArea !== undefined) queryString.set('minArea', String(filters.minArea));
  if (filters.maxArea !== undefined) queryString.set('maxArea', String(filters.maxArea));
  if (filters.search) queryString.set('search', filters.search);
  if (filters.page) queryString.set('page', String(filters.page));
  if (filters.limit) queryString.set('limit', String(filters.limit));

  const endpoint = `/apartments${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['apartments', filters],
    queryFn: () => apiClient.get<ApartmentsResponse>(endpoint),
    staleTime: 5 * 60 * 1000,
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

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: () => apiClient.get<BuildingsResponse>('/buildings'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useApartmentEffectiveConfig(apartmentId: string) {
  return useQuery({
    queryKey: ['apartments', apartmentId, 'effective-config'],
    queryFn: () => apiClient.get<EffectiveConfigResponse>(`/apartments/${apartmentId}/effective-config`),
    enabled: !!apartmentId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useApartmentParkingSlots(apartmentId: string) {
  return useQuery({
    queryKey: ['apartments', apartmentId, 'parking-slots'],
    queryFn: () => apiClient.get<ApartmentParkingSlotsResponse>(`/apartments/${apartmentId}/parking-slots`),
    enabled: !!apartmentId,
    staleTime: 5 * 60 * 1000,
  });
}

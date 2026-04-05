import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  floorCount: number;
  floorHeights?: Record<string, number>;
  svgMapData?: string;
  amenities: string[];
  isActive: boolean;
  created_at: string;
  updatedAt: string;
  apartmentCount?: number;
}

export interface BuildingFilters {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

interface BuildingsResponse {
  data: Building[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface BuildingResponse {
  data: Building;
}

export interface CreateBuildingInput {
  name: string;
  address: string;
  city: string;
  floorCount: number;
  floorHeights?: Record<string, number>;
  svgMapData?: string;
  amenities?: string[];
}

export interface UpdateBuildingInput {
  name?: string;
  address?: string;
  city?: string;
  floorCount?: number;
  floorHeights?: Record<string, number>;
  svgMapData?: string;
  amenities?: string[];
  isActive?: boolean;
}

export function useBuildings(filters: BuildingFilters = {}) {
  const queryString = new URLSearchParams();
  
  if (filters.includeInactive) queryString.set('includeInactive', 'true');
  if (filters.page) queryString.set('page', String(filters.page));
  if (filters.limit) queryString.set('limit', String(filters.limit));

  const endpoint = `/buildings${queryString.toString() ? `?${queryString}` : ''}`;

  return useQuery({
    queryKey: ['buildings', filters],
    queryFn: () => apiClient.get<BuildingsResponse>(endpoint),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useBuilding(id: string) {
  return useQuery({
    queryKey: ['buildings', id],
    queryFn: () => apiClient.get<BuildingResponse>(`/buildings/${id}`),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBuildingInput) =>
      apiClient.post<BuildingResponse>('/buildings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      // Apartments are auto-created from SVG on the backend, invalidate cache
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBuildingInput }) =>
      apiClient.patch<BuildingResponse>(`/buildings/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.id] });
    },
  });
}

export function useUpdateBuildingSvgMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, svgMapData }: { id: string; svgMapData: string }) =>
      apiClient.patch<BuildingResponse>(`/buildings/${id}/svg-map`, { svgMapData }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.id] });
      // Apartments are auto-synced from SVG on the backend, invalidate cache
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

// Building Stats
export interface BuildingStats {
  totalApartments: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  reserved: number;
  occupancyRate: number;
}

interface BuildingStatsResponse {
  data: BuildingStats;
}

/**
 * Get building occupancy statistics
 */
export function useBuildingStats(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'stats'],
    queryFn: () => apiClient.get<BuildingStatsResponse>(`/buildings/${buildingId}/stats`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

// Building Meters
export interface MeterInfo {
  apartmentId: string;
  unitNumber: string;
  electricMeterId?: string | null;
  waterMeterId?: string | null;
  gasMeterId?: string | null;
}

export interface BuildingMeters {
  meters: MeterInfo[];
  duplicates: string[];
}

interface BuildingMetersResponse {
  data: BuildingMeters;
}

/**
 * Get all meter IDs for apartments in a building with duplicate detection
 */
export function useBuildingMeters(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'meters'],
    queryFn: () => apiClient.get<BuildingMetersResponse>(`/buildings/${buildingId}/meters`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

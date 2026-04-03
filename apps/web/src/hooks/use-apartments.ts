import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Apartment {
  id: string;
  buildingId: string;
  unit_number: string;
  floorIndex: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';

  // Spatial
  apartmentCode?: string | null;
  floorLabel?: string | null;
  unitType?: string | null;
  netArea?: number | null;
  grossArea?: number | null;
  ceilingHeight?: number | null;
  bedroomCount: number;
  bathroomCount: number;
  features: Record<string, unknown>;
  svgElementId?: string | null;
  svgPathData?: string | null;
  centroidX?: number | null;
  centroidY?: number | null;
  orientation?: string | null;
  balconyDirection?: string | null;
  isCornerUnit: boolean;

  // Ownership & Legal
  ownerId?: string | null;
  ownershipType?: string | null;
  handoverDate?: string | null;
  warrantyExpiryDate?: string | null;
  isRented: boolean;
  vatRate?: number | null;

  // Occupancy
  maxResidents?: number | null;
  currentResidentCount: number;
  petAllowed?: boolean | null;
  petLimit?: number | null;
  accessCardLimit?: number | null;
  intercomCode?: string | null;

  // Utility & Technical
  electricMeterId?: string | null;
  waterMeterId?: string | null;
  gasMeterId?: string | null;
  powerCapacity?: number | null;
  acUnitCount?: number | null;
  fireDetectorId?: string | null;
  sprinklerCount?: number | null;
  internetTerminalLoc?: string | null;

  // Parking & Assets
  assignedCarSlot?: string | null;
  assignedMotoSlot?: string | null;
  mailboxNumber?: string | null;
  storageUnitId?: string | null;

  // Billing Config
  mgmtFeeConfigId?: string | null;
  billingStartDate?: string | null;
  billingCycle: string;
  bankAccountVirtual?: string | null;
  lateFeeWaived: boolean;

  // System Logic
  parentUnitId?: string | null;
  isMerged: boolean;
  syncStatus: string;
  portalAccessEnabled: boolean;
  technicalDrawingUrl?: string | null;
  notesAdmin?: string | null;

  // Relations & Meta
  building?: {
    id: string;
    name: string;
    address: string;
  };
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  activeContract?: {
    id: string;
    tenant: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    monthlyRent: number;
    startDate: string;
    endDate?: string | null;
    status: string;
  } | null;
  created_at: string;
  updatedAt: string;
}

export interface ApartmentFilters {
  buildingId?: string;
  status?: string | string[];
  unitType?: string | string[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minFloor?: number;
  maxFloor?: number;
  minArea?: number;
  maxArea?: number;
  search?: string;
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
  unit_number: string;
  floorIndex: number;
  apartmentCode?: string;
  floorLabel?: string;
  unitType?: string;
  netArea?: number;
  grossArea?: number;
  ceilingHeight?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  orientation?: string;
  balconyDirection?: string;
  isCornerUnit?: boolean;
  features?: Record<string, unknown>;
  svgElementId?: string;
}

export interface UpdateApartmentInput {
  // Spatial (building-managed: buildingId, unit_number, floorIndex read-only in edit)
  buildingId?: string;
  unit_number?: string;
  floorIndex?: number;
  apartmentCode?: string;
  floorLabel?: string;
  unitType?: string;
  netArea?: number;
  grossArea?: number;
  ceilingHeight?: number;
  bedroomCount?: number;
  bathroomCount?: number;
  orientation?: string;
  balconyDirection?: string;
  isCornerUnit?: boolean;
  features?: Record<string, unknown>;
  status?: string;
  // Ownership & Legal
  ownerId?: string | null;
  ownershipType?: string | null;
  handoverDate?: string | null;
  warrantyExpiryDate?: string | null;
  isRented?: boolean;
  vatRate?: number | null;
  // Occupancy
  maxResidents?: number | null;
  currentResidentCount?: number;
  petAllowed?: boolean | null;
  petLimit?: number | null;
  accessCardLimit?: number | null;
  intercomCode?: string | null;
  // Utility & Technical
  electricMeterId?: string | null;
  waterMeterId?: string | null;
  gasMeterId?: string | null;
  powerCapacity?: number | null;
  acUnitCount?: number | null;
  fireDetectorId?: string | null;
  sprinklerCount?: number | null;
  internetTerminalLoc?: string | null;
  // Parking & Assets
  assignedCarSlot?: string | null;
  assignedMotoSlot?: string | null;
  mailboxNumber?: string | null;
  storageUnitId?: string | null;
  // Billing Config
  mgmtFeeConfigId?: string | null;
  billingStartDate?: string | null;
  billingCycle?: string;
  bankAccountVirtual?: string | null;
  lateFeeWaived?: boolean;
  // System Logic
  parentUnitId?: string | null;
  isMerged?: boolean;
  syncStatus?: string;
  portalAccessEnabled?: boolean;
  technicalDrawingUrl?: string | null;
  notesAdmin?: string | null;
}

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
  created_at: string;
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

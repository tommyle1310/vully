import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// =====================
// Types
// =====================

export type ParkingType = 'car' | 'motorcycle' | 'bicycle';
export type ParkingSlotStatus = 'available' | 'assigned' | 'reserved' | 'maintenance';

export interface ParkingZone {
  id: string;
  buildingId: string;
  name: string;
  code: string;
  slotType: ParkingType;
  totalSlots: number;
  feePerMonth: number | null;
  isActive: boolean;
  createdAt: string;
  availableSlots?: number;
  assignedSlots?: number;
}

export interface ParkingSlot {
  id: string;
  zoneId: string;
  slotNumber: string;
  fullCode: string;
  assignedAptId: string | null;
  assignedAptCode: string | null;
  assignedAt: string | null;
  feeOverride: number | null;
  status: ParkingSlotStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  effectiveFee: number | null;
}

export interface ParkingStats {
  totalZones: number;
  totalSlots: number;
  availableSlots: number;
  assignedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  byType: {
    car: { total: number; available: number; assigned: number };
    motorcycle: { total: number; available: number; assigned: number };
    bicycle: { total: number; available: number; assigned: number };
  };
}

export interface CreateParkingZoneInput {
  name: string;
  code: string;
  slotType: ParkingType;
  totalSlots: number;
  feePerMonth?: number;
}

export interface UpdateParkingZoneInput extends Partial<CreateParkingZoneInput> {
  isActive?: boolean;
}

export interface CreateParkingSlotsInput {
  count: number;
  startNumber?: number;
}

export interface UpdateParkingSlotInput {
  status?: ParkingSlotStatus;
  feeOverride?: number | null;
  notes?: string;
}

export interface AssignSlotInput {
  apartmentId: string;
}

// =====================
// Response Types
// =====================

interface ZonesResponse {
  data: ParkingZone[];
}

interface ZoneResponse {
  data: ParkingZone;
}

interface SlotsResponse {
  data: ParkingSlot[];
}

interface SlotResponse {
  data: ParkingSlot;
}

interface StatsResponse {
  data: ParkingStats;
}

// =====================
// Zone Hooks
// =====================

/**
 * Get parking statistics for a building
 */
export function useParkingStats(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'parking', 'stats'],
    queryFn: () => 
      apiClient.get<StatsResponse>(`/buildings/${buildingId}/parking/stats`),
    enabled: !!buildingId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get all parking zones for a building
 */
export function useParkingZones(buildingId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'parking', 'zones'],
    queryFn: () => 
      apiClient.get<ZonesResponse>(`/buildings/${buildingId}/parking/zones`),
    enabled: !!buildingId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific parking zone
 */
export function useParkingZone(buildingId: string, zoneId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'parking', 'zones', zoneId],
    queryFn: () => 
      apiClient.get<ZoneResponse>(`/buildings/${buildingId}/parking/zones/${zoneId}`),
    enabled: !!buildingId && !!zoneId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new parking zone
 */
export function useCreateParkingZone(buildingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateParkingZoneInput) =>
      apiClient.post<ZoneResponse>(`/buildings/${buildingId}/parking/zones`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
    },
  });
}

/**
 * Update a parking zone
 */
export function useUpdateParkingZone(buildingId: string, zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateParkingZoneInput) =>
      apiClient.patch<ZoneResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
    },
  });
}

// =====================
// Slot Hooks
// =====================

/**
 * Get all slots for a parking zone
 */
export function useParkingSlots(buildingId: string, zoneId: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'parking', 'zones', zoneId, 'slots'],
    queryFn: () => 
      apiClient.get<SlotsResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}/slots`
      ),
    enabled: !!buildingId && !!zoneId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Bulk create parking slots
 */
export function useCreateParkingSlots(buildingId: string, zoneId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateParkingSlotsInput) =>
      apiClient.post<SlotsResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}/slots`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
    },
  });
}

/**
 * Update a parking slot
 */
export function useUpdateParkingSlot(buildingId: string, zoneId: string, slotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateParkingSlotInput) =>
      apiClient.patch<SlotResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}/slots/${slotId}`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
    },
  });
}

/**
 * Assign a slot to an apartment
 */
export function useAssignParkingSlot(buildingId: string, zoneId: string, slotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignSlotInput) =>
      apiClient.post<SlotResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}/slots/${slotId}/assign`,
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
      // Also invalidate apartments that may display parking info
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

/**
 * Unassign a slot from an apartment
 */
export function useUnassignParkingSlot(buildingId: string, zoneId: string, slotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<SlotResponse>(
        `/buildings/${buildingId}/parking/zones/${zoneId}/slots/${slotId}/unassign`,
        {}
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['buildings', buildingId, 'parking'] 
      });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

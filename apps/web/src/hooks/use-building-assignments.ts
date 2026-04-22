import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BuildingAssignment {
  id: string;
  user_id: string;
  building_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
  building_name?: string;
  building_address?: string;
}

export interface BuildingStaffMember {
  id: string;
  user_id: string;
  building_id: string;
  role: string;
  assigned_at: string;
  assigned_by?: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

// Get all building assignments for a user
export function useUserBuildingAssignments(userId: string | null) {
  return useQuery({
    queryKey: ['users', userId, 'building-assignments'],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${userId}/building-assignments`);
      return res.data as BuildingAssignment[];
    },
    enabled: !!userId,
  });
}

// Get all staff for a building
export function useBuildingStaff(buildingId: string | null, role?: string) {
  return useQuery({
    queryKey: ['buildings', buildingId, 'staff', role],
    queryFn: async () => {
      const params = role ? `?role=${role}` : '';
      const res = await apiClient.get(`/buildings/${buildingId}/staff${params}`);
      return res.data as BuildingStaffMember[];
    },
    enabled: !!buildingId,
  });
}

// Assign user to building
export function useAssignUserToBuilding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      buildingId,
      role,
    }: {
      userId: string;
      buildingId: string;
      role: string;
    }) => {
      const res = await apiClient.post(`/users/${userId}/building-assignments`, {
        buildingId,
        role,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId, 'building-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.buildingId, 'staff'] });
    },
  });
}

// Update assignment role
export function useUpdateBuildingAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      buildingId,
      role,
    }: {
      userId: string;
      buildingId: string;
      role: string;
    }) => {
      const res = await apiClient.patch(`/users/${userId}/building-assignments/${buildingId}`, {
        role,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId, 'building-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.buildingId, 'staff'] });
    },
  });
}

// Remove user from building
export function useRemoveBuildingAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      buildingId,
    }: {
      userId: string;
      buildingId: string;
    }) => {
      await apiClient.delete(`/users/${userId}/building-assignments/${buildingId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.userId, 'building-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', variables.buildingId, 'staff'] });
    },
  });
}

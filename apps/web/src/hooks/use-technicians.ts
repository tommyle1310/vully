import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TechnicianWorkload {
  assigned: number;
  inProgress: number;
  pendingReview: number;
  total: number;
}

export interface TechnicianListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileData: {
    avatarUrl?: string;
    specialties?: string[];
    availabilityStatus?: string;
  };
  workload: TechnicianWorkload;
}

export interface TechnicianDashboardStats {
  assignedCount: number;
  inProgressCount: number;
  pendingReviewCount: number;
  resolvedThisMonth: number;
  avgResolutionHours: number;
  urgentCount: number;
}

export interface UpdateTechnicianProfileData {
  specialties?: string[];
  availabilityStatus?: 'available' | 'busy' | 'off_duty';
  shiftPreferences?: {
    preferredShift?: 'morning' | 'afternoon' | 'night';
    maxConcurrentJobs?: number;
  };
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const technicianKeys = {
  all: ['technicians'] as const,
  list: () => [...technicianKeys.all, 'list'] as const,
  dashboard: (userId: string) => [...technicianKeys.all, 'dashboard', userId] as const,
  profile: (userId: string) => [...technicianKeys.all, 'profile', userId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useTechnicians() {
  return useQuery({
    queryKey: technicianKeys.list(),
    queryFn: () =>
      apiClient.get<{ data: TechnicianListItem[] }>('/users/technicians'),
    staleTime: 2 * 60 * 1000, // 2 min — matches backend cache TTL
  });
}

export function useTechnicianDashboardStats(userId: string) {
  return useQuery({
    queryKey: technicianKeys.dashboard(userId),
    queryFn: () =>
      apiClient.get<{ data: TechnicianDashboardStats }>('/stats/technician-dashboard'),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 min
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useUpdateTechnicianProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateTechnicianProfileData }) =>
      apiClient.patch(`/users/${userId}/technician-profile`, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: technicianKeys.list() });
      queryClient.invalidateQueries({ queryKey: technicianKeys.profile(userId) });
    },
  });
}

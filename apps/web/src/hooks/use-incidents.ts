import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
} from '@vully/shared-types';

// Types
export interface Incident {
  id: string;
  apartmentId: string;
  apartment?: {
    id: string;
    unitNumber: string;
    building?: {
      id: string;
      name: string;
    };
  };
  reportedById: string;
  reportedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  imageUrls: string[];
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  apartmentId?: string;
  buildingId?: string;
  assignedToId?: string;
  reportedById?: string;
  search?: string;
}

export interface CreateIncidentData {
  title: string;
  description: string;
  category: IncidentCategory;
  priority?: IncidentPriority;
  apartmentId: string;
  imageUrls?: string[];
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  imageUrls?: string[];
}

export interface UpdateIncidentStatusData {
  status: IncidentStatus;
  resolutionNotes?: string;
}

export interface AssignTechnicianData {
  technicianId: string;
}

export interface CreateCommentData {
  content: string;
  isInternal?: boolean;
}

// Query Keys
export const incidentKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentKeys.all, 'list'] as const,
  list: (filters: IncidentFilters, page: number, limit: number) =>
    [...incidentKeys.lists(), { filters, page, limit }] as const,
  my: (filters: IncidentFilters, page: number, limit: number) =>
    [...incidentKeys.all, 'my', { filters, page, limit }] as const,
  details: () => [...incidentKeys.all, 'detail'] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  comments: (incidentId: string) =>
    [...incidentKeys.all, 'comments', incidentId] as const,
};

// Response Types
interface IncidentsResponse {
  data: Incident[];
  meta: { total: number; page: number; limit: number; pages: number };
}

interface IncidentResponse {
  data: Incident;
}

interface CommentsResponse {
  data: IncidentComment[];
}

// =============================================================================
// INCIDENTS QUERIES
// =============================================================================

export function useIncidents(
  filters: IncidentFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: incidentKeys.list(filters, page, limit),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      });

      return apiClient.get<IncidentsResponse>(`/incidents?${params.toString()}`);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMyIncidents(
  filters: IncidentFilters = {},
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: incidentKeys.my(filters, page, limit),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      });

      return apiClient.get<IncidentsResponse>(`/incidents/my?${params.toString()}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => apiClient.get<IncidentResponse>(`/incidents/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useIncidentComments(incidentId: string) {
  return useQuery({
    queryKey: incidentKeys.comments(incidentId),
    queryFn: () => apiClient.get<CommentsResponse>(`/incidents/${incidentId}/comments`),
    enabled: !!incidentId,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// INCIDENTS MUTATIONS
// =============================================================================

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIncidentData) => {
      return apiClient.post<IncidentResponse>('/incidents', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateIncidentData;
    }) => {
      return apiClient.patch<IncidentResponse>(`/incidents/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return apiClient.delete<void>(`/incidents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

export function useAssignTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      technicianId,
    }: {
      incidentId: string;
      technicianId: string;
    }) => {
      return apiClient.patch<IncidentResponse>(`/incidents/${incidentId}/assign`, {
        technicianId,
      });
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: string;
      data: UpdateIncidentStatusData;
    }) => {
      return apiClient.patch<IncidentResponse>(
        `/incidents/${incidentId}/status`,
        data
      );
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

// =============================================================================
// COMMENT MUTATIONS
// =============================================================================

interface CommentResponse {
  data: IncidentComment;
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: string;
      data: CreateCommentData;
    }) => {
      return apiClient.post<CommentResponse>(
        `/incidents/${incidentId}/comments`,
        data
      );
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.comments(incidentId),
      });
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
      isInternal,
    }: {
      commentId: string;
      content?: string;
      isInternal?: boolean;
    }) => {
      return apiClient.patch<CommentResponse>(`/incidents/comments/${commentId}`, {
        content,
        isInternal,
      });
    },
    onSuccess: () => {
      // Invalidate all comments queries since we don't have incidentId here
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => {
      return apiClient.delete<void>(`/incidents/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
  WS_EVENTS,
  WS_ROOMS,
  IncidentEventPayload,
} from '@vully/shared-types';
import { useWebSocketEvent, useWebSocket } from './use-websocket';
import { useToast } from './use-toast';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

// Types
export interface Incident {
  id: string;
  apartmentId: string;
  apartment?: {
    id: string;
    unit_number: string;
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
  resolved_at?: string;
  resolutionNotes?: string;
  created_at: string;
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
  created_at: string;
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

// =============================================================================
// REAL-TIME INCIDENT UPDATES
// =============================================================================

interface UseIncidentRealTimeOptions {
  buildingId?: string;
  apartmentId?: string;
  showToasts?: boolean;
}

/**
 * Hook to enable real-time incident updates via WebSocket
 * Automatically joins relevant rooms and listens for incident events
 */
export function useIncidentRealTime(options: UseIncidentRealTimeOptions = {}) {
  const { buildingId, apartmentId, showToasts = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { joinRoom, leaveRoom, connected } = useWebSocket();

  // Join building/apartment rooms when connected
  useEffect(() => {
    if (!connected) return;

    const rooms: string[] = [];

    if (buildingId) {
      rooms.push(WS_ROOMS.buildings(buildingId));
    }

    if (apartmentId) {
      rooms.push(WS_ROOMS.apartments(apartmentId));
    }

    rooms.forEach((room) => joinRoom(room));

    return () => {
      rooms.forEach((room) => leaveRoom(room));
    };
  }, [connected, buildingId, apartmentId, joinRoom, leaveRoom]);

  // Listen for incident:created events
  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_CREATED,
    (payload) => {
      console.log('[Incidents] New incident created:', payload);

      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

      // Show toast notification
      if (showToasts && user?.id !== payload.assignedTo) {
        toast({
          title: '🆕 New Incident',
          description: `${payload.title} - ${payload.status}`,
          duration: 5000,
        });
      }
    },
    [showToasts, user?.id]
  );

  // Listen for incident:updated events
  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_UPDATED,
    (payload) => {
      console.log('[Incidents] Incident updated:', payload);

      // Invalidate specific incident and lists
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

      // Show toast notification
      if (showToasts) {
        toast({
          title: '🔄 Incident Updated',
          description: `${payload.title} - ${payload.status}`,
          duration: 4000,
        });
      }
    },
    [showToasts]
  );

  // Listen for incident:assigned events (only for assigned technician)
  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_ASSIGNED,
    (payload) => {
      console.log('[Incidents] Incident assigned:', payload);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });

      // Show toast if assigned to current user
      if (showToasts && payload.assignedTo === user?.id) {
        toast({
          title: '👷 New Assignment',
          description: `You've been assigned: ${payload.title}`,
          duration: 6000,
          variant: 'default',
        });
      }
    },
    [showToasts, user?.id]
  );

  // Listen for incident:resolved events
  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_RESOLVED,
    (payload) => {
      console.log('[Incidents] Incident resolved:', payload);

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

      // Show success toast
      if (showToasts) {
        toast({
          title: '✅ Incident Resolved',
          description: `${payload.title} has been resolved`,
          duration: 5000,
        });
      }
    },
    [showToasts]
  );

  return {
    connected,
  };
}

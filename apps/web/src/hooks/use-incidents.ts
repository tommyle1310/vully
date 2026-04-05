import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  WS_EVENTS,
  WS_ROOMS,
  IncidentEventPayload,
  IncidentCommentEventPayload,
} from '@vully/shared-types';
import { useWebSocketEvent, useWebSocket } from './use-websocket';
import { useToast } from './use-toast';
import { useAuthStore } from '@/stores/authStore';
import { incidentKeys } from './incident.types';

// Barrel re-exports
export type {
  Incident,
  IncidentComment,
  IncidentFilters,
  CreateIncidentData,
  UpdateIncidentData,
  UpdateIncidentStatusData,
  AssignTechnicianData,
  CreateCommentData,
  IncidentsResponse,
  IncidentResponse,
  CommentsResponse,
  CommentResponse,
} from './incident.types';
export { incidentKeys } from './incident.types';
export {
  useIncidents,
  useMyIncidents,
  useIncident,
  useIncidentComments,
} from './use-incident-queries';
export {
  useCreateIncident,
  useUpdateIncident,
  useDeleteIncident,
  useAssignTechnician,
  useUpdateIncidentStatus,
} from './use-incident-mutations';
export {
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from './use-incident-comments';

// =============================================================================
// REAL-TIME INCIDENT UPDATES
// =============================================================================

interface UseIncidentRealTimeOptions {
  buildingId?: string;
  apartmentId?: string;
  showToasts?: boolean;
}

export function useIncidentRealTime(options: UseIncidentRealTimeOptions = {}) {
  const { buildingId, apartmentId, showToasts = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { joinRoom, leaveRoom, connected } = useWebSocket();

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

  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_CREATED,
    (payload) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

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

  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_UPDATED,
    (payload) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

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

  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_ASSIGNED,
    (payload) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });

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

  useWebSocketEvent<IncidentEventPayload>(
    WS_EVENTS.INCIDENT_RESOLVED,
    (payload) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(payload.incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });

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

// =============================================================================
// INCIDENT DETAIL REAL-TIME (for comments)
// =============================================================================

interface UseIncidentDetailRealTimeOptions {
  incidentId: string;
  showToasts?: boolean;
}

export function useIncidentDetailRealTime(options: UseIncidentDetailRealTimeOptions) {
  const { incidentId, showToasts = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { joinRoom, leaveRoom, connected } = useWebSocket();

  useEffect(() => {
    if (!connected || !incidentId) return;

    const room = WS_ROOMS.incidents(incidentId);
    joinRoom(room);

    return () => {
      leaveRoom(room);
    };
  }, [connected, incidentId, joinRoom, leaveRoom]);

  useWebSocketEvent<IncidentCommentEventPayload>(
    WS_EVENTS.INCIDENT_COMMENT_CREATED,
    (payload) => {
      if (payload.incidentId !== incidentId) return;

      queryClient.invalidateQueries({
        queryKey: incidentKeys.comments(incidentId),
      });

      if (showToasts && user?.id !== payload.authorId) {
        toast({
          title: '💬 New Comment',
          description: `${payload.authorName}: ${payload.content.slice(0, 50)}${payload.content.length > 50 ? '...' : ''}`,
          duration: 4000,
        });
      }
    },
    [incidentId, showToasts, user?.id]
  );

  return {
    connected,
  };
}

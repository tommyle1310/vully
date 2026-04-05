import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  IncidentFilters,
  IncidentsResponse,
  IncidentResponse,
  CommentsResponse,
  incidentKeys,
} from './incident.types';

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
    staleTime: 30 * 1000,
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

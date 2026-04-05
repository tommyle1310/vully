import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateIncidentData,
  UpdateIncidentData,
  UpdateIncidentStatusData,
  IncidentResponse,
  incidentKeys,
} from './incident.types';

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateIncidentData) =>
      apiClient.post<IncidentResponse>('/incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncidentData }) =>
      apiClient.patch<IncidentResponse>(`/incidents/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/incidents/${id}`),
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
    }) =>
      apiClient.patch<IncidentResponse>(`/incidents/${incidentId}/assign`, {
        technicianId,
      }),
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
    }) =>
      apiClient.patch<IncidentResponse>(
        `/incidents/${incidentId}/status`,
        data
      ),
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({
        queryKey: incidentKeys.detail(incidentId),
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
  });
}

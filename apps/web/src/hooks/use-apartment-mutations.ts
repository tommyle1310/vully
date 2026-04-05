import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateApartmentInput,
  UpdateApartmentInput,
  ApartmentResponse,
} from './apartment.types';

export function useCreateApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApartmentInput) =>
      apiClient.post<ApartmentResponse>('/apartments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateApartmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch<ApartmentResponse>(`/apartments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

export function useUpdateApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApartmentInput }) =>
      apiClient.patch<ApartmentResponse>(`/apartments/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      queryClient.invalidateQueries({ queryKey: ['apartments', variables.id] });
    },
  });
}

export function useDeleteApartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/apartments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  CreateCommentData,
  CommentResponse,
  incidentKeys,
} from './incident.types';

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      incidentId,
      data,
    }: {
      incidentId: string;
      data: CreateCommentData;
    }) =>
      apiClient.post<CommentResponse>(
        `/incidents/${incidentId}/comments`,
        data
      ),
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
    }) =>
      apiClient.patch<CommentResponse>(`/incidents/comments/${commentId}`, {
        content,
        isInternal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiClient.delete<void>(`/incidents/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

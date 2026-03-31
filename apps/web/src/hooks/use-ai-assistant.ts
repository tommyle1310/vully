'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    category: string;
    relevance: number;
  }>;
}

export interface ChatResponse {
  response: string;
  sources: Array<{
    title: string;
    category: string;
    relevance: number;
  }>;
  responseTime: number;
}

export interface ChatHistory {
  id: string;
  query: string;
  response: string;
  createdAt: string;
}

export interface QueryQuota {
  used: number;
  limit: number;
  remaining: number | 'unlimited';
}

export function useAiChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      query, 
      apartmentId, 
      buildingId 
    }: { 
      query: string; 
      apartmentId?: string; 
      buildingId?: string; 
    }): Promise<ChatResponse> => {
      const response = await apiClient.post<{ data: ChatResponse }>(
        '/ai-assistant/chat',
        { query, apartmentId, buildingId }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate chat history and quota
      queryClient.invalidateQueries({ queryKey: ['ai-history'] });
      queryClient.invalidateQueries({ queryKey: ['ai-quota'] });
    },
  });
}

export function useChatHistory(limit = 10) {
  return useQuery({
    queryKey: ['ai-history', limit],
    queryFn: async (): Promise<ChatHistory[]> => {
      const response = await apiClient.get<{ data: ChatHistory[] }>(
        `/ai-assistant/history?limit=${limit}`
      );
      return response.data;
    },
  });
}

export function useQueryQuota() {
  return useQuery({
    queryKey: ['ai-quota'],
    queryFn: async (): Promise<QueryQuota> => {
      const response = await apiClient.get<{ data: QueryQuota }>(
        '/ai-assistant/quota'
      );
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useWebSocketEvent } from './use-websocket';
import { WS_EVENTS } from '@vully/shared-types';

// ─── Types ──────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  resource_type?: string;
  resource_id?: string;
  created_at: string;
}

interface NotificationsListResponse {
  items: Notification[];
  total: number;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  zalo_enabled: boolean;
  payment_notifications: boolean;
  incident_notifications: boolean;
  announcement_notifications: boolean;
}

// ─── Notifications ──────────────────────────────────────

export function useNotifications(page = 1, limit = 20, unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', { page, limit, unreadOnly }],
    queryFn: () =>
      apiClient.get<NotificationsListResponse>(
        `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
      ),
    staleTime: 30 * 1000, // 30s
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      apiClient.get<{ count: number }>('/notifications/unread-count'),
    staleTime: 10 * 1000, // 10s
    refetchInterval: 10 * 1000, // Poll every 10s as fallback
  });
}

/**
 * Hook to listen for real-time notification events via WebSocket.
 * Instantly invalidates notification queries when a new notification arrives.
 */
export function useNotificationRealTime() {
  const queryClient = useQueryClient();

  useWebSocketEvent(
    WS_EVENTS.NOTIFICATION,
    () => {
      // Instantly refetch unread count + notifications list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    []
  );
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      apiClient.post('/notifications/mark-read', { notificationIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ─── Notification Preferences ───────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () =>
      apiClient.get<NotificationPreferences>('/notifications/preferences'),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>) =>
      apiClient.patch<NotificationPreferences>('/notifications/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

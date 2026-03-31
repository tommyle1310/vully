'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

interface MeResponse {
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      return apiClient.post<AuthResponse>('/auth/login', credentials);
    },
    onSuccess: (data) => {
      const { user, accessToken } = data.data;
      
      // Store token in api client for subsequent requests
      apiClient.setAccessToken(accessToken);
      
      // Store user in zustand (token will be stored in memory only for security)
      setAuth(user, accessToken);
      
      // Store refresh token in httpOnly cookie (handled by backend)
      // accessToken stored in memory for XSS protection
      
      router.push('/dashboard' as string);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth, accessToken } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Only call logout API if we have a token
      if (accessToken) {
        await apiClient.post('/auth/logout');
      }
    },
    onSettled: () => {
      // Always clear local state, even if API call fails
      apiClient.setAccessToken(null);
      clearAuth();
      queryClient.clear();
      router.push('/login' as string);
    },
  });
}

export function useRefreshToken() {
  const { setAuth, user } = useAuthStore();

  return useMutation({
    mutationFn: async (): Promise<RefreshResponse> => {
      return apiClient.post<RefreshResponse>('/auth/refresh');
    },
    onSuccess: (data) => {
      const { accessToken } = data.data;
      apiClient.setAccessToken(accessToken);
      if (user) {
        setAuth(user, accessToken);
      }
    },
  });
}

export function useCurrentUser() {
  const { accessToken, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<MeResponse> => {
      return apiClient.get<MeResponse>('/auth/me');
    },
    enabled: isAuthenticated && !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useAuth() {
  const { user, accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { mutate: refreshToken } = useRefreshToken();

  // Sync access token with api client on mount and changes
  useEffect(() => {
    if (accessToken) {
      apiClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleRefresh = useCallback(() => {
    refreshToken();
  }, [refreshToken]);

  return {
    user,
    isAuthenticated,
    isLoggingOut,
    logout: handleLogout,
    refreshToken: handleRefresh,
  };
}

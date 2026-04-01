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

interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface RegisterResponse {
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
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
      const { user, accessToken, refreshToken } = data;
      
      // Store token in api client for subsequent requests
      apiClient.setAccessToken(accessToken);
      apiClient.setRefreshToken(refreshToken);
      
      // Store user + tokens in zustand
      setAuth(user, accessToken, refreshToken);
      
      // Store refresh token in httpOnly cookie (handled by backend)
      // accessToken stored in memory for XSS protection
      
      router.push('/dashboard' as string);
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials): Promise<RegisterResponse> => {
      return apiClient.post<RegisterResponse>('/auth/register', credentials);
    },
    onSuccess: () => {
      // Redirect to login after successful registration
      router.push('/login?registered=true' as string);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth, accessToken, refreshToken } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // Only call logout API if we have a token
      if (accessToken && refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    },
    onSettled: () => {
      // Always clear local state, even if API call fails
      apiClient.setAccessToken(null);
      apiClient.setRefreshToken(null);
      clearAuth();
      queryClient.clear();
      router.push('/login' as string);
    },
  });
}

export function useRefreshToken() {
  const { setTokens, refreshToken } = useAuthStore();

  return useMutation({
    mutationFn: async (): Promise<RefreshResponse> => {
      return apiClient.post<RefreshResponse>('/auth/refresh', { refreshToken });
    },
    onSuccess: (data) => {
      apiClient.setAccessToken(data.accessToken);
      apiClient.setRefreshToken(data.refreshToken);
      setTokens(data.accessToken, data.refreshToken);
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
  const { user, accessToken, isAuthenticated } = useAuthStore();
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

// ----- Password Reset Hooks -----

interface ForgotPasswordResponse {
  message: string;
}

interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string): Promise<ForgotPasswordResponse> => {
      return apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: ResetPasswordCredentials): Promise<ForgotPasswordResponse> => {
      return apiClient.post<ForgotPasswordResponse>('/auth/reset-password', credentials);
    },
    onSuccess: () => {
      // Redirect to login after successful password reset
      router.push('/login?reset=true' as string);
    },
  });
}

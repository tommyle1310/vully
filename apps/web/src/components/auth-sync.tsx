'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

/**
 * Syncs the Zustand auth store with the API client.
 * Sets up auto-refresh: on 401, the API client silently refreshes the token.
 */
export function AuthSync({ children }: { children: React.ReactNode }) {
  const { accessToken, refreshToken, _hasHydrated, setTokens, clearAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated) {
      apiClient.setAccessToken(accessToken);
      apiClient.setRefreshToken(refreshToken);
    }
  }, [accessToken, refreshToken, _hasHydrated]);

  // Wire up callbacks once
  useEffect(() => {
    apiClient.setOnTokenRefreshed((newAccess, newRefresh) => {
      setTokens(newAccess, newRefresh);
    });

    apiClient.setOnAuthFailure(() => {
      apiClient.setAccessToken(null);
      apiClient.setRefreshToken(null);
      clearAuth();
      router.push('/login');
    });
  }, [setTokens, clearAuth, router]);

  return <>{children}</>;
}

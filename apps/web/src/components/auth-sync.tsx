'use client';

import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

/**
 * Syncs the Zustand auth store with the API client.
 * This ensures the access token is available for API calls after page reloads.
 */
export function AuthSync({ children }: { children: React.ReactNode }) {
  const { accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated) {
      // Sync the access token to the API client
      apiClient.setAccessToken(accessToken);
    }
  }, [accessToken, _hasHydrated]);

  return <>{children}</>;
}

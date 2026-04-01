// Use relative URL to leverage Next.js rewrites for API proxy
const API_URL = typeof window !== 'undefined' 
  ? '/api' // Client-side: use Next.js proxy
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'; // Server-side: use direct URL

interface RequestOptions extends RequestInit {
  json?: Record<string, unknown> | object;
  _isRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private onAuthFailure: (() => void) | null = null;
  private onTokenRefreshed: ((accessToken: string, refreshToken: string) => void) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  /** Called when refresh fails — should clear auth and redirect to login */
  setOnAuthFailure(callback: () => void) {
    this.onAuthFailure = callback;
  }

  /** Called when tokens are refreshed — should update the store */
  setOnTokenRefreshed(callback: (accessToken: string, refreshToken: string) => void) {
    this.onTokenRefreshed = callback;
  }

  private async tryRefreshToken(): Promise<boolean> {
    // If a refresh is already in progress, wait for it (prevents concurrent refreshes)
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      return false;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        this.accessToken = data.accessToken;
        this.refreshToken = data.refreshToken;
        this.onTokenRefreshed?.(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { json, _isRetry, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      credentials: 'include',
      ...(json && { body: JSON.stringify(json) }),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    // Auto-refresh on 401 (skip if this is already a retry or a refresh/login request)
    if (
      response.status === 401 &&
      !_isRetry &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')
    ) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the original request with the new token
        return this.request<T>(endpoint, { ...options, _isRetry: true });
      }
      // Refresh failed — force logout
      this.onAuthFailure?.();
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        errors: [{ message: 'An error occurred' }],
      }));
      throw new Error(error.errors?.[0]?.message || 'Request failed');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, json?: Record<string, unknown> | object, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', json: json as Record<string, unknown> });
  }

  put<T>(endpoint: string, json?: Record<string, unknown> | object, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', json: json as Record<string, unknown> });
  }

  patch<T>(endpoint: string, json?: Record<string, unknown> | object, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', json: json as Record<string, unknown> });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);

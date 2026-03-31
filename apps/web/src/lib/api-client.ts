// Use relative URL to leverage Next.js rewrites for API proxy
const API_URL = typeof window !== 'undefined' 
  ? '/api' // Client-side: use Next.js proxy
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'; // Server-side: use direct URL

interface RequestOptions extends RequestInit {
  json?: Record<string, unknown> | object;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { json, ...fetchOptions } = options;

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

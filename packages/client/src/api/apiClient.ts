import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

type RequestConfig = AxiosRequestConfig & {
   headers?: Record<string, string>;
   timeout?: number;
   params?: Record<string, unknown>;
   skipAuth?: boolean;
   retry?: boolean;
};

interface ApiResponse<T> {
   status: number;
   message: string;
   data: T | null;
   headers?: Record<string, string>;
   timestamp?: string;
}

interface ErrorResponse {
   status: number;
   message: string;
   code?: string;
   details?: unknown;
   timestamp?: string;
}

// Configuration
const API_CONFIG = {
   baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`,
   timeout: 30000,
   maxRetries: 3,
   retryDelay: 1000,
} as const;

class ApiClient {
   private axiosInstance: ReturnType<typeof axios.create>;

   constructor() {
      this.axiosInstance = axios.create({
         baseURL: API_CONFIG.baseURL,
         withCredentials: true,
         timeout: API_CONFIG.timeout,
         headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
         },
      });

      this.setupInterceptors();
   }

   private getAuthToken(): string | null {
      if (typeof window === 'undefined') return null;

      try {
         const authStore = localStorage.getItem('auth-storage');
         if (!authStore) return null;

         const parsed = JSON.parse(authStore);
         return parsed.state?.token || null;
      } catch {
         return null;
      }
   }

   private shouldRetry(error: AxiosError): boolean {
      return (
         error.code === 'ECONNABORTED' ||
         error.code === 'NETWORK_ERROR' ||
         (typeof error.response?.status === 'number' &&
            error.response.status >= 500)
      );
   }

   private async delay(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
   }

   private setupInterceptors(): void {
      // Request interceptor
      this.axiosInstance.interceptors.request.use(
         (config) => {
            const token = this.getAuthToken();

            if (token && !(config as RequestConfig).skipAuth) {
               config.headers.Authorization = `Bearer ${token}`;
            }
            if (
               (
                  (globalThis as any)?.process?.env?.NODE_ENV || ''
               ).toLowerCase() === 'development'
            ) {
               console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
                  data: config.data,
                  params: config.params,
               });
            }

            return config;
         },
         (error) => {
            console.error('❌ Request interceptor error:', error);
            return Promise.reject(this.normalizeError(error));
         }
      );

      // Response interceptor
      this.axiosInstance.interceptors.response.use(
         (response: AxiosResponse) => {
            if (
               (
                  (globalThis as any)?.process?.env?.NODE_ENV || ''
               ).toLowerCase() === 'development'
            ) {
               console.log(
                  `✅ ${response.config.method?.toUpperCase()} ${response.config.url}`,
                  {
                     status: response.status,
                     data: response.data,
                  }
               );
            }
            return response;
         },
         async (error: AxiosError) => {
            const originalRequest = error.config as RequestConfig & {
               _retryCount?: number;
            };

            if (originalRequest?.retry !== false && this.shouldRetry(error)) {
               originalRequest._retryCount =
                  (originalRequest._retryCount || 0) + 1;

               if (originalRequest._retryCount <= API_CONFIG.maxRetries) {
                  await this.delay(
                     API_CONFIG.retryDelay * originalRequest._retryCount
                  );
                  return this.axiosInstance(originalRequest);
               }
            }

            return Promise.reject(this.normalizeError(error));
         }
      );
   }

   private normalizeError(error: AxiosError): ErrorResponse {
      if (!error.response) {
         return {
            status: 0,
            message:
               error.code === 'ECONNABORTED'
                  ? 'Request timeout'
                  : 'Network error - please check your connection',
            code: error.code,
         };
      }

      const { status, data } = error.response;
      let message = 'An error occurred';

      if (typeof data === 'string') {
         message = data;
      } else if (data && typeof data === 'object') {
         message =
            (data as any).message ||
            (data as any).error ||
            (data as any).detail ||
            message;
      }

      const errorResponse: ErrorResponse = {
         status,
         message,
         timestamp: new Date().toISOString(),
      };

      if (status === 401 && !(error.config as RequestConfig)?.skipAuth) {
         this.handleUnauthorized();
      } else if (
         status === 403 &&
         (data as any)?.code === 'PASSWORD_CHANGE_REQUIRED'
      ) {
         this.handlePasswordChangeRequired();
      }

      return errorResponse;
   }

   private handleUnauthorized(): void {
      if (typeof window === 'undefined') return;

      localStorage.removeItem('auth-storage');
      sessionStorage.clear();

      // Redirection si nécessaire
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
   }

   private handlePasswordChangeRequired(): void {
      if (typeof window === 'undefined') return;

      console.warn('🔐 Password change required');
      window.location.href = '/change-password';
   }

   private extractData<T>(response: AxiosResponse<unknown>): T {
      const data = response.data;

      if (data && typeof data === 'object' && 'data' in (data as object)) {
         const apiResponse = data as ApiResponse<T>;
         if (apiResponse.data === null || apiResponse.data === undefined) {
            throw new Error('No data received from server');
         }
         return apiResponse.data;
      }

      return data as T;
   }

   public async get<T>(url: string, config?: RequestConfig): Promise<T> {
      const response = await this.axiosInstance.get(url, config);
      return this.extractData<T>(response);
   }

   public async post<T, U = unknown>(
      url: string,
      data?: U,
      config?: RequestConfig
   ): Promise<T> {
      const response = await this.axiosInstance.post(url, data, config);
      return this.extractData<T>(response);
   }

   public async put<T, U = unknown>(
      url: string,
      data?: U,
      config?: RequestConfig
   ): Promise<T> {
      const response = await this.axiosInstance.put(url, data, config);
      return this.extractData<T>(response);
   }

   public async patch<T, U = unknown>(
      url: string,
      data?: U,
      config?: RequestConfig
   ): Promise<T> {
      const response = await this.axiosInstance.patch(url, data, config);
      return this.extractData<T>(response);
   }

   public async delete<T>(url: string, config?: RequestConfig): Promise<T> {
      const response = await this.axiosInstance.delete(url, config);
      return this.extractData<T>(response);
   }

   /**
    * Stream data from server using Server-Sent Events (SSE)
    * Uses fetch instead of axios for proper streaming support
    */
   public async stream<T = unknown>(
      url: string,
      data: unknown,
      callbacks: {
         onChunk: (chunk: string) => void;
         onDone: () => void;
         onError: (error: string) => void;
         onConversationId?: (conversationId: string) => void;
      },
      config?: RequestConfig
   ): Promise<void> {
      try {
         // Get the token for authentication
         const token = this.getAuthToken();

         // Construct full URL
         const fullUrl = `${this.axiosInstance.defaults.baseURL}${url}`;

         // Prepare headers
         const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
         };

         // Add authorization if token exists
         if (token && !config?.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
         }

         // Add custom headers
         if (config?.headers) {
            Object.assign(headers, config.headers);
         }

         // Make fetch request
         const response = await fetch(fullUrl, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(data),
         });

         if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
         }

         const reader = response.body?.getReader();
         const decoder = new TextDecoder();

         if (!reader) {
            throw new Error('Unable to read response body');
         }

         let buffer = '';

         while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process each complete line
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
               if (line.startsWith('data: ')) {
                  const data = line.slice(6); // Remove "data: "

                  if (data.trim() === '') continue;

                  try {
                     const parsed = JSON.parse(data) as T;

                     if (
                        (parsed as any).type === 'chunk' &&
                        (parsed as any).content
                     ) {
                        callbacks.onChunk((parsed as any).content);
                     } else if (
                        (parsed as any).type === 'conversationId' &&
                        (parsed as any).conversationId
                     ) {
                        callbacks.onConversationId?.(
                           (parsed as any).conversationId
                        );
                     } else if ((parsed as any).type === 'done') {
                        callbacks.onDone();
                        return;
                     } else if ((parsed as any).type === 'error') {
                        callbacks.onError(
                           (parsed as any).error || 'Unknown error'
                        );
                        return;
                     }
                  } catch (parseError) {
                     console.error('Parse error:', parseError);
                  }
               }
            }
         }

         callbacks.onDone();
      } catch (error) {
         console.error('Stream error:', error);
         callbacks.onError(
            error instanceof Error ? error.message : 'Failed to stream data'
         );
      }
   }

   public setHeader(key: string, value: string): void {
      this.axiosInstance.defaults.headers.common[key] = value;
   }

   public removeHeader(key: string): void {
      delete this.axiosInstance.defaults.headers.common[key];
   }

   public setBaseURL(url: string): void {
      this.axiosInstance.defaults.baseURL = url;
   }
}

export const createApiClient = () => new ApiClient();

const defaultApiClient = new ApiClient();
export default defaultApiClient;

// Hook pour React (optionnel)
export const useApiClient = () => {
   return defaultApiClient;
};

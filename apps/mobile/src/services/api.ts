import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API configuration
// @ts-ignore - Expo environment variables are available at runtime
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.11:3006';
// @ts-ignore - Expo environment variables are available at runtime
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10);

// Debug environment variables (comment out in production)
// console.log('🔧 API Configuration:', {
//   EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
//   API_BASE_URL,
//   API_TIMEOUT,
// });

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        // Debug logging (comment out in production)
        // console.log('🚀 API Request:', {
        //   method: config.method?.toUpperCase(),
        //   url: config.url,
        //   baseURL: config.baseURL,
        //   fullUrl: `${config.baseURL}${config.url}`,
        // });
        
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Debug logging (comment out in production)
        // console.log('✅ API Response:', {
        //   status: response.status,
        //   url: response.config.url,
        //   method: response.config.method?.toUpperCase(),
        // });
        return response;
      },
      (error) => {
        // Always log errors for debugging
        console.error('❌ API Response Error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
        });
        
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // This will be called synchronously, so we need to store the token in a way that's accessible
    // The AuthService will handle the async storage, but we need a sync way to get it
    // We'll use a pattern where the token is cached in memory after login
    return this.cachedToken;
  }

  private cachedToken: string | null = null;

  // Method to set the cached token (called by AuthService after login)
  setAuthToken(token: string | null): void {
    this.cachedToken = token;
  }

  private handleUnauthorized(): void {
    console.warn('Unauthorized access - user needs to login');
    // Clear the cached token
    this.cachedToken = null;
    // The app should handle navigation to login screen
    // This could be done via a navigation service or event system
  }

  // Generic API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
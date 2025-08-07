import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EXPO_PUBLIC_API_URL, EXPO_PUBLIC_API_TIMEOUT } from '@env';

// API configuration
const API_BASE_URL = EXPO_PUBLIC_API_URL || 'http://10.0.0.183:3006';
const API_TIMEOUT = parseInt(EXPO_PUBLIC_API_TIMEOUT || '60000', 10);



class ApiClient {
  private client: AxiosInstance;
  private authStateCallback: (() => void) | null = null;

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
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        
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
    // Clear the cached token
    this.cachedToken = null;
    // Notify AuthContext about session expiration
    if (this.authStateCallback) {
      this.authStateCallback();
    }
  }

  // Method to set a callback for auth state changes
  setAuthStateCallback(callback: (() => void) | null): void {
    this.authStateCallback = callback;
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
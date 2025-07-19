import { apiClient } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.accessToken) {
      localStorage.setItem('authToken', response.accessToken);
    }
    
    return response;
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    
    // Store token in localStorage
    if (typeof window !== 'undefined' && response.accessToken) {
      localStorage.setItem('authToken', response.accessToken);
    }
    
    return response;
  }

  static async logout(): Promise<void> {
    await apiClient.post<void>('/auth/logout');
    
    // Remove token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  static async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/refresh');
  }

  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('authToken');
  }

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }
}

export default AuthService;
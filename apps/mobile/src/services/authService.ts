import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AUTH_TOKEN_KEY = '@beezly_auth_token';
const USER_DATA_KEY = '@beezly_user_data';

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  pointBalance: number;
  level?: string;
  rank?: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfile;
  expiresIn: number;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordRequest {
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}


export class AuthService {
  // Authentication Methods
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signin', {
      email,
      password,
    });
    return response;
  }

  static async signUp(userData: SignUpRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', userData);
    return response;
  }

  static async signOut(): Promise<void> {
    try {
      await apiClient.post<void>('/auth/signout');
    } catch (error) {
      console.warn('Server signout failed:', error);
    } finally {
      // Always clear local storage
      await this.clearAuthData();
    }
  }


  // Profile Management
  static async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/auth/me');
  }

  static async updateProfile(updateData: UpdateProfileRequest): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/auth/profile', updateData);
  }

  static async changePassword(newPassword: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/auth/password', {
      newPassword,
    });
  }

  static async resetPassword(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', {
      email,
    });
  }

  // Token Storage Management
  static async storeAuthData(authResponse: AuthResponse): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, authResponse.accessToken],
        [USER_DATA_KEY, JSON.stringify(authResponse.user)],
      ]);
      // Set the token in the API client for immediate use
      apiClient.setAuthToken(authResponse.accessToken);
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw new Error('Failed to save authentication data');
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  static async getUserData(): Promise<UserProfile | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      // Clear the token from the API client
      apiClient.setAuthToken(null);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      return !!token;
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  }

  // Utility Methods
  static async initializeAuth(): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (token) {
        apiClient.setAuthToken(token);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  static async refreshUserData(): Promise<UserProfile | null> {
    try {
      const userProfile = await this.getProfile();
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
      return userProfile;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  }

  // Legacy method names for backwards compatibility
  static async login(email: string, password: string): Promise<AuthResponse> {
    return this.signIn(email, password);
  }

  static async register(userData: SignUpRequest): Promise<AuthResponse> {
    return this.signUp(userData);
  }

  static async logout(): Promise<void> {
    return this.signOut();
  }
}

export default AuthService;
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
      // Continue with local cleanup if server signout fails
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
      if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
        console.log('💾 Storing auth data:', {
          hasToken: !!authResponse.accessToken,
          userEmail: authResponse.user?.email,
          tokenPreview: authResponse.accessToken ? `${authResponse.accessToken.substring(0, 20)}...` : null,
        });
      }
      
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, authResponse.accessToken],
        [USER_DATA_KEY, JSON.stringify(authResponse.user)],
      ]);
      
      // Set the token in the API client for immediate use
      apiClient.setAuthToken(authResponse.accessToken);
      
      if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
        console.log('✅ Auth data stored successfully');
      }
    } catch (error) {
      if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
        console.error('❌ Failed to store auth data:', error);
      }
      throw new Error('Failed to save authentication data');
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    } catch (error) {
      return null;
    }
  }

  static async getUserData(): Promise<UserProfile | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      // Clear the token from the API client
      apiClient.setAuthToken(null);
    } catch (error) {
      // Ignore clear errors
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  // Utility Methods
  static async initializeAuth(): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (token) {
        apiClient.setAuthToken(token);
        if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
          console.log('🔄 Auth initialized with stored token:', {
            hasToken: true,
            tokenPreview: `${token.substring(0, 20)}...`,
          });
        }
      } else {
        if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
          console.log('🔄 Auth initialized - no stored token found');
        }
      }
    } catch (error) {
      if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
        console.log('🔄 Auth initialization error:', error);
      }
    }
  }

  static async refreshUserData(): Promise<UserProfile | null> {
    try {
      const userProfile = await this.getProfile();
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userProfile));
      return userProfile;
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle OAuth callback from Supabase
   */
  static async handleOAuthCallback(accessToken: string, supabaseUser: any): Promise<AuthResponse> {
    try {
      // Call the backend OAuth callback endpoint
      const response = await apiClient.post<AuthResponse>('/auth/oauth/callback', {
        access_token: accessToken,
        provider: 'google',
        user_info: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || 
                `${supabaseUser.user_metadata?.first_name || ''} ${supabaseUser.user_metadata?.last_name || ''}`.trim(),
          given_name: supabaseUser.user_metadata?.first_name || supabaseUser.user_metadata?.given_name,
          family_name: supabaseUser.user_metadata?.last_name || supabaseUser.user_metadata?.family_name,
          picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        },
      });

      return response;
    } catch (error: any) {
      throw new Error(`OAuth sync failed: ${error.message}`);
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
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabaseClient } from './supabase';
import { AuthService } from './authService';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URL for OAuth callback
const getRedirectUrl = (): string => {
  if (Platform.OS === 'web') {
    return `${(global as any).window?.location?.origin || 'http://localhost:3000'}/auth/callback`;
  }
  
  // For mobile apps, Supabase will handle the deep link
  // This should match your app's deep linking scheme
  return 'beezly://auth/callback';
};

export interface GoogleOAuthResponse {
  accessToken: string;
  user: {
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
  };
  expiresIn: number;
}

export class GoogleOAuthService {
  /**
   * Sign in with Google using Supabase OAuth
   */
  static async signInWithGoogle(): Promise<GoogleOAuthResponse> {
    try {
      // Use Supabase's signInWithOAuth method
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(`Google OAuth failed: ${error.message}`);
      }

      if (!data.url) {
        throw new Error('No OAuth URL returned from Supabase');
      }

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        getRedirectUrl()
      );

      if (result.type !== 'success') {
        throw new Error('OAuth cancelled or failed');
      }

      // The URL will contain the OAuth tokens
      if (!result.url) {
        throw new Error('No result URL from OAuth flow');
      }

      // Parse the URL for tokens
      const tokens = this.parseTokensFromUrl(result.url);
      
      if (!tokens.access_token) {
        throw new Error('No access token received from OAuth');
      }

      // Set the session in Supabase
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
      });

      if (sessionError) {
        throw new Error(`Failed to set session: ${sessionError.message}`);
      }

      const user = sessionData.user;
      if (!user) {
        throw new Error('No user data received after OAuth');
      }

      // Create/update local user record through our backend
      const authResponse = await this.syncWithBackend(tokens.access_token, user);
      
      if (process.env.EXPO_PUBLIC_DEBUG_API === 'true') {
        console.log('🔐 OAuth Success - Auth Response:', {
          hasAccessToken: !!authResponse.accessToken,
          userEmail: authResponse.user?.email,
          expiresIn: authResponse.expiresIn,
        });
      }
      
      return authResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse tokens from the OAuth callback URL
   */
  private static parseTokensFromUrl(url: string): {
    access_token?: string;
    refresh_token?: string;
    expires_in?: string;
  } {
    try {
      // Parse URL hash parameters (Supabase returns tokens in URL hash)
      const urlParts = url.split('#');
      if (urlParts.length < 2) {
        return {};
      }

      const params = new URLSearchParams(urlParts[1]);
      return {
        access_token: params.get('access_token') || undefined,
        refresh_token: params.get('refresh_token') || undefined,
        expires_in: params.get('expires_in') || undefined,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Sync the OAuth user with our backend
   */
  private static async syncWithBackend(
    accessToken: string,
    supabaseUser: any
  ): Promise<GoogleOAuthResponse> {
    try {
      // Try to call our backend OAuth callback endpoint
      const response = await AuthService.handleOAuthCallback(accessToken, supabaseUser);
      return response;
    } catch (error: any) {
      // Fallback: return user data directly from Supabase
      const userProfile = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        firstName: supabaseUser.user_metadata?.first_name || 
                   supabaseUser.user_metadata?.given_name || '',
        lastName: supabaseUser.user_metadata?.last_name || 
                  supabaseUser.user_metadata?.family_name || '',
        pointBalance: 0,
        level: 'beginner',
        rank: 0,
        badges: [],
        createdAt: supabaseUser.created_at,
        updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
      };

      return {
        accessToken: accessToken,
        user: userProfile,
        expiresIn: 3600, // Default 1 hour
      };
    }
  }

  /**
   * Check if Google OAuth is configured in Supabase
   */
  static async isConfigured(): Promise<boolean> {
    try {
      // Try to get the OAuth URL to test if it's configured
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          skipBrowserRedirect: true, // Don't actually redirect, just test
        },
      });

      return !error && !!data.url;
    } catch {
      return false;
    }
  }
}

export default GoogleOAuthService;
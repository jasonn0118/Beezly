import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, UserProfile, AuthResponse } from '../services/authService';
import { GoogleOAuthService, GoogleOAuthResponse } from '../services/googleOAuthService';
import { apiClient } from '../services/api';

interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  
  // Actions
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<GoogleOAuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (data: { firstName?: string; lastName?: string }) => Promise<UserProfile>;
  refreshUser: () => Promise<void>;
  
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Handle session expiration
  const handleSessionExpiration = async () => {
    // Clear auth data from storage
    await AuthService.clearAuthData();
    // Update context state
    setIsAuthenticated(false);
    setUser(null);
  };

  // Initialize authentication state on app start
  useEffect(() => {
    initializeAuth();
    
    // Set up session expiration callback
    apiClient.setAuthStateCallback(handleSessionExpiration);
    
    // Cleanup callback on unmount
    return () => {
      apiClient.setAuthStateCallback(null);
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Initialize the auth service (sets cached token in API client)
      await AuthService.initializeAuth();
      
      // Check if user is authenticated
      const isAuth = await AuthService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        // Load user data from storage
        const userData = await AuthService.getUserData();
        setUser(userData);
        
        // Optionally refresh user data from server
        try {
          const refreshedUser = await AuthService.refreshUserData();
          if (refreshedUser) {
            setUser(refreshedUser);
          }
        } catch (error) {
          // Keep using cached user data on refresh failure
        }
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await AuthService.signIn(email, password);
      
      // Store auth data
      await AuthService.storeAuthData(response);
      
      // Update context state
      setIsAuthenticated(true);
      setUser(response.user);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await AuthService.signUp(userData);
      
      // Store auth data
      await AuthService.storeAuthData(response);
      
      // Update context state
      setIsAuthenticated(true);
      setUser(response.user);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await AuthService.signOut();
    } catch (error) {
      // Continue with local cleanup even if server signout fails
    } finally {
      // Always update local state
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const updateProfile = async (data: { 
    firstName?: string; 
    lastName?: string; 
  }): Promise<UserProfile> => {
    try {
      const updatedUser = await AuthService.updateProfile(data);
      
      // Update local user data
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const refreshedUser = await AuthService.refreshUserData();
      if (refreshedUser) {
        setUser(refreshedUser);
      }
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<GoogleOAuthResponse> => {
    try {
      const response = await GoogleOAuthService.signInWithGoogle();
      
      // Store auth data using the same method as regular auth
      await AuthService.storeAuthData({
        accessToken: response.accessToken,
        user: response.user,
        expiresIn: response.expiresIn,
      });
      
      // Update context state
      setIsAuthenticated(true);
      setUser(response.user);
      
      return response;
    } catch (error) {
      throw error;
    }
  };



  const contextValue: AuthContextType = {
    // State
    isAuthenticated,
    isLoading,
    user,
    
    // Actions
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshUser,
    
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for protected components
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      // You might want to return a loading component here
      return null;
    }
    
    if (!isAuthenticated) {
      // You might want to redirect to login here
      return null;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;
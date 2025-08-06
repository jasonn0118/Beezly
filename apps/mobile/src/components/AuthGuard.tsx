import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FFC107" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If not authenticated, redirect or show fallback
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to login page
    router.replace(redirectTo);
    return <LoadingScreen message="Redirecting to login..." />;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
};

// Higher-order component for easier use
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    redirectTo?: string;
  }
) => {
  return (props: P) => (
    <AuthGuard 
      fallback={options?.fallback}
      redirectTo={options?.redirectTo}
    >
      <Component {...props} />
    </AuthGuard>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#f8f9fa',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AuthGuard;
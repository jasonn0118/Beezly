import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
  mode?: 'signin' | 'signup';
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  style,
  textStyle,
  mode = 'signin',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      const response = await signInWithGoogle();
      
      Alert.alert(
        'Welcome!',
        `Successfully signed in with Google. Welcome ${response.user.firstName || 'to Beezly'}!`,
        [{ text: 'Continue', onPress: onSuccess }]
      );
    } catch (error: any) {
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error.message) {
        // Customize error messages for better UX
        if (error.message.includes('cancelled') || error.message.includes('canceled')) {
          errorMessage = 'Sign in was cancelled.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('configuration')) {
          errorMessage = 'Google sign in is not properly configured. Please try again later.';
        }
      }
      
      Alert.alert('Sign In Failed', errorMessage);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google';

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handleGoogleSignIn}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#4285F4" style={styles.icon} />
        ) : (
          <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.icon} />
        )}
        <Text style={[styles.buttonText, textStyle]}>
          {isLoading ? 'Signing in...' : buttonText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default GoogleSignInButton;
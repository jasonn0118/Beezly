import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAchievementTracking } from '../hooks/useAchievementTracking';
import { useAuth } from '../contexts/AuthContext';

// Example component showing how to integrate achievement tracking
export default function ExampleReceiptProcessor() {
  const { isAuthenticated } = useAuth();
  const { trackReceiptUpload, trackOCRVerification, checkForNewBadgesAndTiers } = useAchievementTracking();

  const handleReceiptUpload = async () => {
    // Simulate receipt upload logic
    const mockReceiptData = {
      merchant: 'Target',
      items: [
        { name: 'Milk', price: 3.99 },
        { name: 'Bread', price: 2.49 },
      ],
      total: 6.48
    };

    if (isAuthenticated) {
      // Track the receipt upload achievement
      await trackReceiptUpload(mockReceiptData);
      
      // Check for any new badges or tier promotions
      setTimeout(() => {
        checkForNewBadgesAndTiers();
      }, 1000);
    }
  };

  const handleOCRVerification = async () => {
    // Simulate OCR verification
    const verifiedItems = 2;
    
    if (isAuthenticated) {
      trackOCRVerification(verifiedItems);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Achievement Demo</Text>
      <Text style={styles.subtitle}>
        {isAuthenticated ? 'Try these actions to see achievements!' : 'Sign in to see achievements'}
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, !isAuthenticated && styles.buttonDisabled]}
        onPress={handleReceiptUpload}
        disabled={!isAuthenticated}
      >
        <Text style={styles.buttonText}>📄 Upload Receipt (+30 points)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, !isAuthenticated && styles.buttonDisabled]}
        onPress={handleOCRVerification}
        disabled={!isAuthenticated}
      >
        <Text style={styles.buttonText}>✅ Verify OCR (+25 points)</Text>
      </TouchableOpacity>

      {!isAuthenticated && (
        <Text style={styles.loginPrompt}>Sign in to start earning points and badges!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  loginPrompt: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
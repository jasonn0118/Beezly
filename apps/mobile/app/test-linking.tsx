import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

export default function TestLinking() {
  const [redirectUrl, setRedirectUrl] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Generate the redirect URL
    const url = Linking.createURL('auth/callback');
    setRedirectUrl(url);
    console.log('🔗 Generated redirect URL:', url);
    
    // Test different URL generation methods
    console.log('🔗 Development vs Production URLs:');
    console.log('  - Development (current):', url);
    console.log('  - Production (expected): beezly://auth/callback');
  }, []);

  const testLinking = () => {
    const url = Linking.createURL('auth/callback');
    Alert.alert('Redirect URL', url);
    console.log('🔗 Testing redirect URL:', url);
  };

  const goBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔗 Linking Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Generated Redirect URL:</Text>
        <Text style={styles.url}>{redirectUrl}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={testLinking}>
        <Text style={styles.buttonText}>Test Alert</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backButtonText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFC107',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFC107',
    marginBottom: 10,
  },
  url: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#FFC107',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
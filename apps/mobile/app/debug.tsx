import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import axios from 'axios';

export default function DebugScreen() {
  const [status, setStatus] = useState('Checking...');
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({});
  const [networkTests, setNetworkTests] = useState<Record<string, any>>({});

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = () => {
    // Check environment variables
    const envData = {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT,
      NODE_ENV: process.env.NODE_ENV,
      // Also show what the API client is actually using
      ACTUAL_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.0.183:3006',
    };
    setEnvVars(envData);
  };

  const testNetworkConnectivity = async () => {
    setStatus('Testing network connectivity...');
    const tests: Record<string, any> = {};

    // Test different URLs
    const urlsToTest = [
      'http://localhost:3006',
      'http://209.52.106.138:3006',  // Current IP
      'http://172.20.10.11:3006',    // Previous IP
      'http://10.0.0.183:3006',      // Old IP
      'http://127.0.0.1:3006',
    ];

    for (const baseUrl of urlsToTest) {
      try {
        const response = await axios.get(`${baseUrl}/auth/me`, {
          timeout: 5000,
          validateStatus: () => true, // Accept any status code
        });
        
        tests[baseUrl] = {
          success: true,
          status: response.status,
          message: response.status === 401 ? 'API reachable (401 expected)' : `Status: ${response.status}`,
        };
      } catch (error: any) {
        tests[baseUrl] = {
          success: false,
          error: error.code || error.message,
          message: `Failed: ${error.code || error.message}`,
        };
      }
    }

    setNetworkTests(tests);
    setStatus('Network tests completed');
  };



  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🐛 Network Debug</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment Variables</Text>
        {Object.entries(envVars).map(([key, value]) => (
          <Text key={key} style={styles.envVar}>
            {key}: {String(value || 'undefined')}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Tests</Text>
        {Object.entries(networkTests).map(([url, result]: [string, any]) => (
          <View key={url} style={styles.testResult}>
            <Text style={styles.testUrl}>{url}</Text>
            <Text style={[styles.testStatus, result.success ? styles.success : styles.error]}>
              {result.message}
            </Text>
          </View>
        ))}
      </View>


      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={testNetworkConnectivity}>
          <Text style={styles.buttonText}>Test Network</Text>
        </TouchableOpacity>
        
      </View>
    </ScrollView>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFC107',
    marginBottom: 10,
  },
  status: {
    color: '#fff',
    fontSize: 16,
  },
  envVar: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  testResult: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  testUrl: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  buttons: {
    gap: 10,
  },
  button: {
    backgroundColor: '#FFC107',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ReceiptScanFailedProps {
  onRetake: () => void;
  message?: string | null;
}

const { width } = Dimensions.get('window');

const ReceiptScanFailed: React.FC<ReceiptScanFailedProps> = ({ onRetake, message }) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#FF6B6B" />
      <Text style={styles.title}>Scan Failed</Text>
      <Text style={styles.subtitle}>
        {message || 'Please try again, ensuring the receipt is clear.'}
      </Text>
      
      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Capture Tips</Text>
        <Text style={styles.tipText}>• Shoot in a well-lit area.</Text>
        <Text style={styles.tipText}>• Flatten the receipt to avoid wrinkles.</Text>
        <Text style={styles.tipText}>• Focus the camera to prevent blurry text.</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetake}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  tipBox: {
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 20,
    width: width * 0.85,
    marginBottom: 30,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    width: '90%',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReceiptScanFailed;

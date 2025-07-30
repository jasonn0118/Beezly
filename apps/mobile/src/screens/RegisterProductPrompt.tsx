import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { BarcodeType } from '@beezly/types/dto/barcode';

interface RegisterProductPromptProps {
  scannedData: {barcode: string; type: BarcodeType;};
  onRegisterPress: () => void; // onRegisterPress prop 추가
}

const RegisterProductPrompt: React.FC<RegisterProductPromptProps> = ({ scannedData, onRegisterPress }) => {

  const handleRegisterPress = () => {
    onRegisterPress();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        No product information found for '<Text style={styles.barcode}>{scannedData.barcode}</Text>'.
      </Text>
      <Text style={styles.subMessage}>
        Would you like to register it as a new product?
      </Text>
      <Button title="Register Product" onPress={handleRegisterPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  barcode: {
    fontWeight: 'bold',
  },
  subMessage: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 24,
  },
});

export default RegisterProductPrompt;
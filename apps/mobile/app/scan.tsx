import { View, Text, StyleSheet } from 'react-native';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text>🏠 scan Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

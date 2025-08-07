// components/RankCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

export default function RankCard() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>RANK</Text>
          <View style={styles.rankRow}>
            <FontAwesome6 name="shield-halved" size={22} color="#FFC107" style={{ marginRight: 8 }} />
            <Text style={styles.rankText}>Scout Bee</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.label}>POINTS</Text>
          <Text style={styles.pointText}>1,250 P</Text>
        </View>
      </View>

      <View style={styles.progressBarBackground}>
        <View style={styles.progressBarFill} />
      </View>
      <Text style={styles.footerText}>750 P to next rank!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    backgroundColor: '#212529',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rankText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  pointText: {
    color: '#FFC107',
    fontSize: 22,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    width: '100%',
    backgroundColor: '#6c757d',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '60%',
    height: 12,
    backgroundColor: '#FFC107',
    borderRadius: 999,
  },
  footerText: {
    textAlign: 'right',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
  },
});
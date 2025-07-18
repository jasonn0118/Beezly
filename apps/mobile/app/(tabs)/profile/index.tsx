import { View, Text } from 'react-native';
import RankCard from '../../../src/components/RankCard';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RankCard />
    </View>
  );
}
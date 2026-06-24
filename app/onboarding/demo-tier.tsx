import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDemoMode } from '../../src/hooks/useDemoMode';
import { DemoTier } from '../../src/lib/constants';

export default function DemoTierScreen() {
  const { setDemoTier } = useDemoMode();

  function select(tier: DemoTier) {
    setDemoTier(tier);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose your demo tier</Text>
      <Text style={styles.subheading}>Select the tier you want to explore. You can switch at any time via the banner.</Text>
      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => select('free')}>
          <Text style={styles.cardTitle}>Free</Text>
          <Text style={styles.cardDesc}>Basic trip and event creation. Manual packing lists. Up to 3 events per day.</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.card, styles.premiumCard]} onPress={() => select('premium')}>
          <Text style={[styles.cardTitle, styles.premiumTitle]}>Premium</Text>
          <Text style={styles.cardDesc}>All features — AI planning, Treasure Map, unlimited events, AI packing suggestions.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff', gap: 20 },
  heading: { fontSize: 28, fontWeight: '700' },
  subheading: { fontSize: 15, color: '#555' },
  cards: { flexDirection: 'row', gap: 16 },
  card: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 16, padding: 20, gap: 8 },
  premiumCard: { borderColor: '#f0c040', backgroundColor: '#fffbea' },
  cardTitle: { fontSize: 22, fontWeight: '700' },
  premiumTitle: { color: '#b8860b' },
  cardDesc: { fontSize: 14, color: '#555', lineHeight: 20 },
});

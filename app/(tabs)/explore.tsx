import { View, Text, StyleSheet } from 'react-native';
import { usePremium } from '../../src/context/SubscriptionContext';
import { UpgradePromptSheet } from '../../src/components/upgrade/UpgradePromptSheet';

export default function ExploreScreen() {
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <View style={styles.container}>
        <UpgradePromptSheet
          visible={true}
          onClose={() => {}}
          featureTitle="Explore with AI"
          featureDescription="Upgrade to Premium to discover AI-powered holiday inspiration."
          variant="authenticated"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.empty}>AI-powered holiday planning features go here!</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 32 },
});

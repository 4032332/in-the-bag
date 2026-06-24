import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { useDemoMode } from '../../hooks/useDemoMode';

const FEATURE_COPY: Record<string, { heading: string; description: string }> = {
  explore: {
    heading: 'AI Holiday Planning',
    description:
      'Find a Holiday uses AI to suggest personalised destinations based on your preferences. ' +
      'Enhance My Trip extracts recommendations from YouTube and TikTok videos and adds them to your trip.',
  },
};

interface Props {
  feature: string;
}

export default function UpgradePrompt({ feature }: Props) {
  const router = useRouter();
  const { isDemoMode, setDemoTier } = useDemoMode();
  const copy = FEATURE_COPY[feature] ?? { heading: 'Premium Feature', description: 'Upgrade to access this feature.' };

  const handleUpgrade = async () => {
    if (isDemoMode) {
      setDemoTier('premium');
      return;
    }
    await (Purchases as any).presentPaywall();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{copy.heading}</Text>
      <Text style={styles.description}>{copy.description}</Text>
      <View style={styles.pricing}>
        <Text style={styles.pricingItem}>Monthly — $6.99/month</Text>
        <Text style={styles.pricingItem}>Lifetime — $44.99 once-off</Text>
      </View>
      <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} accessibilityRole="button">
        <Text style={styles.upgradeText}>
          {isDemoMode ? 'Switch to Premium (demo)' : 'Upgrade to Premium'}
        </Text>
      </TouchableOpacity>
      {!isDemoMode && (
        <TouchableOpacity
          style={styles.laterButton}
          onPress={() => router.push('/(tabs)/')}
          accessibilityRole="button"
        >
          <Text style={styles.laterText}>Maybe Later</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  heading: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  pricing: { marginBottom: 32, alignItems: 'center' },
  pricingItem: { fontSize: 15, color: '#333', marginBottom: 4 },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  upgradeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  laterButton: { paddingVertical: 10 },
  laterText: { color: '#888', fontSize: 15 },
});

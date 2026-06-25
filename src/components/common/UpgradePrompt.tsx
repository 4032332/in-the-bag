import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases from 'react-native-purchases';
import { useDemoMode } from '../../hooks/useDemoMode';

// Modal version — used by settings/profile screens
interface ModalProps {
  visible: boolean
  onClose: () => void
}

export function UpgradePrompt({ visible, onClose }: ModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Premium Feature</Text>
          <Text style={styles.cardDesc}>Upgrade to unlock this feature.</Text>
          <TouchableOpacity style={styles.cardBtn} onPress={onClose}>
            <Text style={styles.cardBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Full-screen version — used by explore tab
const FEATURE_COPY: Record<string, { heading: string; description: string }> = {
  explore: {
    heading: 'AI Holiday Planning',
    description:
      'Find a Holiday uses AI to suggest personalised destinations based on your preferences. ' +
      'Enhance My Trip extracts recommendations from YouTube and TikTok videos and adds them to your trip.',
  },
};

interface FullScreenProps {
  feature: string;
}

export default function UpgradePromptFullScreen({ feature }: FullScreenProps) {
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
  // Modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, width: '80%' },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 16, color: '#666', marginBottom: 24 },
  cardBtn: { backgroundColor: '#2C3E50', padding: 16, borderRadius: 8, alignItems: 'center' },
  cardBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  // Full-screen styles
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

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_MODE_ENABLED } from '../lib/constants';
import { UpgradePromptSheet } from './upgrade/UpgradePromptSheet';

export function DemoBanner() {
  const { isDemoMode, demoTier } = useDemoMode();
  const insets = useSafeAreaInsets();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!DEMO_MODE_ENABLED || !isDemoMode) return null;

  return (
    <>
      <View style={[styles.banner, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.label}>
          Demo Mode — {demoTier === 'premium' ? 'Premium' : 'Free'}
        </Text>
        <TouchableOpacity onPress={() => setShowUpgrade(true)}>
          <Text style={styles.switchLabel}>Switch</Text>
        </TouchableOpacity>
      </View>
      <UpgradePromptSheet
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureTitle="Demo Mode Switcher"
        featureDescription="Switch tiers to preview the app experience."
        variant="demo"
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  label: { color: '#ffffff', fontSize: 12, fontWeight: '500' },
  switchLabel: { color: '#f0c040', fontSize: 12, fontWeight: '600' },
});

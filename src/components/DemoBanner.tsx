import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActionSheetIOS } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemoMode } from '../hooks/useDemoMode';
import { DEMO_MODE_ENABLED } from '../lib/constants';

export function DemoBanner() {
  const { isDemoMode, demoTier, setDemoTier } = useDemoMode();
  const insets = useSafeAreaInsets();

  if (!DEMO_MODE_ENABLED || !isDemoMode) return null;

  function handleSwitch() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Switch to Free', 'Switch to Premium', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (idx) => {
        if (idx === 0) setDemoTier('free');
        else if (idx === 1) setDemoTier('premium');
      }
    );
  }

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.label}>
        Demo Mode — {demoTier === 'premium' ? 'Premium' : 'Free'}
      </Text>
      <TouchableOpacity onPress={handleSwitch}>
        <Text style={styles.switchLabel}>Switch</Text>
      </TouchableOpacity>
    </View>
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

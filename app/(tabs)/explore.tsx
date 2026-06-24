import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDemoMode } from '@/hooks/useDemoMode';
import ExploreScreen from '@/components/explore/ExploreScreen';
import UpgradePrompt from '@/components/common/UpgradePrompt';

export default function ExploreTab() {
  const { isDemoMode, demoTier } = useDemoMode();
  const insets = useSafeAreaInsets();

  const hasAccess = isDemoMode ? demoTier === 'premium' : false;

  if (!hasAccess) {
    return <UpgradePrompt feature="explore" />;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ExploreScreen />
    </View>
  );
}

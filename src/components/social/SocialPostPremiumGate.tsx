import React, { useState } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDemoMode } from '../../hooks/useDemoMode'
import { UpgradePromptSheet } from '../upgrade/UpgradePromptSheet'

export function SocialPostPremiumGate({ onPressAllowed }: { onPressAllowed: () => void }) {
  const { isDemoMode, demoTier } = useDemoMode()
  const [showUpgrade, setShowUpgrade] = useState(false)

  // In real app, we check usePremium(). If false, we show gate.
  // The caller decides when to render this gate vs the real button.
  
  const handlePress = () => {
    setShowUpgrade(true)
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.button}>
        <Ionicons name="share-social" size={24} color="rgba(0,0,0,0.4)" />
      </TouchableOpacity>
      <UpgradePromptSheet
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureTitle="Social Media Posts"
        featureDescription="Social Media Posts are a Premium feature"
        variant={isDemoMode && demoTier === 'free' ? 'demo' : 'live'}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: 8
  }
})

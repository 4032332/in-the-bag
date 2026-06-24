import React, { useState } from 'react'
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { AccountSection } from '@/components/settings/AccountSection'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { UpgradePrompt } from '@/components/common/UpgradePrompt'

export default function SettingsScreen() {
  const { user, loading } = useCurrentUser()
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  
  // Local state to reflect preference updates instantly before DB sync completes
  const [localUser, setLocalUser] = useState(user)

  // Sync localUser when user finishes loading
  React.useEffect(() => {
    if (user) setLocalUser(user)
  }, [user])

  if (loading || !localUser) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  const handleUpdatePreference = (key: string, value: string) => {
    setLocalUser({ ...localUser, [key]: value } as any)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PreferencesSection 
        user={localUser} 
        onUpdate={handleUpdatePreference} 
        onUpgradePrompt={() => setShowUpgradePrompt(true)}
      />
      <AccountSection userId={localUser.id} />

      <UpgradePrompt 
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { paddingVertical: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
})

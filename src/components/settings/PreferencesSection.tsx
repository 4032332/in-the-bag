import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import SegmentedControl from '@react-native-segmented-control/segmented-control'
import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/mmkv'
import { UserProfile } from '@/hooks/useCurrentUser'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'

interface Props {
  user: UserProfile
  onUpdate: (key: string, value: string) => void
  onUpgradePrompt: () => void
}

export function PreferencesSection({ user, onUpdate, onUpgradePrompt }: Props) {
  const { isPremium } = useSubscriptionStatus(user.id)

  const handleUpdate = async (key: string, value: string) => {
    // 1. Update local state
    onUpdate(key, value)
    // 2. Cache in MMKV
    storage.set(`pref_${key}`, value)
    // 3. Update DB
    await supabase.from('users').update({ [key]: value }).eq('id', user.id)
  }

  // Segment values
  const dateFormats = ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'DD-Month']
  const timeFormats = ['12hr', '24hr']
  const colourSchemes = ['Light', 'Dark', 'Auto']
  const displayStyles = ['Tiles', 'Stacked', 'Treasure Map']

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Preferences</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Date Format</Text>
        <SegmentedControl
          style={styles.segmented}
          values={dateFormats}
          selectedIndex={Math.max(0, dateFormats.indexOf(user.pref_date_format || 'DD-MM-YYYY'))}
          onChange={(event) => {
            handleUpdate('pref_date_format', dateFormats[event.nativeEvent.selectedSegmentIndex])
          }}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Time Format</Text>
        <SegmentedControl
          style={styles.segmented}
          values={timeFormats}
          selectedIndex={Math.max(0, timeFormats.indexOf(user.pref_time_format || '12hr'))}
          onChange={(event) => {
            handleUpdate('pref_time_format', timeFormats[event.nativeEvent.selectedSegmentIndex])
          }}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Colour Scheme</Text>
        <SegmentedControl
          style={styles.segmented}
          values={colourSchemes}
          selectedIndex={Math.max(0, colourSchemes.indexOf(user.pref_colour_scheme || 'Light'))}
          onChange={(event) => {
            handleUpdate('pref_colour_scheme', colourSchemes[event.nativeEvent.selectedSegmentIndex])
          }}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Display Style</Text>
        <SegmentedControl
          style={styles.segmented}
          values={displayStyles}
          selectedIndex={Math.max(0, displayStyles.indexOf(user.pref_trip_display_style || 'Tiles'))}
          onValueChange={(value) => {
            if (value === 'Treasure Map' && !isPremium) {
              onUpgradePrompt()
            } else {
              handleUpdate('pref_trip_display_style', value)
            }
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  row: { marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  segmented: { height: 32 },
})

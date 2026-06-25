import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import { PostcardCreator } from './PostcardCreator'
import { StatsCardCreator } from './StatsCardCreator'
import { useSocialPostCreator } from '../../hooks/useSocialPostCreator'
// import { useHealthKitData } from '../../hooks/useHealthKitData' // From Plan 8

interface SocialPostCreatorSheetProps {
  visible: boolean
  onClose: () => void
  trip: any
  day?: any
}

export function SocialPostCreatorSheet({ visible, onClose, trip, day }: SocialPostCreatorSheetProps) {
  const [tab, setTab] = useState<'postcard' | 'stats'>('postcard')
  const { savePostcard, saveStatsCard, isSaving } = useSocialPostCreator()
  
  // Example HealthKit mock. In reality, use hook from Plan 8.
  const healthKitSteps = undefined

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Social Post</Text>
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabs}>
            <TouchableOpacity onPress={() => setTab('postcard')} style={[styles.tab, tab === 'postcard' && styles.activeTab]}>
              <Text style={styles.tabText}>Postcard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('stats')} style={[styles.tab, tab === 'stats' && styles.activeTab]}>
              <Text style={styles.tabText}>Stats Card</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {tab === 'postcard' ? (
              <PostcardCreator 
                trip={trip} 
                day={day} 
                onSave={(ref) => savePostcard(trip, day, ref)}
                isSaving={isSaving}
              />
            ) : (
              <StatsCardCreator 
                trip={trip} 
                day={day} 
                healthKitSteps={healthKitSteps}
                onSave={(ref) => saveStatsCard(trip, day, healthKitSteps, ref)}
                isSaving={isSaving}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  close: { fontSize: 16, color: '#007AFF' },
  tabs: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#f0f0f0' },
  activeTab: { backgroundColor: '#000' },
  tabText: { color: '#888', fontWeight: '600' },
  content: { alignItems: 'center' }
})

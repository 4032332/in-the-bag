import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native'
import SegmentedControl from '@react-native-segmented-control/segmented-control'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'

import MyDetailsScreen from './my-details'
import FamilyMembersScreen from './family-members'
import TripHistoryScreen from './trip-history'

export default function ProfileRoot() {
  const { user } = useCurrentUser()
  const { isPremium } = useSubscriptionStatus(user?.id || '')
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatarContainer, isPremium && styles.avatarPremium]}>
          {user?.profile_photo_url ? (
            <Image source={{ uri: user.profile_photo_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
      </View>

      <View style={styles.segmentContainer}>
        <SegmentedControl
          values={['My Details', 'Family', 'Trip History']}
          selectedIndex={selectedIndex}
          onChange={(event) => {
            setSelectedIndex(event.nativeEvent.selectedSegmentIndex)
          }}
          tintColor="#2C3E50"
          backgroundColor="#F0F0F0"
        />
      </View>

      <View style={styles.content}>
        {selectedIndex === 0 && <MyDetailsScreen />}
        {selectedIndex === 1 && <FamilyMembersScreen />}
        {selectedIndex === 2 && <TripHistoryScreen />}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#F9F6F0' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, padding: 2 },
  avatarPremium: { borderWidth: 2, borderColor: '#D4AF37' },
  avatar: { width: '100%', height: '100%', borderRadius: 40 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '600', color: '#666' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  segmentContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  content: { flex: 1 },
})

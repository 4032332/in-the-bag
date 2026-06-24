import React, { useRef, useState } from 'react'
import { SectionList, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useActionSheet } from '@expo/react-native-action-sheet'
import BottomSheet from '@gorhom/bottom-sheet'
import { Ionicons } from '@expo/vector-icons'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useFamilyMembers, FamilyMember } from '@/hooks/useFamilyMembers'
import { usePendingInvitations } from '@/hooks/usePendingInvitations'
import { supabase } from '@/lib/supabase'
import { resendInvitation, cancelInvitation } from '@/lib/invitations'

import { FamilyMemberCard } from '@/components/profile/FamilyMemberCard'
import { GuestProfileSheet } from '@/components/profile/GuestProfileSheet'
import { InvitationSheet } from '@/components/profile/InvitationSheet'
import { PendingInvitationRow } from '@/components/profile/PendingInvitationRow'

export default function FamilyMembersScreen() {
  const { user } = useCurrentUser()
  const { members, loading } = useFamilyMembers(user?.id)
  const invitations = usePendingInvitations(user?.id)
  const { showActionSheetWithOptions } = useActionSheet()

  const guestSheetRef = useRef<BottomSheet>(null)
  const inviteSheetRef = useRef<BottomSheet>(null)

  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)

  const linkedAccounts = members.filter(m => !m.is_guest)
  const guests = members.filter(m => m.is_guest)

  const sections = []
  if (linkedAccounts.length > 0) {
    sections.push({ title: 'Linked Accounts', data: linkedAccounts })
  }
  if (guests.length > 0) {
    sections.push({ title: 'Guest Profiles', data: guests })
  }
  if (invitations.length > 0) {
    sections.push({ title: 'Pending Invitations', data: invitations, isInvitations: true })
  }

  const handleMemberLongPress = (member: FamilyMember) => {
    if (!user) return

    showActionSheetWithOptions(
      {
        options: ['Remove from Family', 'Cancel'],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      async (btnIdx) => {
        if (btnIdx === 0) {
          try {
            if (member.is_guest) {
              await supabase.from('guest_profiles').delete().eq('id', member.guest_profile_id)
            } else {
              // Only remove from groups we own
              const { data: myGroups } = await supabase.from('family_groups').select('id').eq('created_by_user_id', user.id)
              const myGroupIds = (myGroups || []).map(g => g.id)
              const groupsToRemoveFrom = member.group_ids.filter(gid => myGroupIds.includes(gid))
              
              if (groupsToRemoveFrom.length > 0) {
                await supabase.from('family_group_members')
                  .delete()
                  .eq('user_id', member.user_id)
                  .in('family_group_id', groupsToRemoveFrom)
              }
            }
            Alert.alert('Success', 'Removed from family')
          } catch (e: any) {
            Alert.alert('Error', e.message)
          }
        }
      }
    )
  }

  const handleMemberPress = (member: FamilyMember) => {
    if (member.is_guest) {
      setSelectedGuestId(member.guest_profile_id)
      guestSheetRef.current?.expand()
    } else {
      Alert.alert('View Profile', 'Linked account profiles are read-only to others.')
    }
  }

  const handleResend = async (id: string) => {
    await resendInvitation(id)
    Alert.alert('Success', 'Invitation resent')
  }

  const handleCancel = async (id: string) => {
    await cancelInvitation(id)
  }

  const openAddMenu = () => {
    showActionSheetWithOptions(
      {
        options: ['Send Invitation', 'Add Guest Profile', 'Cancel'],
        cancelButtonIndex: 2,
      },
      (btnIdx) => {
        if (btnIdx === 0) inviteSheetRef.current?.expand()
        if (btnIdx === 1) {
          setSelectedGuestId(null)
          guestSheetRef.current?.expand()
        }
      }
    )
  }

  if (loading || !user) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections as any}
        keyExtractor={(item) => (item as any).id || (item as any).user_id || (item as any).guest_profile_id || Math.random().toString()}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          if ((section as any).isInvitations) {
            return (
              <PendingInvitationRow 
                invitation={item as any} 
                onResend={handleResend} 
                onCancel={handleCancel} 
              />
            )
          }
          return (
            <FamilyMemberCard 
              member={item as FamilyMember} 
              onPress={handleMemberPress}
              onLongPress={handleMemberLongPress}
            />
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No family members yet.</Text>
            <Text style={styles.emptyDesc}>Invite family members or add guest profiles to start planning together.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity style={styles.fab} onPress={openAddMenu}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>

      <GuestProfileSheet
        sheetRef={guestSheetRef as any}
        guestId={selectedGuestId}
        currentUserId={user.id}
        onClose={() => guestSheetRef.current?.close()}
        onSaved={() => {}}
      />

      <InvitationSheet
        sheetRef={inviteSheetRef as any}
        onClose={() => inviteSheetRef.current?.close()}
        onSent={() => {}}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F9F9F9' },
  headerTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
})

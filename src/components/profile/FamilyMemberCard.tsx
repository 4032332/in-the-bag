import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { FamilyMember } from '@/hooks/useFamilyMembers'

interface Props {
  member: FamilyMember
  onPress: (member: FamilyMember) => void
  onLongPress?: (member: FamilyMember) => void
}

export function FamilyMemberCard({ member, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(member)}
      onLongPress={() => onLongPress?.(member)}
      delayLongPress={500}
    >
      {member.profile_photo_url ? (
        <Image source={{ uri: member.profile_photo_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{member.full_name?.charAt(0) || '?'}</Text>
        </View>
      )}
      
      <View style={styles.info}>
        <Text style={styles.name}>{member.full_name}</Text>
        <Text style={styles.role}>
          {member.family_role 
            ? member.family_role.charAt(0).toUpperCase() + member.family_role.slice(1) 
            : 'Member'}
          {member.is_guest && ' (Guest)'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center', backgroundColor: '#FFF' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 16 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E8E8', marginRight: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600', color: '#666' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  role: { fontSize: 14, color: '#666' },
})

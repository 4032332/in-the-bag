import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { FamilyRolePicker } from '@/components/profile/FamilyRolePicker'
import { sendInvitation } from '@/lib/invitations'

interface InvitationSheetProps {
  sheetRef: React.RefObject<BottomSheet>
  onClose: () => void
  onSent: () => void
}

export function InvitationSheet({ sheetRef, onClose, onSent }: InvitationSheetProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!email || !role) {
      Alert.alert('Validation Error', 'Email and Role are required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Invalid email format')
      return
    }

    setSending(true)
    try {
      await sendInvitation({ invitee_email: email, family_role: role })
      setEmail('')
      setRole('')
      onSent()
      onClose()
      Alert.alert('Success', 'Invitation sent!')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={['50%']} enablePanDownToClose onClose={onClose}>
      <BottomSheetScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Send Invitation</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.desc}>
          Invite a family member to join your account. They will receive an email with a link to accept.
        </Text>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="example@email.com"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Family Role</Text>
          <FamilyRolePicker selected={role} onChange={setRole} />
        </View>

        <TouchableOpacity 
          style={[styles.sendBtn, (!email || !role || sending) && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={!email || !role || sending}
        >
          {sending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendBtnText}>Send Invitation</Text>}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  closeBtn: { fontSize: 16, color: '#007AFF' },
  desc: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A1A2E' },
  sendBtn: { backgroundColor: '#2C3E50', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  sendBtnDisabled: { backgroundColor: '#95A5A6' },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
})

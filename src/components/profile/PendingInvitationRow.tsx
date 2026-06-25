import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { PendingInvitation } from '@/hooks/usePendingInvitations'

interface Props {
  invitation: PendingInvitation
  onResend: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
}

export function PendingInvitationRow({ invitation, onResend, onCancel }: Props) {
  const [resending, setResending] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleResend = async () => {
    setResending(true)
    try { await onResend(invitation.id) } finally { setResending(false) }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try { await onCancel(invitation.id) } finally { setCancelling(false) }
  }

  const isExpired = invitation.status === 'expired'

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.email}>{invitation.invitee_email}</Text>
        <Text style={styles.role}>Role: {invitation.family_role}</Text>
        <View style={[styles.pill, isExpired ? styles.pillExpired : styles.pillPending]}>
          <Text style={[styles.pillText, isExpired ? styles.pillTextExpired : styles.pillTextPending]}>
            {isExpired ? 'Expired' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnResend} onPress={handleResend} disabled={resending || cancelling}>
          {resending ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.btnResendText}>Resend</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnCancel} onPress={handleCancel} disabled={resending || cancelling}>
          {cancelling ? <ActivityIndicator size="small" color="#FF3B30" /> : <Text style={styles.btnCancelText}>Cancel</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  info: { flex: 1 },
  email: { fontSize: 16, fontWeight: '500', color: '#1A1A2E', marginBottom: 4 },
  role: { fontSize: 13, color: '#666', marginBottom: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillExpired: { backgroundColor: '#F3F4F6' },
  pillText: { fontSize: 11, fontWeight: '600' },
  pillTextPending: { color: '#D97706' },
  pillTextExpired: { color: '#6B7280' },
  actions: { alignItems: 'flex-end', justifyContent: 'center' },
  btnResend: { paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  btnResendText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
  btnCancel: { paddingVertical: 6, paddingHorizontal: 12 },
  btnCancelText: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
})

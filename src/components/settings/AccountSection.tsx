import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Linking, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { deleteAccount } from '@/lib/deleteAccount'
import Purchases from 'react-native-purchases'
import { router } from 'expo-router'

interface Props {
  userId: string
}

export function AccountSection({ userId }: Props) {
  const { type, expires_at, isPremium } = useSubscriptionStatus(userId)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    const checkProviders = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.app_metadata?.providers) {
        const providers = session.user.app_metadata.providers
        if (!providers.includes('email')) {
          setHasPassword(false)
        }
      }
    }
    checkProviders()
  }, [])

  const handleChangeEmail = async () => {
    if (!newEmail) return
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Check your inbox to confirm the new email address.')
      setShowEmailModal(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Your password has been updated.')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordModal(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount()
              router.replace('/')
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          }
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Subscription</Text>
        <Text style={styles.value}>
          {isPremium ? (type === 'lifetime' ? 'Lifetime Premium' : `Monthly Premium (expires ${expires_at ? new Date(expires_at).toLocaleDateString() : ''})`) : 'Free'}
        </Text>
      </View>

      {!isPremium && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => (Purchases as any).presentPaywallIfNeeded()}>
          <Text style={styles.actionBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      )}

      {isPremium && (
        <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
          <Text style={styles.actionBtnText}>Manage Subscription</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.actionBtn} onPress={() => Purchases.restorePurchases()}>
        <Text style={styles.actionBtnText}>Restore Purchase</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowEmailModal(true)}>
        <Text style={styles.actionBtnText}>Change Email</Text>
      </TouchableOpacity>

      {hasPassword ? (
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPasswordModal(true)}>
          <Text style={styles.actionBtnText}>Change Password</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionBtnStatic}>
          <Text style={styles.staticText}>Password managed by Apple / Google</Text>
        </View>
      )}

      <TouchableOpacity style={styles.actionBtn} onPress={handleSignOut}>
        <Text style={styles.actionBtnText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.deleteSection}>
        <Text style={styles.deleteDesc}>To delete your account, type DELETE below:</Text>
        <TextInput
          style={styles.deleteInput}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          placeholder="DELETE"
          autoCapitalize="characters"
        />
        <TouchableOpacity 
          style={[styles.deleteBtn, deleteConfirm !== 'DELETE' && styles.deleteBtnDisabled]}
          onPress={handleDeleteAccount}
          disabled={deleteConfirm !== 'DELETE'}
          testID="delete-account-btn"
        >
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm New Password"
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={savingPassword}>
            <Text style={styles.saveBtnText}>{savingPassword ? 'Saving...' : 'Update Password'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword('') }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showEmailModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Email</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="New Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleChangeEmail}>
            <Text style={styles.saveBtnText}>Send Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEmailModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 40, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { fontSize: 16, color: '#1A1A2E', fontWeight: '500' },
  value: { fontSize: 16, color: '#666' },
  actionBtn: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  actionBtnStatic: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  actionBtnText: { fontSize: 16, color: '#007AFF' },
  staticText: { fontSize: 16, color: '#999' },
  deleteSection: { marginTop: 32, padding: 16, backgroundColor: '#FFF0F0', borderRadius: 8 },
  deleteDesc: { fontSize: 14, color: '#D8000C', marginBottom: 12 },
  deleteInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFBABA', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  deleteBtn: { backgroundColor: '#D8000C', borderRadius: 8, padding: 14, alignItems: 'center' },
  deleteBtnDisabled: { backgroundColor: '#FFBABA' },
  deleteBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 24, backgroundColor: '#FFF' },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 24 },
  saveBtn: { backgroundColor: '#2C3E50', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', padding: 16 },
  cancelBtnText: { color: '#007AFF', fontSize: 16 },
})

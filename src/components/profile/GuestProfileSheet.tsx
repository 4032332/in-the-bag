import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { supabase } from '@/lib/supabase'
import { ProfilePhotoUploader } from '@/components/profile/ProfilePhotoUploader'
import { FamilyRolePicker } from '@/components/profile/FamilyRolePicker'

interface GuestProfileSheetProps {
  sheetRef: React.RefObject<BottomSheet>
  guestId?: string | null
  currentUserId: string
  onClose: () => void
  onSaved: () => void
}

function newGuestStorageId(): string {
  return `guest-new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function GuestProfileSheet({ sheetRef, guestId, currentUserId, onClose, onSaved }: GuestProfileSheetProps) {
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Stable storage path for new guests so multiple photo uploads during one sheet session
  // all go to the same prefix, not all to "guest-new/" overwriting each other.
  const newGuestIdRef = useRef<string>(newGuestStorageId())

  useEffect(() => {
    if (guestId) {
      setLoading(true)
      supabase.from('guest_profiles').select('*').eq('id', guestId).single()
        .then(({ data }) => {
          if (data) setForm(data)
          setLoading(false)
        })
    } else {
      setForm({})
    }
  }, [guestId])

  const handleSave = async () => {
    if (!form.full_name) {
      Alert.alert('Validation Error', 'Full Name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        profile_photo_url: form.profile_photo_url,
        family_role: form.family_role,
        disability_accessibility_needs: form.disability_accessibility_needs,
        medical_conditions: form.medical_conditions,
        medications: form.medications,
        food_allergies: form.food_allergies,
        dietary_requirements: form.dietary_requirements,
        managed_by_user_id: currentUserId,
      }

      let error
      if (guestId) {
        const res = await supabase.from('guest_profiles').update(payload).eq('id', guestId)
        error = res.error
      } else {
        const res = await supabase.from('guest_profiles').insert(payload)
        error = res.error
      }

      if (error) throw error

      onSaved()
      onClose()
    } catch (err: any) {
      Alert.alert('Error saving guest profile', err.message)
    } finally {
      setSaving(false)
    }
  }

  const renderField = (label: string, key: string, multiline = false) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={form[key] || ''}
        onChangeText={(txt) => setForm({ ...form, [key]: txt })}
        multiline={multiline}
      />
    </View>
  )

  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={['90%']} enablePanDownToClose onClose={onClose}>
      <BottomSheetScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{guestId ? 'Edit Guest Profile' : 'Add Guest Profile'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || loading}>
            <Text style={styles.saveBtn}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <>
            <ProfilePhotoUploader
              userId={guestId ? `guest-${guestId}` : newGuestIdRef.current}
              currentUrl={form.profile_photo_url}
              onUploadComplete={(url) => setForm({ ...form, profile_photo_url: url })}
            />

            {renderField('Full Name', 'full_name')}
            
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.date_of_birth || ''}
                onChangeText={(txt) => setForm({ ...form, date_of_birth: txt })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Family Role</Text>
              <FamilyRolePicker 
                selected={form.family_role}
                onChange={(role) => setForm({ ...form, family_role: role })}
              />
            </View>

            <Text style={styles.sectionTitle}>Medical & Needs</Text>
            {renderField('Medical Conditions', 'medical_conditions', true)}
            {renderField('Medications', 'medications', true)}
            {renderField('Food Allergies', 'food_allergies', true)}
            {renderField('Dietary Requirements', 'dietary_requirements', true)}
            {renderField('Disability / Accessibility Needs', 'disability_accessibility_needs', true)}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700' },
  saveBtn: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 16 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A1A2E', minHeight: 44 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
})

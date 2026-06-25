import React, { useState, useEffect } from 'react'
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { supabase } from '@/lib/supabase'
import { ProfilePhotoUploader } from '@/components/profile/ProfilePhotoUploader'
import { CitizenshipCountryPicker } from '@/components/profile/CitizenshipCountryPicker'
import { FamilyRolePicker } from '@/components/profile/FamilyRolePicker'
import DateTimePicker from '@react-native-community/datetimepicker'

export default function MyDetailsScreen() {
  const { user, loading } = useCurrentUser()
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (user && !isEditing) {
      setForm(user)
    }
  }, [user, isEditing])

  if (loading || !user) {
    return <View style={styles.center}><ActivityIndicator /></View>
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: form.full_name,
          date_of_birth: form.date_of_birth,
          phone: form.phone,
          address: form.address,
          country_of_residency: form.country_of_residency,
          citizenship_countries: form.citizenship_countries,
          passport_expiry: form.passport_expiry,
          family_role: form.family_role,
          disability_accessibility_needs: form.disability_accessibility_needs,
          medical_conditions: form.medical_conditions,
          medications: form.medications,
          food_allergies: form.food_allergies,
          dietary_requirements: form.dietary_requirements,
        })
        .eq('id', user.id)

      if (error) throw error
      setIsEditing(false)
      Alert.alert('Success', 'Profile updated successfully')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const renderField = (label: string, key: string, multiline = false) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={form[key] || ''}
            onChangeText={(txt) => setForm({ ...form, [key]: txt })}
            multiline={multiline}
          />
        ) : (
          <Text style={styles.valueText}>{form[key] || 'Not specified'}</Text>
        )}
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Personal</Text>
        <TouchableOpacity onPress={isEditing ? handleSave : () => setIsEditing(true)} disabled={saving}>
          <Text style={styles.editButton}>{saving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ProfilePhotoUploader 
        userId={user.id} 
        currentUrl={form.profile_photo_url} 
        onUploadComplete={(url) => {
          setForm({ ...form, profile_photo_url: url })
        }} 
      />

      {renderField('Full Name', 'full_name')}
      
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Date of Birth</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={form.date_of_birth || ''}
            onChangeText={(txt) => setForm({ ...form, date_of_birth: txt })}
            placeholder="YYYY-MM-DD"
          />
        ) : (
          <Text style={styles.valueText}>{form.date_of_birth || 'Not specified'}</Text>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Family Role</Text>
        {isEditing ? (
          <FamilyRolePicker 
            selected={form.family_role} 
            onChange={(role) => setForm({ ...form, family_role: role })} 
          />
        ) : (
          <Text style={styles.valueText}>{form.family_role ? form.family_role.charAt(0).toUpperCase() + form.family_role.slice(1) : 'Not specified'}</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Contact</Text>
      {renderField('Phone', 'phone')}
      {renderField('Address', 'address', true)}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Location</Text>
      {renderField('Country of Residency', 'country_of_residency')}

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Citizenship Countries</Text>
        {isEditing ? (
          <CitizenshipCountryPicker 
            selected={form.citizenship_countries || []} 
            onChange={(c) => setForm({ ...form, citizenship_countries: c })} 
          />
        ) : (
          <Text style={styles.valueText}>
            {form.citizenship_countries?.length ? form.citizenship_countries.join(', ') : 'Not specified'}
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Travel</Text>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Passport Expiry</Text>
        {isEditing ? (
          <>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text>{form.passport_expiry || 'Select date'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.passport_expiry ? new Date(form.passport_expiry) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false)
                  if (selectedDate) {
                    setForm({ ...form, passport_expiry: selectedDate.toISOString().split('T')[0] })
                  }
                }}
              />
            )}
          </>
        ) : (
          <Text style={styles.valueText}>{form.passport_expiry || 'Not specified'}</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Medical & Needs</Text>
      {renderField('Medical Conditions', 'medical_conditions', true)}
      {renderField('Medications', 'medications', true)}
      {renderField('Food Allergies', 'food_allergies', true)}
      {renderField('Dietary Requirements', 'dietary_requirements', true)}
      {renderField('Disability / Accessibility Needs', 'disability_accessibility_needs', true)}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  editButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  valueText: { fontSize: 16, color: '#1A1A2E', minHeight: 24 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 16, color: '#1A1A2E', minHeight: 44 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
})

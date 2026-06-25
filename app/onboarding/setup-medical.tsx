import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

export default function SetupMedicalScreen() {
  const { user } = useAuth();
  const [fields, setFields] = useState({
    disability_accessibility_needs: '',
    medical_conditions: '',
    medications: '',
    food_allergies: '',
    dietary_requirements: '',
  });

  async function handleNext() {
    const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v.trim() !== ''));
    if (Object.keys(updates).length > 0) {
      const { error } = await (supabase.from('users') as any).update(updates).eq('id', user!.id);
      if (error) { Alert.alert('Error', error.message); return; }
    }
    router.push('/onboarding/setup-passport');
  }

  const labels: Record<keyof typeof fields, string> = {
    disability_accessibility_needs: 'Disability and accessibility needs',
    medical_conditions: 'Medical conditions',
    medications: 'Medications',
    food_allergies: 'Food allergies',
    dietary_requirements: 'Dietary requirements',
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Medical information</Text>
      <Text style={styles.sub}>Optional — you can complete this later in your profile.</Text>
      {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
        <TextInput key={key} style={styles.input} placeholder={labels[key]} value={fields[key]} onChangeText={(v) => setFields({ ...fields, [key]: v })} multiline />
      ))}
      <TouchableOpacity style={styles.btn} onPress={handleNext}>
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/onboarding/setup-passport')}>
        <Text style={styles.skip}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '700' },
  sub: { fontSize: 14, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15 },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 8 },
});

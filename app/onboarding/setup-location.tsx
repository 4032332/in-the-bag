import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

export default function SetupLocationScreen() {
  const { user } = useAuth();
  const [residency, setResidency] = useState('');
  const [citizenship, setCitizenship] = useState('');

  async function handleNext() {
    const citizenshipArr = citizenship.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('users').update({ country_of_residency: residency.trim(), citizenship_countries: citizenshipArr }).eq('id', user!.id);
    if (error) { Alert.alert('Error', error.message); return; }
    router.push('/onboarding/setup-medical');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Where are you based?</Text>
      <TextInput style={styles.input} placeholder="Country of residency" value={residency} onChangeText={setResidency} />
      <TextInput style={styles.input} placeholder="Citizenship countries (comma-separated)" value={citizenship} onChangeText={setCitizenship} />
      <TouchableOpacity style={styles.btn} onPress={handleNext}>
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
  heading: { fontSize: 26, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

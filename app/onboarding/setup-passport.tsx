import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';

export default function SetupPassportScreen() {
  const { user } = useAuth();
  const [passportExpiry, setPassportExpiry] = useState('');

  async function handleFinish() {
    if (passportExpiry.trim()) {
      const { error } = await (supabase.from('users') as any).update({ passport_expiry: passportExpiry.trim() }).eq('id', user!.id);
      if (error) { Alert.alert('Error', error.message); return; }
    }
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Passport expiry</Text>
      <Text style={styles.sub}>Optional — date only, no passport number stored.</Text>
      <TextInput style={styles.input} placeholder="DD-MM-YYYY" value={passportExpiry} onChangeText={setPassportExpiry} />
      <TouchableOpacity style={styles.btn} onPress={handleFinish}>
        <Text style={styles.btnText}>Finish setup</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
        <Text style={styles.skip}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#fff' },
  heading: { fontSize: 26, fontWeight: '700' },
  sub: { fontSize: 14, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  btn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { textAlign: 'center', color: '#888', fontSize: 14 },
});

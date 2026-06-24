import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { DEMO_MODE_ENABLED } from '../../src/lib/constants';
import { useState } from 'react';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    setLoading(true);
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (isSignUp) {
      router.replace('/onboarding/setup-name');
    } else {
      router.replace('/(tabs)/home');
    }
  }

  function handleDemo() {
    router.replace('/onboarding/demo-tier');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{isSignUp ? 'Create account' : 'Welcome back'}</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailAuth} disabled={loading}>
        <Text style={styles.primaryBtnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggle}>{isSignUp ? 'Already have an account? Log in' : 'No account? Sign up'}</Text>
      </TouchableOpacity>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.socialBtn}>
        <Text style={styles.socialBtnText}>Continue with Apple</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.socialBtn}>
        <Text style={styles.socialBtnText}>Continue with Google</Text>
      </TouchableOpacity>
      {DEMO_MODE_ENABLED && (
        <TouchableOpacity style={styles.demoBtn} onPress={handleDemo}>
          <Text style={styles.demoBtnText}>Continue as Guest (Demo Mode)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12, backgroundColor: '#fff' },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16 },
  primaryBtn: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { textAlign: 'center', color: '#555', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  socialBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, alignItems: 'center' },
  socialBtnText: { fontSize: 16, fontWeight: '500' },
  demoBtn: { borderWidth: 1, borderColor: '#f0c040', borderRadius: 12, padding: 16, alignItems: 'center' },
  demoBtnText: { fontSize: 16, color: '#b8860b', fontWeight: '500' },
});

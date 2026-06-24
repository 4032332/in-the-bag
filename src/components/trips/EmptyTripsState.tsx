import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export function EmptyTripsState() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>No trips yet</Text>
      <Text style={styles.subtext}>Tap the button below to plan your first adventure.</Text>
      <TouchableOpacity style={styles.cta} onPress={() => router.push('/trips/create' as any)}>
        <Text style={styles.ctaText}>Create your first trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  headline: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtext: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  cta: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

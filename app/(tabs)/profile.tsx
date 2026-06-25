import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.empty}>Your profile and family members will appear here.</Text>

      <TouchableOpacity
        style={styles.statsRow}
        onPress={() => router.push('/(tabs)/stats')}
        accessibilityRole="button"
      >
        <Text style={styles.statsRowText}>Stats</Text>
        <Text style={styles.chevron}>{'>'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '700' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', paddingHorizontal: 32 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    width: '80%',
    marginTop: 8,
  },
  statsRowText: { fontSize: 16, fontWeight: '500' },
  chevron: { fontSize: 16, color: '#999' },
});

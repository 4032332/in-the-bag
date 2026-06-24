import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export function BackButton() {
  return (
    <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
      <Text style={styles.label}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 8 },
  label: { fontSize: 16, color: '#1a1a2e' },
});

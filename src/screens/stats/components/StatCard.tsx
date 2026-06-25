import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, subtitle, onPress }: Props) {
  const content = (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} accessibilityRole="button">
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: '500' },
  value: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4 },
});

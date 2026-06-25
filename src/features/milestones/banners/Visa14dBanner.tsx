import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  onConfirm: () => void
  onDismiss: () => void
}

export function Visa14dBanner({ onConfirm, onDismiss }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
        <Ionicons name="close" size={20} color="#666" />
      </TouchableOpacity>
      <Text style={styles.title}>Confirm your visa and immigration requirements</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConfirm}>
          <Text style={styles.primaryButtonText}>I've sorted this</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onDismiss}>
          <Text style={styles.secondaryButtonText}>Not applicable to me</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  closeButton: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 12, paddingRight: 24 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  primaryButton: { backgroundColor: '#007AFF' },
  primaryButtonText: { color: '#fff', fontWeight: '500' },
  secondaryButtonText: { color: '#007AFF', fontWeight: '500' },
})

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  onConfirm: () => void
  onSnooze: () => void
  onDismiss: () => void
}

export function ESim7dBanner({ onConfirm, onSnooze, onDismiss }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
        <Ionicons name="close" size={20} color="#666" />
      </TouchableOpacity>
      <Text style={styles.title}>Organise an e-SIM so you're online when you land</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConfirm}>
          <Text style={styles.primaryButtonText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onSnooze}>
          <Text style={styles.secondaryButtonText}>Remind Me Later</Text>
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

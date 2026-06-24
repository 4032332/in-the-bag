import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  visible: boolean
  onClose: () => void
}

export function UpgradePrompt({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Premium Feature</Text>
          <Text style={styles.desc}>Upgrade to unlock this feature.</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, width: '80%' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  desc: { fontSize: 16, color: '#666', marginBottom: 24 },
  btn: { backgroundColor: '#2C3E50', padding: 16, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
})

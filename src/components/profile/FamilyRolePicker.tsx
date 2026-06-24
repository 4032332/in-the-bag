import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const ROLES = ['mother', 'father', 'grandmother', 'grandfather', 'child', 'other']

interface Props {
  selected: string | null
  onChange: (role: string) => void
}

export function FamilyRolePicker({ selected, onChange }: Props) {
  const [visible, setVisible] = useState(false)

  const handleSelect = (role: string) => {
    onChange(role)
    setVisible(false)
  }

  const displayRole = selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Select a role...'

  return (
    <>
      <TouchableOpacity style={styles.inputButton} onPress={() => setVisible(true)}>
        <Text style={selected ? styles.inputText : styles.placeholder}>{displayRole}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Family Role</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.doneText}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={ROLES}
            keyExtractor={item => item}
            renderItem={({ item }) => {
              const isSelected = selected === item
              return (
                <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
                  <Text style={styles.rowText}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#2C3E50" />}
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  inputButton: { padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  inputText: { fontSize: 16, color: '#1A1A2E' },
  placeholder: { fontSize: 16, color: '#999' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 18, fontWeight: '600' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowText: { fontSize: 16 },
})

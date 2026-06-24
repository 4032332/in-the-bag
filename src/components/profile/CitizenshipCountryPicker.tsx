import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  selected: string[]
  onChange: (countries: string[]) => void
}

// Map the subset or full countries from constants if available
const countryList = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
]

export function CitizenshipCountryPicker({ selected, onChange }: Props) {
  const [visible, setVisible] = useState(false)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected))

  const toggleSelection = (code: string) => {
    const next = new Set(localSelected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setLocalSelected(next)
  }

  const handleDone = () => {
    onChange(Array.from(localSelected))
    setVisible(false)
  }

  const getDisplayText = () => {
    if (!selected || selected.length === 0) return 'Select countries...'
    return selected.map((code: string) => countryList.find(c => c.code === code)?.name || code).join(', ')
  }

  return (
    <>
      <TouchableOpacity style={styles.inputButton} onPress={() => { setLocalSelected(new Set(selected)); setVisible(true) }}>
        <Text style={selected.length > 0 ? styles.inputText : styles.placeholder}>{getDisplayText()}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Citizenship</Text>
            <TouchableOpacity onPress={handleDone}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={countryList}
            keyExtractor={item => item.code}
            renderItem={({ item }) => {
              const isSelected = localSelected.has(item.code)
              return (
                <TouchableOpacity style={styles.row} onPress={() => toggleSelection(item.code)}>
                  <Text style={styles.rowText}>{item.name}</Text>
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

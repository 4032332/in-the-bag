import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useMemoriesStyle, MemoriesStyle, MEMORIES_STYLES } from '../../hooks/useMemoriesStyle'

const STYLE_LABELS: Record<MemoriesStyle, string> = {
  postcards: 'Postcards',
  fridge_magnets: 'Fridge Magnets',
  polaroids: 'Polaroids',
  passport_stamps: 'Passport Stamps',
  puzzle_pieces: 'Puzzle Pieces',
  monopoly_figures: 'Monopoly Figures'
}

export function MemoriesStyleToggle() {
  const [style, setStyle] = useMemoriesStyle()

  function handleToggle() {
    const currentIndex = MEMORIES_STYLES.indexOf(style)
    const nextIndex = (currentIndex + 1) % MEMORIES_STYLES.length
    setStyle(MEMORIES_STYLES[nextIndex])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Memories</Text>
      <TouchableOpacity onPress={handleToggle} style={styles.toggleButton}>
        <Text style={styles.toggleText}>{STYLE_LABELS[style]} ⟳</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  }
})

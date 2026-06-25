import React from 'react'
import { View, FlatList, StyleSheet, Text } from 'react-native'
import { getDestinationThemeKey, DestinationTheme } from '../../../utils/destinationTheme'

// Minimal stub for SVGs, normally these would be actual SVG assets rendered via react-native-svg
function SvgPlaceholder({ theme }: { theme: DestinationTheme }) {
  const themeColors = {
    beach: '#ffe8a1',
    mountain: '#e0f7fa',
    city: '#cfd8dc',
    desert: '#ffcc80',
    generic: '#f5f5f5'
  }
  
  return (
    <View style={[styles.svgStub, { backgroundColor: themeColors[theme] }]}>
      <Text style={styles.stubText}>{theme.toUpperCase()}</Text>
    </View>
  )
}

export function MonopolyFigureRenderer({ trips }: { trips: any[] }) {
  const renderItem = ({ item }: { item: any }) => {
    const city = item.destination || 'Unknown'
    const country = '' // Assume country is missing or part of destination string for this demo
    const theme = getDestinationThemeKey(city, country)
    const year = new Date(item.start_date).getFullYear().toString()

    return (
      <View style={styles.cardContainer}>
        <SvgPlaceholder theme={theme} />
        <Text style={styles.cityText} numberOfLines={1}>{city.toUpperCase()}</Text>
        <Text style={styles.yearText}>{year}</Text>
      </View>
    )
  }

  return (
    <FlatList
      horizontal
      data={trips}
      keyExtractor={t => t.id}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: 16 },
  cardContainer: {
    width: 130,
    height: 180,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  svgStub: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  stubText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666'
  },
  cityText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4
  },
  yearText: {
    fontSize: 12,
    color: '#888'
  }
})

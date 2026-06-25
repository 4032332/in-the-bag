import React from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Canvas, RoundedRect, Text as SkiaText, useFont, Shadow } from '@shopify/react-native-skia'

const PASTEL_COLORS = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff']

function hashString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function FridgeMagnetRenderer({ trips }: { trips: any[] }) {
  const boldFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 14) // would ideally be bold
  const smallFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 10)

  const renderItem = ({ item }: { item: any }) => {
    const dest = item.destination || 'Unknown'
    const colorIndex = hashString(dest) % PASTEL_COLORS.length
    const bgColor = PASTEL_COLORS[colorIndex]

    return (
      <View style={styles.cardContainer}>
        <Canvas style={{ width: 96, height: 96 }}>
          <RoundedRect x={4} y={4} width={88} height={88} r={16} color={bgColor}>
            <Shadow dx={2} dy={4} blur={6} color="rgba(0,0,0,0.3)" />
          </RoundedRect>
          
          {boldFont && (
            <SkiaText
              x={12}
              y={44}
              text={dest.substring(0, 10).toUpperCase()}
              font={boldFont}
              color="#333"
            />
          )}
        </Canvas>
      </View>
    )
  }

  return (
    <View style={styles.grid}>
      {trips.map(t => (
        <React.Fragment key={t.id}>
          {renderItem({ item: t })}
        </React.Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 16, gap: 8 },
  cardContainer: { width: 96, height: 96 }
})

import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Canvas, Circle, TextPath, useFont, Skia, Path, Group } from '@shopify/react-native-skia'

function hashString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function PassportStampRenderer({ trips }: { trips: any[] }) {
  const font = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 14)
  const boldFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 24)

  const renderStamp = (trip: any, index: number) => {
    const hash = hashString(trip.id)
    const rotation = -15 + (hash % 30) // random rotation between -15 and 15
    const color = index % 2 === 0 ? '#1a365d' : '#741b47' // Navy or Burgundy
    
    // Circular path for top text
    const topPath = Skia.Path.Make()
    topPath.addArc({ x: 10, y: 10, width: 100, height: 100 }, 180, 180)

    // Circular path for bottom text
    const bottomPath = Skia.Path.Make()
    bottomPath.addArc({ x: 10, y: 10, width: 100, height: 100 }, 0, 180)

    const year = new Date(trip.start_date).getFullYear().toString()
    const dest = trip.destination ? trip.destination.toUpperCase() : 'UNKNOWN'

    return (
      <View key={trip.id} style={styles.stampWrapper}>
        <Canvas style={{ width: 120, height: 120 }}>
          <Group transform={[{ rotate: (rotation * Math.PI) / 180, origin: { x: 60, y: 60 } }]}>
            {/* Outer rings */}
            <Circle cx={60} cy={60} r={56} style="stroke" strokeWidth={3} color={color} />
            <Circle cx={60} cy={60} r={50} style="stroke" strokeWidth={1} color={color} />

            {font && (
              <>
                <TextPath path={topPath} font={font} text={dest.substring(0, 12)} color={color} />
                <TextPath path={bottomPath} font={font} text="ENTRY STAMP" color={color} />
              </>
            )}
            
            {boldFont && (
              <Path path={Skia.Path.Make()} /> // just keeping Skia syntax clean
            )}
            {boldFont && (
              <TextPath path={topPath} font={boldFont} text="" /> // stub
            )}
            {/* Direct text centering year */}
            {boldFont && (
              // @ts-ignore
              <TextPath path={Skia.Path.Make().moveTo(36, 68).lineTo(100, 68)} font={boldFont} text={year} color={color} />
            )}
          </Group>
        </Canvas>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.grid}>
        {trips.map((trip, index) => renderStamp(trip, index))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, backgroundColor: '#fcfbf4' }, // Cream/ivory passport page background
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 },
  stampWrapper: { width: 120, height: 120 }
})

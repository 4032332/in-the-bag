import React from 'react'
import { View, Button, StyleSheet, ActivityIndicator } from 'react-native'
import { Canvas, Rect, Text as SkiaText, useFont, useCanvasRef, SkiaView } from '@shopify/react-native-skia'

interface StatsCardCreatorProps {
  trip: any
  day?: any
  healthKitSteps?: number
  onSave: (ref: React.RefObject<SkiaView>) => void
  isSaving: boolean
}

export function StatsCardCreator({ trip, day, healthKitSteps, onSave, isSaving }: StatsCardCreatorProps) {
  const canvasRef = useCanvasRef()
  const titleFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 72)
  const numberFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 120)
  const labelFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 36)

  // Combine destinations if there are multiple. For now, trip.destination might be a string.
  // In a real app with multiple destinations, we'd join them.
  const destString = trip?.destination || 'Unknown'

  // Determine stats layout blocks dynamically
  const stats = [
    { value: '12', label: 'Events' },
    { value: destString, label: 'Destination' },
    { value: trip?.trip_participants?.length?.toString() || '1', label: 'Explorers' }
  ]
  if (healthKitSteps !== undefined) {
    stats.push({ value: healthKitSteps.toString(), label: 'Steps taken' })
  }

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        {/* Render at 1080x1080 natively, scale down for preview */}
        <Canvas ref={canvasRef} style={{ width: 1080, height: 1080, transform: [{ scale: 0.3 }] }}>
          <Rect x={0} y={0} width={1080} height={1080} color="#f06292" />
          
          {titleFont && (
            <SkiaText x={64} y={120} text="In the Bag" font={titleFont} color="white" />
          )}

          {numberFont && labelFont && stats.map((stat, i) => {
            const row = Math.floor(i / 2)
            const col = i % 2
            const x = 64 + col * 500
            const y = 350 + row * 300
            return (
              <React.Fragment key={i}>
                <SkiaText x={x} y={y} text={stat.value} font={numberFont} color="white" />
                <SkiaText x={x} y={y + 60} text={stat.label} font={labelFont} color="rgba(255,255,255,0.7)" />
              </React.Fragment>
            )
          })}
        </Canvas>
      </View>
      <View style={styles.actionRow}>
        {isSaving ? <ActivityIndicator /> : <Button title="Save to Camera Roll" onPress={() => onSave(canvasRef)} />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  previewContainer: { width: 324, height: 324, overflow: 'hidden', backgroundColor: '#ddd', marginBottom: 20 },
  actionRow: { marginTop: 10 }
})

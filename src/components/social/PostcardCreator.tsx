import React from 'react'
import { View, Button, StyleSheet, ActivityIndicator } from 'react-native'
import { Canvas, Rect, Image, useImage, LinearGradient, vec, Text as SkiaText, useFont, useCanvasRef, CanvasRef } from '@shopify/react-native-skia'

interface PostcardCreatorProps {
  trip: any
  day?: any
  onSave: (ref: React.RefObject<CanvasRef | null>) => void
  isSaving: boolean
}

export function PostcardCreator({ trip, day, onSave, isSaving }: PostcardCreatorProps) {
  const canvasRef = useCanvasRef()
  const font = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 48)
  const smallFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 24)
  
  const coverImage = useImage(trip?.cover_photo_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e')

  const title = day?.name || trip?.name || 'Trip'
  const dates = day ? day.date : `${trip?.start_date} to ${trip?.end_date}`
  const dest = trip?.destination || ''

  return (
    <View style={styles.container}>
      <View style={styles.previewContainer}>
        {/* Render at 1080x720 natively, but scale down for preview with View transform or style */}
        <Canvas ref={canvasRef} style={{ width: 1080, height: 720, transform: [{ scale: 0.3 }] }}>
          {coverImage && (
            <Image
              image={coverImage}
              fit="cover"
              x={0}
              y={0}
              width={1080}
              height={720}
            />
          )}

          {/* Scrim */}
          <Rect x={0} y={720 * 0.6} width={1080} height={720 * 0.4}>
            <LinearGradient
              start={vec(0, 720 * 0.6)}
              end={vec(0, 720)}
              colors={['transparent', 'rgba(0,0,0,0.8)']}
            />
          </Rect>

          {font && (
            <SkiaText
              x={64}
              y={600}
              text={title}
              font={font}
              color="white"
            />
          )}
          {smallFont && (
            <>
              <SkiaText
                x={64}
                y={640}
                text={dates}
                font={smallFont}
                color="#eee"
              />
              <SkiaText
                x={64}
                y={680}
                text={dest}
                font={smallFont}
                color="#ccc"
              />
              <SkiaText
                x={1080 - 200}
                y={680}
                text="In the Bag"
                font={smallFont}
                color="white"
              />
            </>
          )}
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
  previewContainer: { width: 324, height: 216, overflow: 'hidden', backgroundColor: '#ddd', marginBottom: 20 },
  actionRow: { marginTop: 10 }
})

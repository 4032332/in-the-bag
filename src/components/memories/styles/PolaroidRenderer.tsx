import React from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Canvas, Rect, Image, useImage, Text as SkiaText, useFont, Shadow, Group } from '@shopify/react-native-skia'

function hashString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function PolaroidRenderer({ trips }: { trips: any[] }) {
  const font = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 14)

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.pile}>
        {trips.map((item, index) => {
          const coverImage = useImage(item.cover_photo_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e')
          
          const hash = hashString(item.id)
          const rotation = -6 + (hash % 13) // -6 to +6 degrees
          const offsetX = -20 + (hash % 40)
          const offsetY = index * 100 // space them vertically to overlap
          
          return (
            <View key={item.id} style={[styles.cardWrapper, { top: offsetY, left: offsetX + 100 }]}>
              <Canvas style={{ width: 180, height: 220 }}>
                <Group transform={[{ rotate: (rotation * Math.PI) / 180 }, { translateX: 10 }, { translateY: 10 }]}>
                  <Rect x={0} y={0} width={160} height={200} color="#fff">
                    <Shadow dx={0} dy={2} blur={4} color="rgba(0,0,0,0.3)" />
                  </Rect>
                  
                  {coverImage && (
                    <Image
                      image={coverImage}
                      fit="cover"
                      x={12}
                      y={12}
                      width={136}
                      height={136}
                    />
                  )}

                  {font && (
                    <SkiaText
                      x={16}
                      y={176}
                      text={item.name.substring(0, 15)}
                      font={font}
                      color="#333"
                    />
                  )}
                </Group>
              </Canvas>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 240, minHeight: 400 },
  pile: { position: 'relative', width: '100%', height: '100%' },
  cardWrapper: { position: 'absolute' }
})

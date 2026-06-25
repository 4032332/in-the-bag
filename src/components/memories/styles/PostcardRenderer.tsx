import React from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Canvas, Rect, Image, useImage, LinearGradient, vec, Text as SkiaText, useFont, RoundedRect, Shadow } from '@shopify/react-native-skia'

export function PostcardRenderer({ trips }: { trips: any[] }) {
  // Use system font or a bundled handwriting font if available
  const font = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 20)
  const smallFont = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 14)

  const renderItem = ({ item }: { item: any }) => {
    const coverImage = useImage(item.cover_photo_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e')
    
    return (
      <View style={styles.cardContainer}>
        <Canvas style={{ width: 320, height: 200 }}>
          <RoundedRect x={0} y={0} width={320} height={200} r={8} color="#fff">
            <Shadow dx={0} dy={4} blur={8} color="rgba(0,0,0,0.2)" />
          </RoundedRect>
          
          {coverImage && (
            <Image
              image={coverImage}
              fit="cover"
              x={0}
              y={0}
              width={320}
              height={200}
            />
          )}

          {/* Scrim */}
          <Rect x={0} y={100} width={320} height={100}>
            <LinearGradient
              start={vec(0, 100)}
              end={vec(0, 200)}
              colors={['transparent', 'rgba(0,0,0,0.8)']}
            />
          </Rect>

          {font && (
            <SkiaText
              x={16}
              y={160}
              text={item.name}
              font={font}
              color="white"
            />
          )}
          {smallFont && (
            <SkiaText
              x={16}
              y={180}
              text={`${item.start_date} – ${item.end_date}`}
              font={smallFont}
              color="#ddd"
            />
          )}
        </Canvas>
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
  cardContainer: { width: 320, height: 200, marginRight: 16 }
})

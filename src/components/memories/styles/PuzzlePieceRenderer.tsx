import React, { useMemo } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { Canvas, Image, useImage, Text as SkiaText, useFont, Group } from '@shopify/react-native-skia'
import { getPieceGeometry, getPieceGridPosition, PIECE_SIZE, TAB_PROTRUSION, createPuzzlePath, getGridDimensions } from '../../../utils/puzzlePieceGeometry'

export function PuzzlePieceRenderer({ trips }: { trips: any[] }) {
  const font = useFont(require('../../../../assets/fonts/SpaceMono-Regular.ttf'), 14)
  const totalPieces = trips.length

  const { cols } = getGridDimensions(totalPieces)
  const rows = Math.ceil(totalPieces / cols)

  const effectivePieceSize = PIECE_SIZE
  const viewWidth = cols * effectivePieceSize + TAB_PROTRUSION * 2
  const viewHeight = rows * effectivePieceSize + TAB_PROTRUSION * 2

  return (
    <ScrollView horizontal contentContainerStyle={{ padding: 16 }}>
      <ScrollView contentContainerStyle={{ minHeight: viewHeight }}>
        <View style={{ width: viewWidth, height: viewHeight, position: 'relative' }}>
          {trips.map((trip, index) => {
            const geom = getPieceGeometry(index, totalPieces)
            const pos = getPieceGridPosition(index, totalPieces)
            const path = createPuzzlePath(geom, PIECE_SIZE)
            
            const coverImage = useImage(trip.cover_photo_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e')

            // Layout positioning
            const left = pos.col * effectivePieceSize
            const top = pos.row * effectivePieceSize
            
            const destName = trip.destination ? trip.destination.substring(0, 10).toUpperCase() : 'TRIP'

            return (
              <View key={trip.id} style={[styles.pieceWrapper, { left, top }]}>
                <Canvas style={{ width: PIECE_SIZE + TAB_PROTRUSION * 2, height: PIECE_SIZE + TAB_PROTRUSION * 2 }}>
                  <Group clip={path}>
                    {coverImage && (
                      <Image
                        image={coverImage}
                        fit="cover"
                        x={0}
                        y={0}
                        width={PIECE_SIZE + TAB_PROTRUSION * 2}
                        height={PIECE_SIZE + TAB_PROTRUSION * 2}
                      />
                    )}
                  </Group>
                  {font && (
                    <SkiaText
                      x={PIECE_SIZE / 2 - 20}
                      y={PIECE_SIZE / 2 + 10}
                      text={destName}
                      font={font}
                      color="#fff"
                    />
                  )}
                </Canvas>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pieceWrapper: { position: 'absolute', width: PIECE_SIZE + TAB_PROTRUSION * 2, height: PIECE_SIZE + TAB_PROTRUSION * 2 }
})

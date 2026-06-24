import React, { useRef, useState } from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, { runOnJS } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { TreasureMapLayout, TileLayout } from '../layoutTypes';
import { ParchmentBackground } from './ParchmentBackground';
import { TreasureMapTile } from './TreasureMapTile';
import { useTreasureMapGestures } from '../hooks/useTreasureMapGestures';
import { ZOOM_DEFAULT, ZOOM_MID_THRESHOLD } from '../constants/zoomLevels';
import { GestureDetector } from 'react-native-gesture-handler';

interface DayMeta {
  id: string;
  dayNumber: number;
  weekday: string;
  date: string;
  eventCount: number;
}

interface Props {
  layout: TreasureMapLayout;
  items: DayMeta[];            // ordered same as layout.tiles
  backgroundImageUrl: string | null;
  isCruise: boolean;
  onTileTap: (itemId: string) => void;
}

// Zoom tier type — three discrete states used for tile content switching.
type ZoomTier = 'full' | 'mid' | 'min';

function computeTier(s: number): ZoomTier {
  if (s >= ZOOM_DEFAULT) return 'full';
  if (s >= ZOOM_MID_THRESHOLD) return 'mid';
  return 'min';
}

export function TreasureMapCanvas({
  layout, items, backgroundImageUrl, isCruise, onTileTap,
}: Props) {
  const { composed, animatedStyle, scale } = useTreasureMapGestures();

  const currentTierRef = useRef<ZoomTier>(computeTier(ZOOM_DEFAULT));
  const [zoomTier, setZoomTier] = useState<ZoomTier>('full');

  // Fix C4: Use onChange on the pinch gesture to update the zoomTier reactively.
  // We can attach this to the composed gesture or intercept it from scale via useAnimatedReaction,
  // but the easiest way is to useAnimatedReaction on the scale value from useTreasureMapGestures.
  Animated.useAnimatedReaction(
    () => scale.value,
    (currentScale) => {
      const tier = computeTier(currentScale);
      if (tier !== currentTierRef.current) {
        currentTierRef.current = tier;
        runOnJS(setZoomTier)(tier);
      }
    },
    [scale]
  );

  // Build the dotted bezier path string from stored segments + anchor positions
  const pathString = buildPathString(layout);
  const path = Skia.Path.MakeFromSVGString(pathString) ?? Skia.Path.Make();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
        {/* GestureDetector wraps Animated.View — see screen component */}
        <Canvas style={{ width: layout.canvasWidth, height: layout.canvasHeight }}>
          <ParchmentBackground
            width={layout.canvasWidth}
            height={layout.canvasHeight}
            imageUrl={backgroundImageUrl}
            isCruise={isCruise}
          />
          {/* Dotted bezier path */}
          <Path
            path={path}
            color="#5c3a1e"
            style="stroke"
            strokeWidth={2}
            strokeJoin="round"
            strokeCap="round"
          />
          {/* Tiles */}
          {layout.tiles.map((tile, i) => {
            const meta = items[i];
            if (!meta) return null;
            return (
              <TreasureMapTile
                key={tile.id}
                tile={{
                  anchorX: tile.anchorX,
                  anchorY: tile.anchorY,
                  rotationDeg: tile.rotationDeg,
                  dayNumber: meta.dayNumber,
                  weekday: meta.weekday,
                  date: meta.date,
                  eventCount: meta.eventCount,
                }}
                zoomTier={zoomTier}  // Fix C4: reactive tier from JS state, not scale.value
              />
            );
          })}
        </Canvas>
      </Animated.View>
    </View>
  );
}

/**
 * Build an SVG path string from the stored anchor positions and bezier segments.
 * M to first anchor, then C commands for each subsequent segment.
 */
function buildPathString(layout: TreasureMapLayout): string {
  const { tiles, pathSegments } = layout;
  if (tiles.length === 0) return '';
  let d = `M ${tiles[0].anchorX} ${tiles[0].anchorY}`;
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    const next = tiles[i + 1];
    d += ` C ${seg.cp1x} ${seg.cp1y}, ${seg.cp2x} ${seg.cp2y}, ${next.anchorX} ${next.anchorY}`;
  }
  return d;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#f5e9c8' },
  canvasWrapper: { position: 'absolute' },
});

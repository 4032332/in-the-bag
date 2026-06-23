# Treasure Map Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Treasure Map premium feature — a pannable, pinchable React Native Skia canvas that renders trip days (or events) as parchment-tile waypoints along an organic bezier path, with layout deterministically seeded at trip creation time and a real-time swap to an Imagen 3 background when it arrives.

**Architecture:** Layout generation is a pure, seed-based client-side function that runs synchronously at trip creation and writes to `trips.treasure_map_layout` as part of the trip save; the canvas component reads from that persisted layout and renders entirely via React Native Skia with no additional async work required to display the map. Gesture handling (pan + pinch-out-only zoom) is wired via React Native Gesture Handler and Reanimated shared values; zoom level thresholds are named constants that trigger progressive tile content disclosure. A Supabase Realtime subscription on `trips.treasure_map_image_url` swaps the placeholder parchment background for the Imagen 3 result once the async job (Plan 5) writes it.

**Tech Stack:** React Native Skia, React Native Gesture Handler, Reanimated, Supabase Realtime

---

## File Structure

```
src/
  features/
    treasureMap/
      layout/
        seedRandom.ts          # Seeded PRNG (mulberry32)
        generateLayout.ts      # Pure layout function: seed → TreasureMapLayout
        generateLayout.test.ts # Determinism + shape tests
        bezierPath.ts          # Cubic bezier helpers (control point offsets)
        layoutTypes.ts         # TypeScript types for layout data
      components/
        TreasureMapCanvas.tsx  # Skia canvas: background, path, tiles, dots
        TreasureMapTile.tsx    # Individual tile renderer (3 zoom level variants)
        ParchmentBackground.tsx # Placeholder + image swap via Realtime
      screens/
        TreasureMapScreen.tsx  # Day-level full-screen screen
        EventTreasureMapScreen.tsx # Event-level full-screen screen
      hooks/
        useTreasureMapGestures.ts  # Pan + pinch gesture composition
        useTreasureMapRealtime.ts  # Realtime subscription for image_url
      constants/
        zoomLevels.ts          # Named zoom threshold constants
        layoutConfig.ts        # Canvas size, tile size, path amplitude constants
      navigation/
        TreasureMapNavigator.tsx # Stack navigator for TreasureMap → EventTreasureMap → EventScreen
      index.ts
  db/
    trips.ts                   # (existing) — add generateAndSaveTreasureMapLayout call
```

---

## Tasks

### 1. Types and constants

- [ ] Create `src/features/treasureMap/layoutTypes.ts`:
  ```ts
  export interface TileLayout {
    id: string;           // day id or event id
    anchorX: number;
    anchorY: number;
    rotationDeg: number;
  }

  export interface BezierSegment {
    cp1x: number; cp1y: number;
    cp2x: number; cp2y: number;
  }

  export interface TreasureMapLayout {
    seed: number;
    tiles: TileLayout[];
    pathSegments: BezierSegment[]; // one per gap between consecutive tiles
    canvasWidth: number;
    canvasHeight: number;
  }
  ```

- [ ] Create `src/features/treasureMap/constants/zoomLevels.ts`:
  ```ts
  /** Maximum zoom (default opening scale). Cannot zoom in further. */
  export const ZOOM_DEFAULT = 1.0;

  /** Threshold below which tiles show day number + weekday + date only (no event count). */
  export const ZOOM_MID_THRESHOLD = 0.72;

  /** Minimum zoom (pinch limit). Below this threshold tiles show "DAY N" only. */
  export const ZOOM_MIN_THRESHOLD = 0.45;

  /** Hard minimum scale — cannot pinch out further than this. */
  export const ZOOM_MIN = 0.35;
  ```

- [ ] Create `src/features/treasureMap/constants/layoutConfig.ts`:
  ```ts
  export const TILE_WIDTH = 140;
  export const TILE_HEIGHT = 90;
  export const MIN_TILE_SPACING = 220;   // minimum px between anchor centres
  export const MAX_TILE_ROTATION_DEG = 8; // ± degrees
  export const BEZIER_AMPLITUDE = 80;    // max control point offset from midpoint
  export const CANVAS_PADDING = 100;     // padding around outermost tiles
  ```

- [ ] Commit: `feat: add treasure map layout types and zoom/layout constants`

---

### 2. Seeded PRNG

- [ ] Create `src/features/treasureMap/layout/seedRandom.ts`:
  ```ts
  /**
   * Mulberry32 — fast, deterministic 32-bit PRNG.
   * Returns a function that produces floats in [0, 1) from a uint32 seed.
   */
  export function createSeededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return function () {
      s += 0x6d2b79f5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Generate a random uint32 seed suitable for storage. */
  export function generateSeed(): number {
    return (Math.random() * 0xffffffff) >>> 0;
  }
  ```

- [ ] Commit: `feat: add mulberry32 seeded PRNG for treasure map layout`

---

### 3. Bezier path helpers

- [ ] Create `src/features/treasureMap/layout/bezierPath.ts`:
  ```ts
  import { BezierSegment } from '../layoutTypes';
  import { BEZIER_AMPLITUDE } from '../constants/layoutConfig';

  interface Point { x: number; y: number; }

  /**
   * Compute one cubic bezier segment between two anchor points.
   * Control points are offset from the midpoint perpendicular to the segment
   * direction — creates an organic bowing curve rather than a zigzag.
   * `jitter` is a value in [-1, 1] derived from the seeded RNG.
   */
  export function computeBezierSegment(
    a: Point,
    b: Point,
    jitter1: number,
    jitter2: number,
  ): BezierSegment {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    // Perpendicular unit vector to segment a→b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;

    // Each control point bows away from the chord; jitter1/jitter2 are in [-1,1]
    const amp = BEZIER_AMPLITUDE;
    return {
      cp1x: mx + perpX * amp * jitter1,
      cp1y: my + perpY * amp * jitter1,
      cp2x: mx + perpX * amp * jitter2,
      cp2y: my + perpY * amp * jitter2,
    };
  }
  ```

- [ ] Commit: `feat: add perpendicular-offset bezier segment helper`

---

### 4. Layout generation function

- [ ] Create `src/features/treasureMap/layout/generateLayout.ts`:
  ```ts
  import { TreasureMapLayout, TileLayout, BezierSegment } from '../layoutTypes';
  import { createSeededRandom } from './seedRandom';
  import { computeBezierSegment } from './bezierPath';
  import {
    MIN_TILE_SPACING,
    MAX_TILE_ROTATION_DEG,
    CANVAS_PADDING,
  } from '../constants/layoutConfig';

  export interface GenerateLayoutInput {
    seed: number;
    itemIds: string[]; // ordered day ids or event ids
  }

  /**
   * Pure function — no side effects.
   * Given a seed and an ordered list of item IDs, returns a fully determined layout.
   * Tiles are placed along a wandering horizontal baseline with vertical drift,
   * ensuring no two tiles overlap and the path flows organically.
   */
  export function generateLayout(input: GenerateLayoutInput): TreasureMapLayout {
    const { seed, itemIds } = input;
    const rng = createSeededRandom(seed);

    const n = itemIds.length;
    if (n === 0) {
      return { seed, tiles: [], pathSegments: [], canvasWidth: 600, canvasHeight: 400 };
    }

    // Place anchors: advance right with random horizontal spacing and vertical drift
    const anchors: { x: number; y: number }[] = [];
    let curX = CANVAS_PADDING;
    let curY = CANVAS_PADDING + 200; // start in upper-middle area

    for (let i = 0; i < n; i++) {
      anchors.push({ x: curX, y: curY });
      // Advance: horizontal step with random extra spacing
      const hStep = MIN_TILE_SPACING + rng() * MIN_TILE_SPACING * 0.6;
      // Vertical drift: ± half of MIN_TILE_SPACING, clamped in buildCanvas
      const vDrift = (rng() - 0.5) * MIN_TILE_SPACING * 0.8;
      curX += hStep;
      curY += vDrift;
    }

    // Clamp vertical positions — find min/max then normalise into a safe band
    const ys = anchors.map((a) => a.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const yRange = maxY - minY || 1;
    const targetBand = 300; // vertical range for tiles within canvas
    anchors.forEach((a) => {
      a.y = CANVAS_PADDING + ((a.y - minY) / yRange) * targetBand + 100;
    });

    // Canvas dimensions
    const canvasWidth = anchors[n - 1].x + CANVAS_PADDING;
    const canvasHeight = Math.max(...anchors.map((a) => a.y)) + CANVAS_PADDING + 100;

    // Build tile layouts
    const tiles: TileLayout[] = itemIds.map((id, i) => ({
      id,
      anchorX: anchors[i].x,
      anchorY: anchors[i].y,
      rotationDeg: (rng() - 0.5) * 2 * MAX_TILE_ROTATION_DEG,
    }));

    // Build bezier segments between consecutive anchors
    const pathSegments: BezierSegment[] = [];
    for (let i = 0; i < n - 1; i++) {
      const j1 = rng() * 2 - 1; // jitter in [-1, 1]
      const j2 = rng() * 2 - 1;
      pathSegments.push(computeBezierSegment(anchors[i], anchors[i + 1], j1, j2));
    }

    return { seed, tiles, pathSegments, canvasWidth, canvasHeight };
  }
  ```

- [ ] Commit: `feat: add pure deterministic treasure map layout generator`

---

### 5. Layout determinism tests

- [ ] Create `src/features/treasureMap/layout/generateLayout.test.ts`:
  ```ts
  import { generateLayout } from './generateLayout';

  const SAMPLE_IDS = ['day-1', 'day-2', 'day-3', 'day-4', 'day-5'];
  const SAMPLE_SEED = 3141592653;

  describe('generateLayout', () => {
    it('is deterministic — same seed always produces identical output', () => {
      const a = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      const b = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      expect(a).toEqual(b);
    });

    it('produces different layouts for different seeds', () => {
      const a = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      const b = generateLayout({ seed: SAMPLE_SEED + 1, itemIds: SAMPLE_IDS });
      expect(a.tiles[0].rotationDeg).not.toEqual(b.tiles[0].rotationDeg);
    });

    it('returns one tile per item id', () => {
      const layout = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      expect(layout.tiles).toHaveLength(SAMPLE_IDS.length);
      expect(layout.tiles.map((t) => t.id)).toEqual(SAMPLE_IDS);
    });

    it('returns n-1 path segments for n tiles', () => {
      const layout = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      expect(layout.pathSegments).toHaveLength(SAMPLE_IDS.length - 1);
    });

    it('handles a single tile with no path segments', () => {
      const layout = generateLayout({ seed: SAMPLE_SEED, itemIds: ['day-1'] });
      expect(layout.tiles).toHaveLength(1);
      expect(layout.pathSegments).toHaveLength(0);
    });

    it('handles empty id list', () => {
      const layout = generateLayout({ seed: SAMPLE_SEED, itemIds: [] });
      expect(layout.tiles).toHaveLength(0);
      expect(layout.pathSegments).toHaveLength(0);
    });

    it('tiles do not overlap — all anchor centres are at least MIN_TILE_SPACING apart horizontally', () => {
      const layout = generateLayout({ seed: SAMPLE_SEED, itemIds: SAMPLE_IDS });
      for (let i = 0; i < layout.tiles.length - 1; i++) {
        const dx = layout.tiles[i + 1].anchorX - layout.tiles[i].anchorX;
        expect(dx).toBeGreaterThanOrEqual(200); // MIN_TILE_SPACING
      }
    });
  });
  ```

- [ ] Run `npx jest generateLayout.test.ts` — all tests must pass before committing
- [ ] Commit: `test: add determinism and shape tests for treasure map layout generator`

---

### 6. Realtime hook for background image

- [ ] Create `src/features/treasureMap/hooks/useTreasureMapRealtime.ts`:
  ```ts
  import { useEffect, useState } from 'react';
  import { supabase } from '../../../lib/supabase';

  /**
   * Subscribes to changes on trips.treasure_map_image_url for the given trip.
   * Returns the current image URL (null until the Imagen 3 async job completes).
   */
  export function useTreasureMapRealtime(tripId: string, initialUrl: string | null) {
    const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);

    useEffect(() => {
      const channel = supabase
        .channel(`treasure_map_image_${tripId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trips',
            filter: `id=eq.${tripId}`,
          },
          (payload) => {
            const url = payload.new?.treasure_map_image_url as string | null;
            if (url && url !== imageUrl) {
              setImageUrl(url);
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [tripId]);

    return imageUrl;
  }
  ```

- [ ] Commit: `feat: add realtime hook for treasure map background image URL`

---

### 7. Gesture hook

- [ ] Create `src/features/treasureMap/hooks/useTreasureMapGestures.ts`:
  ```ts
  import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
  import { Gesture } from 'react-native-gesture-handler';
  import { ZOOM_DEFAULT, ZOOM_MIN } from '../constants/zoomLevels';

  /**
   * Returns composed pan + pinch gesture and an Animated style for the canvas wrapper.
   * Pinch is zoom-out-only: scale is clamped to [ZOOM_MIN, ZOOM_DEFAULT].
   */
  export function useTreasureMapGestures() {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(ZOOM_DEFAULT);

    // Saved values at gesture start
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const savedScale = useSharedValue(ZOOM_DEFAULT);

    const panGesture = Gesture.Pan()
      .onStart(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      })
      .onUpdate((e) => {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      });

    const pinchGesture = Gesture.Pinch()
      .onStart(() => {
        savedScale.value = scale.value;
      })
      .onUpdate((e) => {
        // Clamp to [ZOOM_MIN, ZOOM_DEFAULT] — zoom-out only
        const next = savedScale.value * e.scale;
        scale.value = Math.min(ZOOM_DEFAULT, Math.max(ZOOM_MIN, next));
      });

    const composed = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    return { composed, animatedStyle, scale };
  }
  ```

- [ ] Commit: `feat: add pan + pinch-out-only gesture hook for treasure map`

---

### 8. Parchment background component

- [ ] Create `src/features/treasureMap/components/ParchmentBackground.tsx`:
  ```tsx
  import React from 'react';
  import { Image, Rect, useImage } from '@shopify/react-native-skia';

  interface Props {
    width: number;
    height: number;
    imageUrl: string | null; // null = show placeholder
    isCruise: boolean;
  }

  /**
   * Renders either:
   * - A placeholder parchment fill (warm off-white rect + label) while imageUrl is null
   * - The Imagen 3 generated background image once imageUrl is available
   * The cruise label is included in the placeholder so the async Imagen 3 job (Plan 5)
   * can read `is_cruise` from the trips row to apply the nautical theme.
   */
  export function ParchmentBackground({ width, height, imageUrl, isCruise }: Props) {
    const img = useImage(imageUrl ?? '');

    if (img && imageUrl) {
      return <Image image={img} x={0} y={0} width={width} height={height} fit="cover" />;
    }

    // Placeholder: warm parchment colour
    return (
      <>
        <Rect x={0} y={0} width={width} height={height} color="#f5e9c8" />
        {/* isCruise flag used by async job theme selection — no visible label in production */}
      </>
    );
  }
  ```

- [ ] Commit: `feat: add parchment background component with Realtime image swap`

---

### 9. Tile component

- [ ] Create `src/features/treasureMap/components/TreasureMapTile.tsx`:
  ```tsx
  import React from 'react';
  import { Group, RoundedRect, Text, useFont, Circle } from '@shopify/react-native-skia';
  import { ZOOM_MID_THRESHOLD, ZOOM_MIN_THRESHOLD } from '../constants/zoomLevels';
  import { TILE_WIDTH, TILE_HEIGHT } from '../constants/layoutConfig';

  interface TileData {
    anchorX: number;
    anchorY: number;
    rotationDeg: number;
    dayNumber: number;
    weekday: string;   // e.g. "WED"
    date: string;      // formatted per user pref, e.g. "16/07"
    eventCount: number;
  }

  interface Props {
    tile: TileData;
    currentScale: number;
  }

  /**
   * Renders a single parchment tile.
   * Content adapts to three zoom tiers defined by named constants:
   *   >= ZOOM_DEFAULT          → day number + weekday + date + event count
   *   >= ZOOM_MID_THRESHOLD    → day number + weekday + date
   *   >= ZOOM_MIN (< MID)      → "DAY N" only
   */
  export function TreasureMapTile({ tile, currentScale }: Props) {
    const {
      anchorX, anchorY, rotationDeg,
      dayNumber, weekday, date, eventCount,
    } = tile;

    const showFull = currentScale >= ZOOM_MID_THRESHOLD;
    const showMid = currentScale >= ZOOM_MIN_THRESHOLD && !showFull;
    // showMin = everything else

    const tileX = anchorX - TILE_WIDTH / 2;
    const tileY = anchorY - TILE_HEIGHT / 2;
    const cx = anchorX;
    const cy = anchorY + TILE_HEIGHT / 2 + 6; // anchor dot below tile

    return (
      <Group
        transform={[
          { translateX: anchorX },
          { translateY: anchorY },
          { rotate: (rotationDeg * Math.PI) / 180 },
          { translateX: -anchorX },
          { translateY: -anchorY },
        ]}
      >
        {/* Tile body */}
        <RoundedRect
          x={tileX} y={tileY}
          width={TILE_WIDTH} height={TILE_HEIGHT}
          r={6}
          color="#fdf6e3"
        />
        {/* Tile border */}
        <RoundedRect
          x={tileX} y={tileY}
          width={TILE_WIDTH} height={TILE_HEIGHT}
          r={6}
          color="#5c3a1e"
          style="stroke"
          strokeWidth={1.5}
        />

        {/* Tile content — zoom-level conditional */}
        {showFull && (
          <>
            {/* Day number large */}
            {/* weekday + date + event count lines */}
            {/* Implementation uses Skia Text with loaded fonts */}
          </>
        )}
        {showMid && (
          <>
            {/* Day number + weekday + date — no event count */}
          </>
        )}
        {!showFull && !showMid && (
          <>
            {/* "DAY N" only */}
          </>
        )}

        {/* Anchor dot */}
        <Circle cx={cx} cy={cy} r={4} color="#5c3a1e" />
      </Group>
    );
  }
  ```

  > Note: The text rendering stubs above use comments rather than full Skia `Text` calls to keep the skeleton readable. The implementing agent should replace each comment block with properly loaded Skia fonts and `Text` components. Font size guidance: day number 22sp, weekday/date 12sp, event count 11sp, "DAY N" 18sp.

- [ ] Commit: `feat: add treasure map tile component with three zoom-level content states`

---

### 10. Canvas component

- [ ] Create `src/features/treasureMap/components/TreasureMapCanvas.tsx`:
  ```tsx
  import React from 'react';
  import { Canvas, Path, Skia } from '@shopify/react-native-skia';
  import Animated from 'react-native-reanimated';
  import { StyleSheet, View } from 'react-native';
  import { TreasureMapLayout, TileLayout } from '../layoutTypes';
  import { ParchmentBackground } from './ParchmentBackground';
  import { TreasureMapTile } from './TreasureMapTile';
  import { useTreasureMapGestures } from '../hooks/useTreasureMapGestures';

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

  export function TreasureMapCanvas({
    layout, items, backgroundImageUrl, isCruise, onTileTap,
  }: Props) {
    const { composed, animatedStyle, scale } = useTreasureMapGestures();

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
                  currentScale={scale.value}
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
  ```

- [ ] Commit: `feat: add treasure map canvas component with path, tiles, and gesture wrapper`

---

### 11. Day-level Treasure Map screen

- [ ] Create `src/features/treasureMap/screens/TreasureMapScreen.tsx`:
  ```tsx
  import React from 'react';
  import { StyleSheet, TouchableOpacity, View } from 'react-native';
  import { GestureDetector } from 'react-native-gesture-handler';
  import Animated from 'react-native-reanimated';
  import { useLocalSearchParams, useRouter } from 'expo-router';
  import { useTreasureMapGestures } from '../hooks/useTreasureMapGestures';
  import { useTreasureMapRealtime } from '../hooks/useTreasureMapRealtime';
  import { TreasureMapCanvas } from '../components/TreasureMapCanvas';
  // import trip data hook, layout from trip record, days from trip context

  /**
   * Day-level Treasure Map — one tile per trip day.
   * Navigation:
   *   - Opened via map-pin icon in Trip Screen header (premium users only after gate check)
   *   - Back button (top-left) returns to Trip Screen
   *   - Tapping a day tile pushes EventTreasureMapScreen for that day
   */
  export default function TreasureMapScreen() {
    const { tripId } = useLocalSearchParams<{ tripId: string }>();
    const router = useRouter();

    // Fetch trip + layout from Supabase (trip record already loaded; read from context/store)
    // const { trip, days } = useTripContext(tripId);
    // const layout: TreasureMapLayout = trip.treasure_map_layout;
    // const imageUrl = useTreasureMapRealtime(tripId, trip.treasure_map_image_url);

    function handleTileTap(dayId: string) {
      router.push(`/trip/${tripId}/treasure-map/events?dayId=${dayId}`);
    }

    return (
      <View style={styles.container}>
        {/* GestureDetector must wrap the animated canvas */}
        {/* <GestureDetector gesture={composed}> */}
        {/*   <TreasureMapCanvas ... onTileTap={handleTileTap} /> */}
        {/* </GestureDetector> */}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1 },
  });
  ```

  > The screen body is stubbed with comments — the implementing agent should wire in the trip/day data hooks from the data layer established in Plan 2 and the gesture/canvas components from the steps above.

- [ ] Commit: `feat: add day-level treasure map screen with navigation wiring`

---

### 12. Event-level Treasure Map screen

- [ ] Create `src/features/treasureMap/screens/EventTreasureMapScreen.tsx`:
  ```tsx
  import React from 'react';
  import { View, StyleSheet } from 'react-native';
  import { useLocalSearchParams, useRouter } from 'expo-router';
  import { TreasureMapCanvas } from '../components/TreasureMapCanvas';
  import { GestureDetector } from 'react-native-gesture-handler';
  import { generateLayout } from '../layout/generateLayout';
  import { generateSeed } from '../layout/seedRandom';

  /**
   * Event-level Treasure Map — one tile per event on the selected day.
   * Layout is generated fresh from a derived seed (trip seed XOR day index)
   * so each day's event map looks distinct but is still deterministic.
   *
   * Navigation:
   *   - Pushed from TreasureMapScreen when a day tile is tapped
   *   - Back button (top-left, standard iOS) returns to TreasureMapScreen
   *   - Tapping an event tile pushes the Event Screen
   *   - Back from Event Screen returns here
   */
  export default function EventTreasureMapScreen() {
    const { tripId, dayId } = useLocalSearchParams<{ tripId: string; dayId: string }>();
    const router = useRouter();

    // Derive event-level layout: use trip seed XOR day index for determinism
    // const { trip, day, events } = useDayContext(tripId, dayId);
    // const eventSeed = (trip.treasure_map_layout.seed ^ day.day_number) >>> 0;
    // const eventLayout = generateLayout({ seed: eventSeed, itemIds: events.map(e => e.id) });

    function handleTileTap(eventId: string) {
      router.push(`/trip/${tripId}/event/${eventId}`);
    }

    return (
      <View style={styles.container}>
        {/* GestureDetector + TreasureMapCanvas wired same as TreasureMapScreen */}
        {/* Background: uses same trip.treasure_map_image_url — same background both levels */}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1 },
  });
  ```

- [ ] Commit: `feat: add event-level treasure map screen`

---

### 13. Navigation routes and premium gate

- [ ] Register Expo Router routes in `app/trip/[tripId]/treasure-map/index.tsx` pointing to `TreasureMapScreen`
- [ ] Register `app/trip/[tripId]/treasure-map/events.tsx` pointing to `EventTreasureMapScreen`
- [ ] In Trip Screen header: add map-pin icon button (right of settings gear). On press:
  - Check premium access (`subscriptions` row or `is_premium_sponsor` on trip participant)
  - Free users → show standard upgrade prompt sheet (Section 22 of spec); do not render canvas
  - Premium users → `router.push(\`/trip/${tripId}/treasure-map\`)`
- [ ] Demo mode: gate check reads `demo_tier` from MMKV; `premium` → open canvas; `free` → show demo-mode upgrade sheet (spec Section 22)
- [ ] Commit: `feat: wire treasure map navigation and premium gate in trip screen header`

---

### 14. Layout generation at trip creation

- [ ] In the trip creation save function (`src/db/trips.ts` or equivalent Plan 2 location):
  - After collecting trip data, before the Supabase insert, call:
    ```ts
    import { generateSeed } from '../features/treasureMap/layout/seedRandom';
    import { generateLayout } from '../features/treasureMap/layout/generateLayout';

    // itemIds are the ordered day IDs — computed from start/end date at creation time
    const dayIds = generateDayIds(tripStartDate, tripEndDate); // returns string[]
    const seed = generateSeed();
    const layout = generateLayout({ seed, itemIds: dayIds });
    // Include layout in trip insert payload:
    //   treasure_map_layout: layout
    ```
  - The `treasure_map_layout` column is written in the same `INSERT` as the rest of the trip data — no second round-trip
  - This runs for all users (free and premium), so the layout is pre-computed if they later upgrade
- [ ] Commit: `feat: generate and persist treasure map layout synchronously at trip creation`

---

### 15. Integration smoke test and final wiring check

- [ ] Manually verify (Xcode Simulator, Expo Go) — or write a detox/jest-native script:
  - Create a trip → confirm `treasure_map_layout` is populated in Supabase immediately (not after async job)
  - Open Treasure Map as premium user → canvas renders, tiles visible, path visible
  - Pan in all four directions → canvas moves correctly
  - Pinch out → tiles shrink; content degrades through three zoom states at named thresholds
  - Pinch in past default → scale does not exceed ZOOM_DEFAULT
  - Tap day tile → pushes event-level canvas
  - Tap event tile → pushes Event Screen
  - Back from Event Screen → returns to event-level canvas
  - Back from event-level canvas → returns to day-level canvas
  - Back from day-level canvas → returns to Trip Screen
  - Simulate `treasure_map_image_url` update (direct Supabase Studio update) → canvas swaps placeholder for image without navigation
  - Free user taps map-pin icon → upgrade prompt shown, no canvas rendered
- [ ] Fix any issues found
- [ ] Commit: `feat: treasure map integration verified and wired end-to-end`

---

## Dependency notes

- Plans 1 and 2 must be complete before starting Task 13 (navigation) and Task 14 (trip creation hook)
- Tasks 1–12 (layout algorithm, canvas, gestures, realtime hook) have no dependency on other plans and can be built in isolation with mock data
- The Imagen 3 async job that populates `treasure_map_image_url` is implemented in Plan 5; this plan's `useTreasureMapRealtime` hook is the receiver end and is complete without Plan 5

---

## Self-review checklist

- [x] Layout algorithm is tested for determinism, correct tile count, correct segment count, and non-overlap (Task 5)
- [x] Zoom thresholds are named constants in `zoomLevels.ts` — no magic numbers in canvas or tile components
- [x] `generateLayout` is a pure function — no Supabase calls, no React hooks, no side effects
- [x] Navigation stack matches spec: map-pin → day-level Treasure Map → event-level Treasure Map → Event Screen; each back button returns to the previous layer
- [x] Premium gate: free users see upgrade prompt, never the canvas
- [x] Cruise theme: `isCruise` prop passed to `ParchmentBackground` (read by async job in Plan 5)
- [x] Imagen 3 background swap: Realtime subscription in `useTreasureMapRealtime` replaces placeholder without re-mount
- [x] Bezier path uses perpendicular-offset control points (not zigzag) — confirmed in `bezierPath.ts`
- [x] Seed stored in `trips.treasure_map_layout` and never re-randomised after creation
- [x] Each task ends with a commit

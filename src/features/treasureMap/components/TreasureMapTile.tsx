import React from 'react';
import { Group, RoundedRect, Text, Circle, matchFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { ZOOM_MID_THRESHOLD, ZOOM_MIN_THRESHOLD, ZOOM_DEFAULT } from '../constants/zoomLevels';
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
  zoomTier: 'full' | 'mid' | 'min';
}

const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

export function TreasureMapTile({ tile, zoomTier }: Props) {
  const {
    anchorX, anchorY, rotationDeg,
    dayNumber, weekday, date, eventCount,
  } = tile;

  // showFull: full content including event count
  const showFull = zoomTier === 'full';
  // showMid: day number + weekday + date only
  const showMid = zoomTier === 'mid';

  const tileX = anchorX - TILE_WIDTH / 2;
  const tileY = anchorY - TILE_HEIGHT / 2;
  const cx = anchorX;
  const cy = anchorY + TILE_HEIGHT / 2 + 6; // anchor dot below tile

  // Fonts
  const dayFont = matchFont({ fontFamily, fontSize: 22, fontWeight: 'bold' });
  const subFont = matchFont({ fontFamily, fontSize: 12 });
  const eventFont = matchFont({ fontFamily, fontSize: 11 });
  const minFont = matchFont({ fontFamily, fontSize: 18, fontWeight: 'bold' });

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
          <Text x={tileX + 16} y={tileY + 36} text={`Day ${dayNumber}`} font={dayFont} color="#5c3a1e" />
          <Text x={tileX + 16} y={tileY + 56} text={`${weekday} ${date}`} font={subFont} color="#885b3b" />
          <Text x={tileX + 16} y={tileY + 74} text={`${eventCount} Events`} font={eventFont} color="#885b3b" />
        </>
      )}
      {showMid && (
        <>
          <Text x={tileX + 16} y={tileY + 42} text={`Day ${dayNumber}`} font={dayFont} color="#5c3a1e" />
          <Text x={tileX + 16} y={tileY + 66} text={`${weekday} ${date}`} font={subFont} color="#885b3b" />
        </>
      )}
      {!showFull && !showMid && (
        <>
          {/* "DAY N" only */}
          <Text x={tileX + 32} y={tileY + 52} text={`DAY ${dayNumber}`} font={minFont} color="#5c3a1e" />
        </>
      )}

      {/* Anchor dot */}
      <Circle cx={cx} cy={cy} r={4} color="#5c3a1e" />
    </Group>
  );
}

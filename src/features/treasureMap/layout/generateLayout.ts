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

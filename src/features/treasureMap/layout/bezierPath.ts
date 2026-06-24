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

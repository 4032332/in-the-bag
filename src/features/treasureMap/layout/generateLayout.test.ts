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

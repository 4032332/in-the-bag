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

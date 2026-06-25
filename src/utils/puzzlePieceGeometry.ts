import { Skia } from '@shopify/react-native-skia'

export type EdgeType = 'tab' | 'slot' | 'flat'

export interface PieceGeometry {
  top: EdgeType
  right: EdgeType
  bottom: EdgeType
  left: EdgeType
}

export const TAB_PROTRUSION = 10
export const TAB_WIDTH_RATIO = 0.3
export const PIECE_SIZE = 120

export function getGridDimensions(totalPieces: number) {
  if (totalPieces <= 4) return { cols: 2 }
  if (totalPieces <= 9) return { cols: 3 }
  return { cols: 4 }
}

export function getPieceGeometry(index: number, totalPieces: number): PieceGeometry {
  const { cols } = getGridDimensions(totalPieces)
  const rows = Math.ceil(totalPieces / cols)
  const col = index % cols
  const row = Math.floor(index / cols)

  const top: EdgeType = row === 0 ? 'flat' : 'slot' // the piece above has a tab on bottom
  const left: EdgeType = col === 0 ? 'flat' : 'slot' // the piece to left has a tab on right
  const right: EdgeType = col === cols - 1 ? 'flat' : 'tab'
  const bottom: EdgeType = row === rows - 1 ? 'flat' : 'tab'

  return { top, right, bottom, left }
}

export function getPieceGridPosition(index: number, totalPieces: number) {
  const { cols } = getGridDimensions(totalPieces)
  return {
    col: index % cols,
    row: Math.floor(index / cols)
  }
}

export function createPuzzlePath(geom: PieceGeometry, size: number) {
  const path = Skia.Path.Make()
  const offset = TAB_PROTRUSION
  
  // Starting point top-left (offset to allow tab room)
  path.moveTo(offset, offset)

  // Top edge
  if (geom.top === 'flat') {
    path.lineTo(size + offset, offset)
  } else { // slot
    path.lineTo(offset + size * 0.3, offset)
    path.cubicTo(
      offset + size * 0.3, offset + TAB_PROTRUSION * 2,
      offset + size * 0.7, offset + TAB_PROTRUSION * 2,
      offset + size * 0.7, offset
    )
    path.lineTo(size + offset, offset)
  }

  // Right edge
  if (geom.right === 'flat') {
    path.lineTo(size + offset, size + offset)
  } else { // tab
    path.lineTo(size + offset, offset + size * 0.3)
    path.cubicTo(
      size + offset + TAB_PROTRUSION * 2, offset + size * 0.3,
      size + offset + TAB_PROTRUSION * 2, offset + size * 0.7,
      size + offset, offset + size * 0.7
    )
    path.lineTo(size + offset, size + offset)
  }

  // Bottom edge
  if (geom.bottom === 'flat') {
    path.lineTo(offset, size + offset)
  } else { // tab
    path.lineTo(offset + size * 0.7, size + offset)
    path.cubicTo(
      offset + size * 0.7, size + offset + TAB_PROTRUSION * 2,
      offset + size * 0.3, size + offset + TAB_PROTRUSION * 2,
      offset + size * 0.3, size + offset
    )
    path.lineTo(offset, size + offset)
  }

  // Left edge
  if (geom.left === 'flat') {
    path.lineTo(offset, offset)
  } else { // slot
    path.lineTo(offset, offset + size * 0.7)
    path.cubicTo(
      offset + TAB_PROTRUSION * 2, offset + size * 0.7,
      offset + TAB_PROTRUSION * 2, offset + size * 0.3,
      offset, offset + size * 0.3
    )
    path.lineTo(offset, offset)
  }

  path.close()
  return path
}

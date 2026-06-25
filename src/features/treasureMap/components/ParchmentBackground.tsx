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
  // Fix M2: pass imageUrl directly (not `?? ''`). Skia's useImage accepts null/undefined
  // and returns null — passing an empty string causes a spurious network request.
  const img = useImage(imageUrl);

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

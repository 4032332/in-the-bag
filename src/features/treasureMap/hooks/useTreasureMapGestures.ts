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

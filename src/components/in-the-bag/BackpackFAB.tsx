// src/components/in-the-bag/BackpackFAB.tsx
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useSparkleOnFirstAppearance } from '@/hooks/useInTheBagSession';

interface BackpackFABProps {
  onPress: () => void;
  /** Absolute position overrides — caller sets bottom/right/top/left as needed. */
  position: { bottom?: number; right?: number; top?: number; left?: number };
  style?: ViewStyle;
  testID?: string;
}

/**
 * Floating backpack icon button.
 *
 * Screen-specific positioning (per spec Section 16):
 *   - Trip Summary tab:   bottom={100} right={20}  (above tab bar, bottom-right)
 *   - Day tab:            bottom={100} right={20}
 *   - Event Screen:       bottom={100} right={20}  (tab-bar + is at bottom-centre)
 *
 * The position prop must be supplied by the parent screen/component so that
 * the FAB does not obscure the primary content area on any screen.
 */
export function BackpackFAB({ onPress, position, style, testID }: BackpackFABProps) {
  const isFirstAppearance = useSparkleOnFirstAppearance();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isFirstAppearance) {
      // Sparkle: quick scale-up burst then settle
      scale.value = withSequence(
        withTiming(1.3, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0.9, { duration: 120 }),
        withSpring(1, { damping: 8, stiffness: 180 }),
      );
      // Pulse glow twice
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.4, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(0.6, { duration: 300 }),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, position, style, animatedStyle]}
      testID={testID}
    >
      {/* Soft glow layer — always visible, opacity animated on first appearance */}
      <Animated.View style={[styles.glow, glowStyle]} />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityLabel="Open In the Bag packing list"
        accessibilityRole="button"
        hitSlop={8}
      >
        {/* [ ] Replace emoji placeholder with a proper backpack icon asset (SF Symbol or custom SVG) before shipping. */}
        <Animated.Text style={styles.icon}>🎒</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const FAB_SIZE = 56;
const GLOW_SIZE = FAB_SIZE + 20;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(255, 220, 80, 0.35)',
  },
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  icon: {
    fontSize: 26,
  },
});

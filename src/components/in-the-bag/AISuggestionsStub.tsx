// src/components/in-the-bag/AISuggestionsStub.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type AIState = 'loading' | 'locked' | 'ready' | 'empty';

interface Props {
  state: AIState;
  /** Items to render when state = 'ready' (populated by Plan 5). */
  items?: { id: string; title: string }[];
  onUnlockPress?: () => void;
}

export function AISuggestionsStub({ state, items = [], onUnlockPress }: Props) {
  const sparkleOpacity = useSharedValue(0);

  useEffect(() => {
    if (state === 'loading' || state === 'ready') {
      sparkleOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      sparkleOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [state]);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Animated.Text style={[styles.sparkle, sparkleStyle]}>✦</Animated.Text>
        <Text style={styles.heading}>AI Suggestions</Text>
        {state === 'loading' && (
          <ActivityIndicator size="small" color="#7C6AF7" style={styles.spinner} />
        )}
      </View>

      {state === 'loading' && (
        <Text style={styles.subtext}>
          Generating suggestions for this packing list...
        </Text>
      )}

      {state === 'locked' && (
        <Pressable
          style={styles.lockedBadge}
          onPress={onUnlockPress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium to get AI packing suggestions"
        >
          <Text style={styles.lockedText}>
            Premium — AI suggests items based on your event, destination, and profile
          </Text>
          <Text style={styles.upgradeLink}>Upgrade</Text>
        </Pressable>
      )}

      {(state === 'ready' || state === 'empty') && items.length === 0 && (
        <Text style={styles.subtext}>No suggestions at this time.</Text>
      )}

      {state === 'ready' && items.length > 0 && (
        // Plan 5 will render actual suggestion cards here.
        // For now, show placeholder rows.
        items.map((item) => (
          <View key={item.id} style={styles.suggestionRow}>
            <Text style={styles.suggestionTitle}>{item.title}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sparkle: {
    fontSize: 16,
    color: '#F7C94A',
    marginRight: 6,
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  spinner: {
    marginLeft: 8,
  },
  subtext: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  lockedBadge: {
    backgroundColor: 'rgba(124, 106, 247, 0.08)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 106, 247, 0.2)',
  },
  lockedText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
  upgradeLink: {
    fontSize: 13,
    color: '#7C6AF7',
    fontWeight: '600',
  },
  suggestionRow: {
    paddingVertical: 6,
  },
  suggestionTitle: {
    fontSize: 14,
    color: '#333',
  },
});

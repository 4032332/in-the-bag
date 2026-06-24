import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { storage } from '../../lib/mmkv';

type DisplayStyle = 'tiles' | 'stacked';

interface Props {
  tripId: string;
  value: DisplayStyle;
  onChange: (style: DisplayStyle) => void;
}

export function DisplayStyleToggle({ tripId, value, onChange }: Props) {
  const options: { label: string; value: DisplayStyle }[] = [
    { label: 'Tiles', value: 'tiles' },
    { label: 'Stacked', value: 'stacked' },
  ];
  return (
    <View style={styles.container}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.segment, value === opt.value && styles.active]}
          onPress={() => {
            storage.set(`trip_display_style_${tripId}`, opt.value);
            onChange(opt.value);
          }}
        >
          <Text style={[styles.label, value === opt.value && styles.activeLabel]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#007AFF' },
  segment: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: '#fff' },
  active: { backgroundColor: '#007AFF' },
  label: { fontSize: 13, color: '#007AFF' },
  activeLabel: { color: '#fff' },
});

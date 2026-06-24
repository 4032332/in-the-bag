import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExtractionItem } from '../../../types/explore';

interface Props {
  item: ExtractionItem;
  onToggleSelected: (id: string) => void;
  onToggleClassification: (id: string) => void;
}

export default function ExtractionResultItem({ item, onToggleSelected, onToggleClassification }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onToggleSelected(item.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.selected }}
    >
      <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
        {item.selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.content}>
        <Text style={styles.recommendation}>{item.recommendation}</Text>
        {item.sourceTimestamp && (
          <Text style={styles.timestamp}>at {item.sourceTimestamp}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.badge,
          item.classification === 'Event' ? styles.badgeEvent : styles.badgeTask,
        ]}
        onPress={() => onToggleClassification(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Classification: ${item.classification}. Tap to toggle.`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.badgeText}>{item.classification}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C0C0C0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { flex: 1 },
  recommendation: { fontSize: 15, color: '#000', lineHeight: 20 },
  timestamp: { fontSize: 12, color: '#999', marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeEvent: { backgroundColor: '#E5F0FF' },
  badgeTask: { backgroundColor: '#E5FAF0' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
});

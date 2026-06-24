// src/components/in-the-bag/InTheBagItem.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { InTheBagItem as ItemType } from '@/types/database';

interface Props {
  item: ItemType;
  allIds?: string[];
  /** Optional tooltip text showing which events need this item (day-level dedup). */
  sourceEventTitles?: string[];
  onTogglePacked: (ids: string[], isPacked: boolean) => void;
}

export function InTheBagItemRow({ item, allIds, sourceEventTitles, onTogglePacked }: Props) {
  const idsToToggle = allIds && allIds.length > 0 ? allIds : [item.id];
  return (
    <Pressable
      style={styles.row}
      onPress={() => onTogglePacked(idsToToggle, !item.is_packed)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.is_packed }}
      accessibilityLabel={`${item.title}${item.is_packed ? ', packed' : ', not packed'}`}
    >
      <View style={[styles.checkbox, item.is_packed && styles.checkboxChecked]}>
        {item.is_packed && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.labelContainer}>
        <Text style={[styles.title, item.is_packed && styles.titlePacked]}>
          {item.title}
        </Text>
        {sourceEventTitles && sourceEventTitles.length > 1 && (
          <Text style={styles.sourceHint}>
            Needed for: {sourceEventTitles.join(', ')}
          </Text>
        )}
        {item.is_ai_suggested && (
          <Text style={styles.aiTag}>AI suggestion</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  titlePacked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  sourceHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  aiTag: {
    fontSize: 10,
    color: '#7C6AF7',
    marginTop: 2,
    fontStyle: 'italic',
  },
});

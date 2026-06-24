import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { ExtractionItem } from '../../../types/explore';
import ExtractionResultItem from './ExtractionResultItem';

interface Props {
  items: ExtractionItem[];
  onToggleSelected: (id: string) => void;
  onToggleClassification: (id: string) => void;
}

export default function ExtractionResultsList({ items, onToggleSelected, onToggleClassification }: Props) {
  const allSelected = items.every((i) => i.selected);

  const handleSelectAll = useCallback(() => {
    items.forEach((item) => {
      if (item.selected === allSelected) onToggleSelected(item.id);
    });
  }, [items, allSelected, onToggleSelected]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{items.length} items found</Text>
        <TouchableOpacity onPress={handleSelectAll} accessibilityRole="button">
          <Text style={styles.selectAll}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExtractionResultItem
            item={item}
            onToggleSelected={onToggleSelected}
            onToggleClassification={onToggleClassification}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  selectAll: { fontSize: 14, color: '#007AFF' },
});

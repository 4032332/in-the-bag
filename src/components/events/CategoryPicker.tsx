import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { EventCategory } from '../../types/database';

interface CategoryItem {
  id: EventCategory;
  label: string;
  isCruiseOnly: boolean;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'transport_air', label: 'Transport — Air', isCruiseOnly: false },
  { id: 'transport_road', label: 'Transport — Road', isCruiseOnly: false },
  { id: 'transport_rail', label: 'Transport — Rail', isCruiseOnly: false },
  { id: 'transport_water', label: 'Transport — Water', isCruiseOnly: false },
  { id: 'accommodation', label: 'Accommodation', isCruiseOnly: false },
  { id: 'activity', label: 'Activity', isCruiseOnly: false },
  { id: 'meal', label: 'Meal', isCruiseOnly: false },
  { id: 'rest', label: 'Rest', isCruiseOnly: false },
  { id: 'health', label: 'Health', isCruiseOnly: false },
  { id: 'free_time', label: 'Free Time', isCruiseOnly: false },
  { id: 'shore_excursion', label: 'Shore Excursion', isCruiseOnly: true },
];

interface Props {
  isCruise: boolean;
  onSelect: (category: EventCategory) => void;
}

export function CategoryPicker({ isCruise, onSelect }: Props) {
  const filtered = CATEGORIES.filter((c) => !c.isCruiseOnly || isCruise);

  return (
    <ScrollView contentContainerStyle={styles.grid}>
      <Text style={styles.hint}>Add with AI</Text>
      <View style={[styles.aiBtn, styles.aiBtnDisabled]}>
        <Text style={styles.aiBtnText}>Add with AI</Text>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>Premium</Text>
        </View>
      </View>
      {filtered.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.categoryBtn}
          onPress={() => onSelect(cat.id)}
        >
          <Text style={styles.categoryText}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { padding: 16, gap: 10 },
  hint: { fontSize: 13, color: '#888', marginBottom: 4 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 4,
  },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText: { fontSize: 15, fontWeight: '500', color: '#333' },
  premiumBadge: {
    backgroundColor: '#f0c040',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 11, fontWeight: '600', color: '#333' },
  categoryBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryText: { fontSize: 15, color: '#1a1a2e' },
});

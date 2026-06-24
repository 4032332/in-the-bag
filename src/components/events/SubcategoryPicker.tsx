import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { EventCategory } from '../../types/database';

const SUBCATEGORIES: Partial<Record<EventCategory, string[]>> = {
  transport_road: ['Car hire', 'Taxi', 'Shuttle', 'Bus', 'Self-drive'],
  transport_rail: ['Train', 'Tram', 'Metro'],
  transport_water: ['Ferry', 'Cruise leg', 'Water taxi'],
  accommodation: ['Hotel', 'Airbnb', 'Resort', 'Hostel', 'Other'],
  activity: ['Theme park', 'Show', 'Sightseeing', 'Sporting event', 'Exhibition', 'Tour', 'Other'],
  meal: ['Restaurant', 'Cafe', 'Food tour'],
  health: ['Appointment', 'Pharmacy', 'Medical'],
};

export function hasSubcategories(category: EventCategory): boolean {
  return (SUBCATEGORIES[category]?.length ?? 0) > 0;
}

interface Props {
  category: EventCategory;
  onSelect: (subcategory: string) => void;
  onSkip: () => void;
}

export function SubcategoryPicker({ category, onSelect, onSkip }: Props) {
  const subcategories = SUBCATEGORIES[category] ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Select type</Text>
      {subcategories.map((sub) => (
        <TouchableOpacity key={sub} style={styles.item} onPress={() => onSelect(sub)}>
          <Text style={styles.itemText}>{sub}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  item: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemText: { fontSize: 15, color: '#1a1a2e' },
  skipBtn: { marginTop: 8, alignItems: 'center', padding: 12 },
  skipText: { color: '#888', fontSize: 14 },
});

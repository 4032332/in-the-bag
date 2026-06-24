import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { TripSummary } from '../../../hooks/useTripList';

interface Props {
  trips: TripSummary[];
  selectedTripId: string | null;
  onSelect: (tripId: string) => void;
}

export default function TripSelector({ trips, selectedTripId, onSelect }: Props) {
  if (trips.length <= 1) return null;

  const selectedTrip = trips.find((t) => t.id === selectedTripId);
  const { showActionSheetWithOptions } = useActionSheet();

  const handlePress = () => {
    showActionSheetWithOptions(
      {
        options: [...trips.map((t) => t.name), 'Cancel'],
        cancelButtonIndex: trips.length,
      },
      (index) => {
        if (index !== undefined && index < trips.length) onSelect(trips[index].id);
      }
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} accessibilityRole="button">
      <Text style={styles.label}>Trip</Text>
      <Text style={styles.value}>{selectedTrip?.name ?? 'Select a trip'}</Text>
      <Text style={styles.chevron}>{'>'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  label: { fontSize: 15, color: '#888', width: 60 },
  value: { flex: 1, fontSize: 15, fontWeight: '500', color: '#000' },
  chevron: { fontSize: 15, color: '#C0C0C0' },
});

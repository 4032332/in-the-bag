import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Event } from '../../types/database';
import { format, parseISO } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  transport_air: 'Air',
  transport_road: 'Road',
  transport_rail: 'Rail',
  transport_water: 'Water',
  accommodation: 'Stay',
  activity: 'Activity',
  meal: 'Meal',
  rest: 'Rest',
  health: 'Health',
  free_time: 'Free',
  shore_excursion: 'Shore',
};

interface Props {
  event: Event;
  tripId: string;
}

export function EventTile({ event, tripId }: Props) {
  const router = useRouter();
  const timeLabel = event.start_time ? format(parseISO(event.start_time), 'HH:mm') : null;

  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={() => router.push(`/trips/${tripId}/events/${event.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open event ${event.title}`}
    >
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{CATEGORY_LABELS[event.category] ?? event.category}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
      {event.subcategory && <Text style={styles.subcategory}>{event.subcategory}</Text>}
      {timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 10, backgroundColor: '#f0f4f8', padding: 14, marginBottom: 10, gap: 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#007AFF', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  categoryText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  subcategory: { fontSize: 12, color: '#666' },
  time: { fontSize: 12, color: '#888' },
});

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Event } from '../../types/database';
import { format, parseISO } from 'date-fns';

const CATEGORY_COLORS: Record<string, string> = {
  transport_air: '#4c9be8',
  transport_road: '#6c757d',
  transport_rail: '#fd7e14',
  transport_water: '#20c997',
  accommodation: '#6f42c1',
  activity: '#e83e8c',
  meal: '#ffc107',
  rest: '#adb5bd',
  health: '#dc3545',
  free_time: '#28a745',
  shore_excursion: '#17a2b8',
};

interface Props {
  event: Event;
  tripId: string;
}

export function EventStackedRow({ event, tripId }: Props) {
  const router = useRouter();
  const startTime = event.start_time ? format(parseISO(event.start_time), 'HH:mm') : null;
  const endTime = event.end_time ? format(parseISO(event.end_time), 'HH:mm') : null;
  const timeRange = startTime ? `${startTime}${endTime ? ` - ${endTime}` : ''}` : '';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/trips/${tripId}/events/${event.id}` as any)}
      accessibilityRole="button"
    >
      <View style={[styles.strip, { backgroundColor: CATEGORY_COLORS[event.category] ?? '#999' }]} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        {timeRange ? <Text style={styles.time}>{timeRange}</Text> : null}
        {event.subcategory && <Text style={styles.subcategory}>{event.subcategory}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8f8f8' },
  strip: { width: 5 },
  info: { flex: 1, padding: 12, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  time: { fontSize: 12, color: '#555' },
  subcategory: { fontSize: 12, color: '#888' },
});

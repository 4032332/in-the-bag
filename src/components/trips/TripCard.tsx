import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Trip, TripDestination, TripParticipant } from '../../types/database';
import { format, parseISO } from 'date-fns';

interface Props {
  trip: Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
}

export function TripCard({ trip }: Props) {
  const router = useRouter();
  const sortedDests = [...trip.trip_destinations].sort((a, b) => a.display_order - b.display_order);
  const firstDest = sortedDests[0];
  const lastDest = sortedDests[sortedDests.length - 1];
  const startDate = firstDest ? format(parseISO(firstDest.start_date), 'dd MMM yyyy') : '';
  const endDate = lastDest ? format(parseISO(lastDest.end_date), 'dd MMM yyyy') : '';
  const destinationLabel = sortedDests.map((d) => d.city).join(' / ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/trips/${trip.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open trip ${trip.name}`}
    >
      {trip.cover_photo_url ? (
        <Image source={{ uri: trip.cover_photo_url }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.placeholderText}>{trip.name[0]?.toUpperCase() ?? 'T'}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{trip.name}</Text>
        {destinationLabel ? <Text style={styles.destination}>{destinationLabel}</Text> : null}
        <Text style={styles.dates}>{startDate}{endDate && startDate !== endDate ? ` - ${endDate}` : ''}</Text>
        <Text style={styles.participants}>{trip.trip_participants.length} {trip.trip_participants.length === 1 ? 'traveller' : 'travellers'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, backgroundColor: '#f8f8f8', borderWidth: StyleSheet.hairlineWidth, borderColor: '#e0e0e0' },
  photo: { width: '100%', height: 160 },
  photoPlaceholder: { backgroundColor: '#c8d8e8', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 48, fontWeight: '700', color: '#fff' },
  info: { padding: 12, gap: 4 },
  name: { fontSize: 18, fontWeight: '600' },
  destination: { fontSize: 14, color: '#555' },
  dates: { fontSize: 12, color: '#888' },
  participants: { fontSize: 12, color: '#aaa' },
});

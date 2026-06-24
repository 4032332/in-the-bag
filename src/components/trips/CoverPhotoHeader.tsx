import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trip, TripDestination, TripParticipant } from '../../types/database';
import { format, parseISO } from 'date-fns';

interface Props {
  trip: Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
}

export function CoverPhotoHeader({ trip }: Props) {
  const [coverUrl, setCoverUrl] = useState<string | null>(trip.cover_photo_url);

  useEffect(() => {
    const channel = supabase
      .channel(`trip-cover-${trip.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.id}` },
        (payload) => {
          const newUrl = (payload.new as Partial<Trip>).cover_photo_url;
          if (newUrl) setCoverUrl(newUrl);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trip.id]);

  const sortedDests = [...trip.trip_destinations].sort((a, b) => a.display_order - b.display_order);
  const destinationLabel = sortedDests.map((d) => `${d.city}, ${d.country}`).join(' / ');
  const firstDest = sortedDests[0];
  const lastDest = sortedDests[sortedDests.length - 1];
  const startDate = firstDest ? format(parseISO(firstDest.start_date), 'dd MMM yyyy') : '';
  const endDate = lastDest ? format(parseISO(lastDest.end_date), 'dd MMM yyyy') : '';

  return (
    <View style={styles.container}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.placeholder]}>
          <Text style={styles.placeholderText}>{trip.name[0]?.toUpperCase() ?? 'T'}</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <Text style={styles.tripName}>{trip.name}</Text>
        {destinationLabel ? <Text style={styles.destination}>{destinationLabel}</Text> : null}
        <Text style={styles.dates}>{startDate}{endDate && startDate !== endDate ? ` - ${endDate}` : ''}</Text>
        <Text style={styles.participants}>{trip.trip_participants.length} {trip.trip_participants.length === 1 ? 'traveller' : 'travellers'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  photo: { width: '100%', height: 220 },
  placeholder: { backgroundColor: '#c8d8e8', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 64, fontWeight: '700', color: '#fff' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  tripName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  destination: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  dates: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  participants: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
});

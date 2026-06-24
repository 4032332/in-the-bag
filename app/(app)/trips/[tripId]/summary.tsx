import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Trip, TripDestination, TripParticipant } from '../../../../src/types/database';
import { CoverPhotoHeader } from '../../../../src/components/trips/CoverPhotoHeader';
import { MilestoneBannerList } from '../../../../src/components/trips/MilestoneBannerList';
import { PreTripChecklist } from '../../../../src/components/trips/PreTripChecklist';
import { storage } from '../../../../src/lib/mmkv';

interface Props {
  trip: Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
  userId: string;
  isReadOnly?: boolean;
}

export function TripSummary({ trip, userId, isReadOnly = false }: Props) {
  const tripStartDate = trip.trip_destinations.sort((a, b) => a.display_order - b.display_order)[0]?.start_date ?? new Date().toISOString().split('T')[0];
  const offlineSaved = storage.getBoolean(`offline_save_done_${trip.id}`) ?? false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CoverPhotoHeader trip={trip} />
      {!isReadOnly && (
        <MilestoneBannerList tripId={trip.id} userId={userId} tripStartDate={tripStartDate} />
      )}
      {offlineSaved && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Documents saved for offline access</Text>
        </View>
      )}
      <PreTripChecklist tripId={trip.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  offlineBanner: { backgroundColor: '#e8f5e9', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  offlineBannerText: { color: '#2e7d32', fontSize: 13 },
});

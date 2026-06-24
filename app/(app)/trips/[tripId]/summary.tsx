import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Trip, TripDestination, TripParticipant } from '../../../../src/types/database';
import { CoverPhotoHeader } from '../../../../src/components/trips/CoverPhotoHeader';
import { MilestoneBannerList } from '../../../../src/components/trips/MilestoneBannerList';
import { PreTripChecklist } from '../../../../src/components/trips/PreTripChecklist';
import { storage } from '../../../../src/lib/mmkv';
import { useDemoMode } from '../../../../src/hooks/useDemoMode';
import { BackpackFAB } from '../../../../src/components/in-the-bag/BackpackFAB';
import { InTheBagSheet, InTheBagSheetScope } from '../../../../src/components/in-the-bag/InTheBagSheet';
import { useAsyncJob } from '../../../hooks/useAsyncJob';

interface Props {
  trip: Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
  userId: string;
  isReadOnly?: boolean;
}

export function TripSummary({ trip, userId, isReadOnly = false }: Props) {
  const { demoTier } = useDemoMode();
  const isPremium = demoTier === 'premium';
  const [sheetOpen, setSheetOpen] = useState(false);

  const coverJobId = storage.getString(`job_cover_photo_${trip.id}`);
  const checklistJobId = storage.getString(`job_checklist_${trip.id}`);
  const bagJobId = storage.getString(`job_bag_${trip.id}`);

  const { isLoading: coverLoading } = useAsyncJob(coverJobId ?? null);
  const { isLoading: checklistLoading } = useAsyncJob(checklistJobId ?? null);
  const { isLoading: bagLoading } = useAsyncJob(bagJobId ?? null);

  const tripStartDate = trip.trip_destinations.sort((a, b) => a.display_order - b.display_order)[0]?.start_date ?? new Date().toISOString().split('T')[0];
  const offlineSaved = storage.getBoolean(`offline_save_done_${trip.id}`) ?? false;

  const sheetScope: InTheBagSheetScope = {
    kind: 'trip',
    tripId: trip.id,
    isPremium,
    aiJobStatus: bagLoading ? 'loading' : 'idle',
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <CoverPhotoHeader trip={trip} isLoading={coverLoading} />
        {!isReadOnly && (
          <MilestoneBannerList tripId={trip.id} userId={userId} tripStartDate={tripStartDate} />
        )}
        {offlineSaved && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>Documents saved for offline access</Text>
          </View>
        )}
        <PreTripChecklist tripId={trip.id} isLoading={checklistLoading} />
      </ScrollView>
      <BackpackFAB
        onPress={() => setSheetOpen(true)}
        position={{ bottom: 100, right: 20 }}
      />
      <InTheBagSheet
        scope={sheetScope}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpgradePress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  scrollContainer: { flex: 1 },
  content: { paddingBottom: 40 },
  offlineBanner: { backgroundColor: '#e8f5e9', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  offlineBannerText: { color: '#2e7d32', fontSize: 13 },
});

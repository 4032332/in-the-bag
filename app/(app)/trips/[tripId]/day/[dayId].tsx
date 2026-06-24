import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Event } from '../../../../../src/types/database';
import { listEventsForDay } from '../../../../../src/services/events';
import { EventList } from '../../../../../src/components/events/EventList';
import { DisplayStyleToggle } from '../../../../../src/components/common/DisplayStyleToggle';
import { storage } from '../../../../../src/lib/mmkv';
import { BackpackFAB } from '../../../../../src/components/in-the-bag/BackpackFAB';
import { InTheBagSheet } from '../../../../../src/components/in-the-bag/InTheBagSheet';
import { useDemoMode } from '../../../../../src/hooks/useDemoMode';
import { useAsyncJob } from '../../../../hooks/useAsyncJob';

interface DayViewProps {
  tripDayId: string;
  tripId: string;
  isReadOnly?: boolean;
  onAddEvent?: () => void;
}

export function DayView({ tripDayId, tripId, isReadOnly = false, onAddEvent }: DayViewProps) {

  const [displayStyle, setDisplayStyle] = useState<'tiles' | 'stacked'>(
    () => (storage.getString(`trip_display_style_${tripId}`) as 'tiles' | 'stacked') ?? 'tiles'
  );

  const { demoTier } = useDemoMode();
  const isPremium = demoTier === 'premium';
  const [sheetOpen, setSheetOpen] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);

  const dayJobsRaw = storage.getString(`day_bag_jobs_${tripDayId}`);
  const dayJobs = dayJobsRaw ? JSON.parse(dayJobsRaw) : [];
  const latestJobId = dayJobs.length > 0 ? dayJobs[dayJobs.length - 1] : null;

  const { isLoading: aiLoading } = useAsyncJob(latestJobId);

  const loadEvents = useCallback(async () => {
    try {
      const data = await listEventsForDay(tripDayId);
      setEvents(data);
    } catch {
      // no-op; events remain empty
    }
  }, [tripDayId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <DisplayStyleToggle tripId={tripId} value={displayStyle} onChange={setDisplayStyle} />
        {!isReadOnly && (
          <TouchableOpacity style={styles.addBtn} onPress={onAddEvent}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
      <EventList events={events} displayStyle={displayStyle} tripId={tripId} tripDayId={tripDayId} isReadOnly={isReadOnly} />
      <BackpackFAB
        onPress={() => setSheetOpen(true)}
        position={{ bottom: 100, right: 20 }}
      />
      <InTheBagSheet
        scope={{
          kind: 'day',
          tripId,
          tripDayId,
          events: events.map((e) => ({ id: e.id, title: e.title ?? '' })),
          isPremium,
          aiJobStatus: aiLoading ? 'processing' : 'idle',
        }}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpgradePress={() => {}}
      />
    </View>
  );
}

export default function DayScreen() {
  const { tripId, dayId } = useLocalSearchParams<{ tripId: string; dayId: string }>();
  if (!tripId || !dayId) return null;
  return <DayView tripDayId={dayId} tripId={tripId} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TreasureMapCanvas } from '../components/TreasureMapCanvas';
import { GestureDetector } from 'react-native-gesture-handler';
import { generateLayout } from '../layout/generateLayout';
import { getTrip } from '@/services/trips';
import { listEventsForDay } from '@/services/events';
import { useTreasureMapRealtime } from '../hooks/useTreasureMapRealtime';
import { useTreasureMapGestures } from '../hooks/useTreasureMapGestures';
import { getTripDay } from '@/services/tripDays';

/**
 * Event-level Treasure Map — one tile per event on the selected day.
 * Layout is generated fresh from a derived seed (trip seed XOR day index)
 * so each day's event map looks distinct but is still deterministic.
 */
export default function EventTreasureMapScreen() {
  const { tripId, dayId } = useLocalSearchParams<{ tripId: string; dayId: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<any>(null);
  const [day, setDay] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId || !dayId) return;
    Promise.all([getTrip(tripId), getTripDay(dayId), listEventsForDay(dayId)])
      .then(([tripData, dayData, eventsData]) => {
        setTrip(tripData);
        setDay(dayData);
        setEvents(eventsData);
      })
      .finally(() => setLoading(false));
  }, [tripId, dayId]);

  const imageUrl = useTreasureMapRealtime(tripId, trip?.treasure_map_image_url ?? null);
  const { composed } = useTreasureMapGestures();

  function handleTileTap(eventId: string) {
    router.push(`/trips/${tripId}/events/${eventId}`);
  }

  if (loading || !trip || !day) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Derive event-level layout: use trip seed XOR day index for determinism
  const baseSeed = (trip.treasure_map_layout as any).seed ?? 0;
  const eventSeed = (baseSeed ^ day.day_number) >>> 0;

  // Fix C2: events MUST be sorted by display_order ASC before extracting ids.
  const sortedEvents = [...events].sort((a, b) => a.display_order - b.display_order);
  const eventLayout = generateLayout({ seed: eventSeed, itemIds: sortedEvents.map(e => e.id) });

  // Map events to the expected structure
  const mappedItems = sortedEvents.map(e => {
    // We only have the generic DayMeta structure from the canvas. Let's just repurpose the fields.
    // DayNumber becomes nothing, weekday becomes time, date becomes title.
    const time = e.start_time ? e.start_time.substring(0, 5) : '';
    return {
      id: e.id,
      dayNumber: 0,
      weekday: time,
      date: e.title,
      eventCount: 0
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composed}>
        <TreasureMapCanvas
          layout={eventLayout}
          items={mappedItems}
          backgroundImageUrl={imageUrl}
          isCruise={trip.is_cruise}
          onTileTap={handleTileTap}
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

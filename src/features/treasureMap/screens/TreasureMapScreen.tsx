import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTreasureMapGestures } from '../hooks/useTreasureMapGestures';
import { useTreasureMapRealtime } from '../hooks/useTreasureMapRealtime';
import { TreasureMapCanvas } from '../components/TreasureMapCanvas';
import { getTrip } from '@/services/trips';
import { listTripDays } from '@/services/tripDays';

export default function TreasureMapScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    Promise.all([getTrip(tripId), listTripDays(tripId)])
      .then(([tripData, daysData]) => {
        setTrip(tripData);
        // Map days to the expected structure
        setDays(daysData.map(d => {
          const date = new Date(d.date);
          const weekday = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const dateStr = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
          return {
            id: d.id,
            dayNumber: d.day_number,
            weekday,
            date: dateStr,
            eventCount: 0 // In a real implementation we might fetch the actual count, or leave it as 0
          };
        }));
      })
      .finally(() => setLoading(false));
  }, [tripId]);

  const imageUrl = useTreasureMapRealtime(tripId, trip?.treasure_map_image_url ?? null);
  const { composed } = useTreasureMapGestures();

  function handleTileTap(dayId: string) {
    router.push(`/trips/${tripId}/treasure-map/events?dayId=${dayId}`);
  }

  if (loading || !trip) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Cast because JSON field parsing
  const layout = trip.treasure_map_layout as any;

  return (
    <View style={styles.container}>
      {/* GestureDetector MUST wrap the canvas — do not comment this out (Fix C3) */}
      <GestureDetector gesture={composed}>
        <TreasureMapCanvas
          layout={layout}
          items={days}
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

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Trip, TripDay, TripDestination, TripParticipant } from '../../../../src/types/database';
import { getTrip } from '../../../../src/services/trips';
import { listTripDays } from '../../../../src/services/tripDays';
import { DayTabBar } from '../../../../src/components/trips/DayTabBar';
import { TripSummary } from './summary';
import { DayView } from './day/[dayId]';
import { useAuth } from '../../../../src/hooks/useAuth';
import { useDemoMode } from '../../../../src/hooks/useDemoMode';
import { TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ActiveView = 'summary' | string; // string = tripDay.id

export default function TripScreen() {
  const { tripId, readOnly: readOnlyParam } = useLocalSearchParams<{ tripId: string; readOnly?: string }>();
  const { user } = useAuth();
  const { demoTier } = useDemoMode();
  const router = useRouter();

  const [trip, setTrip] = useState<(Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] }) | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTreasureMapPress = () => {
    if (demoTier === 'premium') {
      router.push(`/trips/${tripId}/treasure-map`);
    } else {
      Alert.alert('Premium Feature', 'Upgrade to Premium to view the Treasure Map.');
    }
  };

  useEffect(() => {
    if (!tripId) return;
    Promise.all([getTrip(tripId), listTripDays(tripId)])
      .then(([tripData, daysData]) => {
        setTrip(tripData);
        setDays(daysData);
      })
      .catch(() => setError('Failed to load trip.'))
      .finally(() => setLoading(false));
  }, [tripId]);

  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (error || !trip) return <View style={styles.center}><Text>{error ?? 'Trip not found.'}</Text></View>;

  const tripMaxEnd = trip.trip_destinations.reduce((max, d) => (d.end_date > max ? d.end_date : max), '');
  const isPastTrip = tripMaxEnd !== '' && tripMaxEnd < new Date().toISOString().split('T')[0];
  const isReadOnly = readOnlyParam === 'true' || isPastTrip;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleTreasureMapPress} style={{ marginRight: 8, padding: 8 }}>
              <Ionicons name="map-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )
        }}
      />
      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>This trip is in the past</Text>
        </View>
      )}
      <View style={styles.layout}>
        <DayTabBar
          days={days}
          activeDayId={activeView === 'summary' ? null : activeView}
          onSelectDay={(day) => setActiveView(day.id)}
          showSummary
          summaryActive={activeView === 'summary'}
          onSelectSummary={() => setActiveView('summary')}
        />
        <View style={styles.content}>
          {activeView === 'summary' ? (
            <TripSummary trip={trip} userId={user?.id ?? ''} isReadOnly={isReadOnly} />
          ) : (
            <DayView tripDayId={activeView} tripId={tripId} isReadOnly={isReadOnly} onAddEvent={() => { /* AddToDaySheet wired in Task 7 */ }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  readOnlyBanner: { backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 8 },
  readOnlyText: { color: '#856404', fontSize: 13, fontWeight: '500' },
  layout: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
});

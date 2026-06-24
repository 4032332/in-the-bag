import React, { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { TripCard } from '../../src/components/trips/TripCard';
import { EmptyTripsState } from '../../src/components/trips/EmptyTripsState';
import { listActiveTrips } from '../../src/services/trips';
import { useAuth } from '../../src/hooks/useAuth';
import { Trip, TripDestination, TripParticipant } from '../../src/types/database';

type TripWithRelations = Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await listActiveTrips(user.id);
      setTrips(data);
    } catch (e) {
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  if (loading) return <ActivityIndicator style={styles.loader} />;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadTrips} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (trips.length === 0) return <EmptyTripsState />;

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  loader: { flex: 1 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: '#c00', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

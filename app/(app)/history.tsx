import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { listHistoryTrips } from '../../src/services/history';
import { TripCard } from '../../src/components/trips/TripCard';
import { Trip, TripDestination, TripParticipant } from '../../src/types/database';

type TripWithRelations = Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!user) { setLoading(false); return; }
        try {
          const data = await listHistoryTrips(user.id);
          setTrips(data);
          setError(null);
        } catch {
          setError('Failed to load past trips.');
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [user])
  );

  if (loading) return <ActivityIndicator style={styles.loader} />;

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  if (trips.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>No past trips yet</Text>
      <Text style={styles.emptySubtitle}>Completed trips will appear here.</Text>
    </View>
  );

  return (
    <FlatList
      data={trips}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TripCard
          trip={item}
          onPress={() => router.push(`/(app)/trips/${item.id}?readOnly=true` as any)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#c00', fontSize: 15, textAlign: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a2e', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
});

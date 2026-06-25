import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { usePremium } from '../../src/context/SubscriptionContext';
import { MemoriesSection } from '../../src/components/memories/MemoriesSection';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const { user } = useAuth();
  const { isPremium } = usePremium();

  useEffect(() => {
    if (!user) return;
    const fetchTrips = async () => {
      const today = new Date().toISOString().split('T')[0];

      // Active trip
      const { data: activeData } = await supabase
        .from('trips')
        .select(`*, trip_participants!inner(user_id)`)
        .eq('trip_participants.user_id', user.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: true })
        .limit(1)
        .single();

      // Upcoming trips
      const { data: upcomingData } = await supabase
        .from('trips')
        .select(`*, trip_participants!inner(user_id)`)
        .eq('trip_participants.user_id', user.id)
        .gt('start_date', today)
        .order('start_date', { ascending: true });

      if (activeData) setActiveTrip(activeData);
      if (upcomingData) setUpcomingTrips(upcomingData);
    };
    fetchTrips();
  }, [user]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>Home</Text>

      <Text style={styles.sectionTitle}>Active Trip</Text>
      {activeTrip ? (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/(app)/trips/${activeTrip.id}/summary`)}>
          <Text style={styles.cardTitle}>{activeTrip.name}</Text>
          <Text style={styles.cardSubtitle}>{activeTrip.destination}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.empty}>No active trip.</Text>
      )}

      <Text style={styles.sectionTitle}>Upcoming Trips</Text>
      {upcomingTrips.length > 0 ? (
        upcomingTrips.map(trip => (
          <TouchableOpacity key={trip.id} style={styles.card} onPress={() => router.push(`/(app)/trips/${trip.id}/summary`)}>
            <Text style={styles.cardTitle}>{trip.name}</Text>
            <Text style={styles.cardSubtitle}>{trip.destination}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.empty}>No upcoming trips.</Text>
      )}

      <MemoriesSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  card: { padding: 16, backgroundColor: '#f9f9f9', borderRadius: 12, marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, color: '#666' },
  empty: { fontSize: 15, color: '#888', fontStyle: 'italic' },
});

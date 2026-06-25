import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStatsData } from '../../hooks/useStatsData';
import { useProfile } from '../../hooks/useProfile';
import { useHealthKitData } from '../../hooks/useHealthKitData';
import { TravelDashboard } from './components/TravelDashboard';
import { HealthSection } from './components/HealthSection';
import { supabase } from '../../lib/supabase';

interface CompanionName {
  userId: string;
  name: string | null;
}

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { metrics, destinations, trips, healthKitEnabled, loading, error } = useStatsData();
  const profile = useProfile();

  // Build date ranges from trips for HealthKit queries
  const tripDateRanges = trips.flatMap((t) => {
    const dests = destinations.filter((d) => d.trip_id === t.id);
    if (dests.length === 0) return [];
    const starts = dests.map((d) => new Date(d.start_date).getTime());
    const ends = dests.map((d) => new Date(d.end_date).getTime());
    return [{ start: new Date(Math.min(...starts)), end: new Date(Math.max(...ends)) }];
  });

  const { permissionStatus, healthData, loading: healthLoading, needsPermissionPrompt, requestPermission } =
    useHealthKitData(tripDateRanges);

  // Resolve companion display name
  const [companionName, setCompanionName] = useState<string | null>(null);
  useEffect(() => {
    if (!metrics.mostCommonCompanion) return;
    supabase
      .from('users')
      .select('full_name')
      .eq('id', metrics.mostCommonCompanion.userId)
      .single()
      .then(({ data }) => setCompanionName((data as { full_name: string | null } | null)?.full_name ?? null));
  }, [metrics.mostCommonCompanion?.userId]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Stats</Text>

      <TravelDashboard
        metrics={{ ...metrics, companionName }}
        destinations={destinations}
        countryOfResidency={profile?.country_of_residency ?? null}
      />

      {healthKitEnabled && (
        <HealthSection
          permissionStatus={permissionStatus}
          needsPermissionPrompt={needsPermissionPrompt}
          healthData={healthData}
          loading={healthLoading}
          onRequestPermission={requestPermission}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#FFF' },
  content: { paddingBottom: 32 },
  screenTitle: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
});

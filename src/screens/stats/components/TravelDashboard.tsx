import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatCard } from './StatCard';
import { CountryListModal } from './CountryListModal';
import { CityListModal } from './CityListModal';
import { useFurthestDestination } from '../../../hooks/useFurthestDestination';
import type { TripDestination } from '../../../lib/stats/statsCalculator';

interface Metrics {
  trips: number;
  daysAway: number;
  countries: { count: number; list: string[] };
  cities: { count: number; list: string[] };
  flights: number;
  cruises: number;
  trainJourneys: number;
  roadTrips: number;
  longestTrip: { tripName: string; days: number } | null;
  mostVisitedCountry: string | null;
  mostCommonCompanion: { userId: string; count: number } | null;
  companionName?: string | null;
}

interface Props {
  metrics: Metrics;
  destinations: TripDestination[];
  countryOfResidency: string | null;
}

export function TravelDashboard({ metrics, destinations, countryOfResidency }: Props) {
  const [showCountries, setShowCountries] = useState(false);
  const [showCities, setShowCities] = useState(false);

  const { furthest, loading: geocodeLoading } = useFurthestDestination(destinations, countryOfResidency);

  const furthestValue = geocodeLoading
    ? null
    : furthest
    ? `${furthest.city}, ${furthest.country}`
    : 'No data';

  const furthestSubtitle = furthest ? `${Math.round(furthest.distanceKm).toLocaleString()} km from home` : undefined;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Travel Dashboard</Text>

      <StatCard label="Trips taken" value={metrics.trips} />
      <StatCard label="Days away" value={metrics.daysAway} />

      <StatCard
        label="Countries visited"
        value={metrics.countries.count}
        subtitle={metrics.countries.count > 0 ? 'Tap to view list' : undefined}
        onPress={metrics.countries.count > 0 ? () => setShowCountries(true) : undefined}
      />

      <StatCard
        label="Cities visited"
        value={metrics.cities.count}
        subtitle={metrics.cities.count > 0 ? 'Tap to view list' : undefined}
        onPress={metrics.cities.count > 0 ? () => setShowCities(true) : undefined}
      />

      <StatCard label="Flights taken" value={metrics.flights} />
      <StatCard label="Cruises" value={metrics.cruises} />
      <StatCard label="Train journeys" value={metrics.trainJourneys} />
      <StatCard label="Road trips" value={metrics.roadTrips} />

      {metrics.longestTrip ? (
        <StatCard
          label="Longest trip"
          value={`${metrics.longestTrip.days} days`}
          subtitle={metrics.longestTrip.tripName}
        />
      ) : (
        <StatCard label="Longest trip" value="—" />
      )}

      {metrics.mostVisitedCountry ? (
        <StatCard label="Most visited country" value={metrics.mostVisitedCountry} />
      ) : (
        <StatCard label="Most visited country" value="—" />
      )}

      {geocodeLoading ? (
        <View style={styles.skeletonCard}>
          <Text style={styles.skeletonLabel}>Furthest destination</Text>
          <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
        </View>
      ) : (
        <StatCard
          label="Furthest destination from home"
          value={furthestValue ?? '—'}
          subtitle={furthestSubtitle}
        />
      )}

      {metrics.mostCommonCompanion ? (
        <StatCard
          label="Most common travel companion"
          value={metrics.companionName ?? metrics.mostCommonCompanion.userId}
          subtitle={`${metrics.mostCommonCompanion.count} trips together`}
        />
      ) : (
        <StatCard label="Most common travel companion" value="—" />
      )}

      <CountryListModal
        visible={showCountries}
        countries={metrics.countries.list}
        onClose={() => setShowCountries(false)}
      />
      <CityListModal
        visible={showCities}
        cities={metrics.cities.list}
        onClose={() => setShowCities(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  skeletonCard: { backgroundColor: '#F7F7F7', borderRadius: 12, padding: 16, marginBottom: 12 },
  skeletonLabel: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '500' },
  spinner: { alignSelf: 'flex-start' },
});

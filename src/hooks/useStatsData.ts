import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  totalTrips,
  totalDaysAway,
  countriesVisited,
  citiesVisited,
  totalFlights,
  totalCruises,
  totalTrainJourneys,
  totalRoadTrips,
  longestTrip,
  mostVisitedCountry,
  mostCommonTravelCompanion,
  type Trip,
  type TripDestination,
  type Event,
  type TripParticipant,
  type TripDateRange,
} from '../lib/stats/statsCalculator';

interface StatsMetrics {
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
}

interface StatsData {
  trips: Trip[];
  destinations: TripDestination[];
  events: Event[];
  participants: TripParticipant[];
  metrics: StatsMetrics;
  healthKitEnabled: boolean;
  loading: boolean;
  error: string | null;
}

const EMPTY_METRICS: StatsMetrics = {
  trips: 0,
  daysAway: 0,
  countries: { count: 0, list: [] },
  cities: { count: 0, list: [] },
  flights: 0,
  cruises: 0,
  trainJourneys: 0,
  roadTrips: 0,
  longestTrip: null,
  mostVisitedCountry: null,
  mostCommonCompanion: null,
};

export function useStatsData(): StatsData {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<TripDestination[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [healthKitEnabled, setHealthKitEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: participantRows, error: pErr } = await supabase
          .from('trip_participants')
          .select('trip_id, user_id')
          .eq('user_id', user.id);
        if (pErr) throw pErr;

        const tripIds = (participantRows ?? []).map((r) => (r as { trip_id: string }).trip_id);

        const flagRes = await supabase
          .from('feature_flags')
          .select('enabled')
          .eq('key', 'stats_healthkit_enabled')
          .limit(1);
        setHealthKitEnabled((flagRes.data?.[0] as { enabled: boolean } | undefined)?.enabled ?? false);

        if (tripIds.length === 0) {
          setTrips([]); setDestinations([]); setEvents([]); setParticipants([]);
          return;
        }

        const [tripsRes, destsRes, eventsRes, allParticipantsRes] = await Promise.all([
          supabase.from('trips').select('id, name, is_cruise').in('id', tripIds),
          supabase.from('trip_destinations').select('id, trip_id, city, country, start_date, end_date').in('trip_id', tripIds),
          supabase.from('events').select('id, trip_id, category, subcategory').in('trip_id', tripIds),
          supabase.from('trip_participants').select('trip_id, user_id').in('trip_id', tripIds),
        ]);

        if (tripsRes.error) throw tripsRes.error;
        if (destsRes.error) throw destsRes.error;
        if (eventsRes.error) throw eventsRes.error;
        if (allParticipantsRes.error) throw allParticipantsRes.error;

        setTrips((tripsRes.data ?? []) as unknown as Trip[]);
        setDestinations((destsRes.data ?? []) as unknown as TripDestination[]);
        setEvents((eventsRes.data ?? []) as unknown as Event[]);
        setParticipants(
          ((allParticipantsRes.data ?? []) as unknown as TripParticipant[]).filter((p) => p.user_id !== null),
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  const metrics = useMemo((): StatsMetrics => {
    if (trips.length === 0) return EMPTY_METRICS;

    const tripDateRanges: TripDateRange[] = trips.map((t) => {
      const tripDests = destinations.filter((d) => d.trip_id === t.id);
      if (tripDests.length === 0) return { minStart: new Date(), maxEnd: new Date() };
      const starts = tripDests.map((d) => new Date(d.start_date).getTime());
      const ends = tripDests.map((d) => new Date(d.end_date).getTime());
      return { minStart: new Date(Math.min(...starts)), maxEnd: new Date(Math.max(...ends)) };
    });

    return {
      trips: totalTrips(trips),
      daysAway: totalDaysAway(tripDateRanges),
      countries: countriesVisited(destinations),
      cities: citiesVisited(destinations),
      flights: totalFlights(events),
      cruises: totalCruises(trips),
      trainJourneys: totalTrainJourneys(events),
      roadTrips: totalRoadTrips(events),
      longestTrip: longestTrip(trips, destinations),
      mostVisitedCountry: mostVisitedCountry(destinations),
      mostCommonCompanion: user ? mostCommonTravelCompanion(participants, user.id) : null,
    };
  }, [trips, destinations, events, participants, user]);

  return { trips, destinations, events, participants, metrics, healthKitEnabled, loading, error };
}

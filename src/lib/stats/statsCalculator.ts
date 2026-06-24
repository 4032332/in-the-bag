export interface Trip {
  id: string;
  name: string;
  is_cruise: boolean;
}

export interface TripDestination {
  id: string;
  trip_id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
}

export interface Event {
  id: string;
  trip_id: string;
  category: string;
  subcategory: string | null;
}

export interface TripParticipant {
  trip_id: string;
  user_id: string | null;
}

export interface TripDateRange {
  minStart: Date;
  maxEnd: Date;
}

export function totalTrips(trips: Trip[]): number {
  return trips.length;
}

export function totalDaysAway(tripDateRanges: TripDateRange[]): number {
  return tripDateRanges.reduce((sum, { minStart, maxEnd }) => {
    const days = Math.round((maxEnd.getTime() - minStart.getTime()) / 86400000) + 1;
    return sum + Math.max(days, 0);
  }, 0);
}

export function countriesVisited(destinations: TripDestination[]): { count: number; list: string[] } {
  const set = new Set(destinations.map((d) => d.country));
  const list = Array.from(set).sort();
  return { count: list.length, list };
}

export function citiesVisited(destinations: TripDestination[]): { count: number; list: string[] } {
  const set = new Set(destinations.map((d) => `${d.city}, ${d.country}`));
  const list = Array.from(set).sort();
  return { count: list.length, list };
}

export function totalFlights(events: Event[]): number {
  return events.filter((e) => e.category === 'Transport' && e.subcategory === 'Air').length;
}

export function totalCruises(trips: Trip[]): number {
  return trips.filter((t) => t.is_cruise).length;
}

export function totalTrainJourneys(events: Event[]): number {
  return events.filter((e) => e.category === 'Transport' && e.subcategory === 'Rail').length;
}

// Road trips: Transport events where subcategory is car_hire or self_drive.
// taxi, shuttle, bus are excluded — they share category=Transport but differ by subcategory.
export function totalRoadTrips(events: Event[]): number {
  return events.filter(
    (e) => e.category === 'Transport' && (e.subcategory === 'car_hire' || e.subcategory === 'self_drive'),
  ).length;
}

export function longestTrip(
  trips: Trip[],
  destinations: TripDestination[],
): { tripName: string; days: number } | null {
  if (trips.length === 0) return null;

  let best: { tripName: string; days: number } | null = null;

  for (const trip of trips) {
    const tripDests = destinations.filter((d) => d.trip_id === trip.id);
    if (tripDests.length === 0) continue;

    const starts = tripDests.map((d) => new Date(d.start_date).getTime());
    const ends = tripDests.map((d) => new Date(d.end_date).getTime());
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    const days = Math.round((maxEnd - minStart) / 86400000) + 1;

    if (!best || days > best.days) {
      best = { tripName: trip.name, days };
    }
  }

  return best;
}

export function mostVisitedCountry(destinations: TripDestination[]): string | null {
  if (destinations.length === 0) return null;

  // Count by trips (not destination rows) — group by trip_id+country then count unique trips per country
  const tripCountryPairs = new Set(destinations.map((d) => `${d.trip_id}:${d.country}`));
  const counts = new Map<string, number>();
  for (const pair of tripCountryPairs) {
    const country = pair.split(':').slice(1).join(':');
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }

  let maxCount = 0;
  let result: string | null = null;
  for (const [country, count] of counts) {
    if (count > maxCount || (count === maxCount && result !== null && country < result)) {
      maxCount = count;
      result = country;
    }
  }
  return result;
}

export function mostCommonTravelCompanion(
  participants: TripParticipant[],
  currentUserId: string,
): { userId: string; count: number } | null {
  // For each other user, count how many trips they share with currentUserId
  const myTrips = new Set(
    participants.filter((p) => p.user_id === currentUserId).map((p) => p.trip_id),
  );

  const counts = new Map<string, number>();
  for (const p of participants) {
    if (!p.user_id || p.user_id === currentUserId) continue;
    if (myTrips.has(p.trip_id)) {
      counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  let best: { userId: string; count: number } | null = null;
  for (const [userId, count] of counts) {
    if (!best || count > best.count || (count === best.count && userId < best.userId)) {
      best = { userId, count };
    }
  }
  return best;
}

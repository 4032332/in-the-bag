import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedCoords, setCachedCoords } from '../lib/stats/geocodeCache';
import { haversineKm } from '../lib/stats/haversine';
import type { TripDestination } from '../lib/stats/statsCalculator';

interface Result {
  city: string;
  country: string;
  distanceKm: number;
}

interface State {
  furthest: Result | null;
  loading: boolean;
  error: string | null;
}

export function useFurthestDestination(
  destinations: TripDestination[],
  countryOfResidency: string | null,
): State {
  const [state, setState] = useState<State>({ furthest: null, loading: false, error: null });

  useEffect(() => {
    if (!countryOfResidency || destinations.length === 0) {
      setState({ furthest: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));

      // Build unique city+country pairs including home reference
      const pairs: Array<{ city: string; country: string }> = [];
      const seen = new Set<string>();

      const addPair = (city: string, country: string) => {
        const k = `${city.toLowerCase().trim()}:${country.toLowerCase().trim()}`;
        if (!seen.has(k)) { seen.add(k); pairs.push({ city, country }); }
      };

      addPair('', countryOfResidency); // home reference — let Gemini return country centre
      for (const d of destinations) addPair(d.city, d.country);

      // Check cache; collect uncached
      const coordsMap = new Map<string, { lat: number; lon: number }>();
      const uncached: Array<{ city: string; country: string }> = [];

      for (const p of pairs) {
        const cached = getCachedCoords(p.city, p.country);
        if (cached) {
          coordsMap.set(`${p.city}:${p.country}`, cached);
        } else {
          uncached.push(p);
        }
      }

      // Fetch uncached in one batch
      if (uncached.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke('geocode', {
            body: { cities: uncached },
          });
          if (!error && Array.isArray(data)) {
            for (const item of data) {
              if (typeof item.lat === 'number' && typeof item.lon === 'number') {
                setCachedCoords(item.city, item.country, item.lat, item.lon);
                coordsMap.set(`${item.city}:${item.country}`, { lat: item.lat, lon: item.lon });
              }
            }
          }
        } catch {
          // Geocoding failed; continue with whatever we have cached
        }
      }

      if (cancelled) return;

      const homeCoords = coordsMap.get(`:${countryOfResidency}`) ?? coordsMap.get(`${countryOfResidency.toLowerCase().trim()}`);
      if (!homeCoords) {
        setState({ furthest: null, loading: false, error: null });
        return;
      }

      let furthest: Result | null = null;
      for (const d of destinations) {
        const coords = coordsMap.get(`${d.city}:${d.country}`);
        if (!coords) continue;
        const distanceKm = haversineKm(homeCoords.lat, homeCoords.lon, coords.lat, coords.lon);
        if (!furthest || distanceKm > furthest.distanceKm) {
          furthest = { city: d.city, country: d.country, distanceKm };
        }
      }

      setState({ furthest, loading: false, error: null });
    };

    run();
    return () => { cancelled = true; };
  }, [destinations, countryOfResidency]);

  return state;
}

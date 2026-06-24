# Stats & HealthKit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Stats screen with a full Travel Dashboard (calculated from Supabase trip/event data) and Apple Health integration (HealthKit), accessible from both the bottom tab bar and the Profile screen.

**Architecture:** Stats data is computed on-device by querying Supabase for the current user's trips, destinations, and events; all aggregation logic lives in a pure `statsCalculator` module that is independently testable. Geocoding for "furthest distance from home" is performed at display time via a Gemini grounded search Edge Function call, with results cached in MMKV keyed by `city:country` to avoid repeat lookups and a pure haversine function used for distance calculation. HealthKit data is read locally via `react-native-health`, filtered to trip date ranges, and never sent to Supabase — the Travel Dashboard renders independently of HealthKit permission state.

**Tech Stack:** react-native-health, MMKV (geocode cache), Gemini grounded search (via existing Edge Function service layer) for geocoding

---

## File Structure

```
src/
  screens/
    stats/
      StatsScreen.tsx              # Root screen — tab bar entry point
      components/
        TravelDashboard.tsx        # All Travel Dashboard metric cards
        HealthSection.tsx          # HealthKit permission prompt + metrics display
        StatCard.tsx               # Reusable single-metric display card
        CountryListModal.tsx       # Scrollable countries visited list
        CityListModal.tsx          # Scrollable cities visited list
  lib/
    stats/
      statsCalculator.ts           # Pure aggregation functions (no side effects)
      statsCalculator.test.ts      # Unit tests for all aggregation functions
      haversine.ts                 # Pure haversine distance function
      haversine.test.ts            # Unit tests for haversine
      geocodeCache.ts              # MMKV-backed geocode cache (city:country → lat/long)
      healthKitBridge.ts           # react-native-health wrapper (permission + data fetch)
      healthKitBridge.test.ts      # Unit tests with mock data for date range filtering
  hooks/
    useStatsData.ts                # Fetches raw trip/event data from Supabase, memoises
    useHealthKitData.ts            # Manages HealthKit permission state + data fetch
    useFurthestDestination.ts      # Orchestrates geocode cache + Gemini call + haversine
```

---

## Tasks

### Step 1 — Pure calculation library (statsCalculator + haversine) [~4 min]

- [ ] Create `src/lib/stats/haversine.ts` — export a single pure function `haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number` using the standard haversine formula; no external dependencies.
- [ ] Create `src/lib/stats/haversine.test.ts`:
  - Test: London to Sydney returns approximately 16993 km (±10 km tolerance).
  - Test: same coordinates returns 0.
  - Test: antipodal points return approximately 20015 km.
- [ ] Create `src/lib/stats/statsCalculator.ts` exporting the following pure functions (all accept typed arrays derived from Supabase query results — no direct DB calls inside these functions):
  - `totalTrips(trips: Trip[]): number`
  - `totalDaysAway(tripDateRanges: Array<{ minStart: Date; maxEnd: Date }>): number` — accepts trip-level min/max dates (i.e. `MIN(start_date)` to `MAX(end_date)` across each trip's destinations) and sums (maxEnd − minStart + 1) per trip. **Do not sum individual destination rows** — for multi-destination trips where destination date ranges overlap, summing each row will double-count days. The caller (`useStatsData`) must derive trip-level min/max dates via `MIN(start_date)` / `MAX(end_date)` grouped by trip before passing them to this function.
  - `countriesVisited(destinations: TripDestination[]): { count: number; list: string[] }` — deduplicated, sorted alphabetically.
  - `citiesVisited(destinations: TripDestination[]): { count: number; list: string[] }` — deduplicated `city, country` strings, sorted alphabetically.
  - `totalFlights(events: Event[]): number` — count events where `category = 'Transport'` and `subcategory = 'Air'`.
  - `totalCruises(trips: Trip[]): number` — count trips where `is_cruise = true`.
  - `totalTrainJourneys(events: Event[]): number` — count events where `category = 'Transport'` and `subcategory = 'Rail'`.
  - `totalRoadTrips(events: Event[]): number` — count events where `category = 'Transport'` and `subcategory = 'Road'` AND `subcategory_detail` is one of `['car_hire', 'self_drive']`; explicitly **exclude** `taxi`, `shuttle`, and `bus`. **IMPORTANT: Before implementing, confirm the actual column name used to distinguish car_hire/self_drive from taxi/shuttle/bus within Transport — Road events. The spec Section 14 lists these as subcategory options under Transport — Road. Verify whether the distinction is stored in `subcategory` itself (e.g. `subcategory = 'car_hire'`) or in a separate `subcategory_detail` field. If it is `subcategory`, update the filter accordingly.**
  - `longestTrip(trips: Trip[], destinations: TripDestination[]): { tripName: string; days: number } | null`
  - `mostVisitedCountry(destinations: TripDestination[]): string | null` — country appearing in most trips (not most destination rows); returns first alphabetically on tie.
  - `mostCommonTravelCompanion(participants: TripParticipant[], currentUserId: string): { userId: string; count: number } | null` — count co-occurrence of each other user_id across trips; exclude the current user; return the user_id appearing in the most trips; on tie, return the user_id that is lexicographically smallest (deterministic).
- [ ] Create `src/lib/stats/statsCalculator.test.ts`:
  - Test `totalRoadTrips`: fixture includes `car_hire`, `self_drive`, `taxi`, `shuttle`, `bus` events; assert only `car_hire` and `self_drive` are counted.
  - Test `mostCommonTravelCompanion` with a two-way tie — assert deterministic result (lexicographically smallest user_id wins).
  - Test `countriesVisited` deduplication (same country on multiple trips counts once).
  - Test `longestTrip` returns correct trip when multiple trips have different lengths.
  - Test `totalDaysAway` correctly sums across multiple trips including single-day trips.
  - [ ] Test `totalFlights`: fixture contains Air, Road, and Rail transport events; assert that only the Air events are counted and the total matches the Air-only count.
  - [ ] Test `totalCruises`: fixture contains trips where `is_cruise` is `true` and `false`; assert that only trips with `is_cruise = true` are counted.
  - [ ] Test `totalTrainJourneys`: fixture contains Rail and non-Rail transport events; assert that only Rail events are counted.
  - [ ] Test `mostVisitedCountry` with a tie: two countries each visited on exactly 2 trips; assert the function returns the first country alphabetically (deterministic tie-break).
  - [ ] Test `countriesVisited` alphabetical sort: fixture with countries in non-alphabetical insertion order; assert the returned `list` is sorted A-Z.
- [ ] Run tests; all must pass before committing.
- [ ] Commit: `feat(stats): add pure stats calculator and haversine distance functions with tests`

---

### Step 2 — Geocode cache and furthest-destination hook [~4 min]

- [ ] Create `src/lib/stats/geocodeCache.ts`:
  - Backed by MMKV (reuse the app's existing MMKV instance).
  - Cache key format: `geocode:{city}:{country}` (both lowercased, trimmed) — ensures `Paris:France` and `paris:france` resolve to the same key.
  - Export `getCachedCoords(city: string, country: string): { lat: number; lon: number } | null`
  - Export `setCachedCoords(city: string, country: string, lat: number, lon: number): void`
- [ ] Create `src/hooks/useFurthestDestination.ts`:
  - Accepts `destinations: TripDestination[]` and `countryOfResidency: string`.
  - For each unique `city + country` pair (including the user's country of residency as a home reference point), check the geocode cache first.
  - For any city not cached, batch into a single Gemini grounded search Edge Function call (reuse the existing Edge Function service layer; do not create a new Edge Function). The request asks Gemini to return approximate lat/long for each city. On response, write each result to the geocode cache.
  - Compute haversine distance from the home reference point (user's `country_of_residency` capital or city centre — pass the country name and let Gemini return its approximate centre lat/long) to each destination.
  - Return `{ city: string; country: string; distanceKm: number } | null` for the furthest destination, plus a `loading: boolean` and `error: string | null`.
  - If any geocode call fails for a specific city, skip that city and continue — do not abort the whole calculation.
- [ ] Commit: `feat(stats): add MMKV geocode cache and furthest-destination hook`

---

### Step 3 — HealthKit bridge and hook [~4 min]

- [ ] Install `react-native-health` if not already in `package.json`; add required `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` entries to `app.json`/`app.config.js` Info.plist configuration.
- [ ] Create `src/lib/stats/healthKitBridge.ts`:
  - Export `requestHealthKitPermission(): Promise<'granted' | 'denied' | 'unavailable'>` — requests read permission for `StepCount`, `ActiveEnergyBurned`, `FlightsClimbed`; returns `'unavailable'` if HealthKit is not available on device (simulator / non-Apple hardware).
  - Export `fetchTravelHealthData(dateRanges: Array<{ start: Date; end: Date }>): Promise<{ totalSteps: number; totalKj: number; totalFlightsClimbed: number }>` — for each date range (one per trip), query each metric; sum totals across all ranges; return the combined result.
  - All queries must use `startDate` / `endDate` options provided by `react-native-health` — never fetch all-time data.
  - Active energy: `react-native-health` returns kilocalories; convert to kJ by multiplying by 4.184 before returning.
- [ ] Create `src/lib/stats/healthKitBridge.test.ts`:
  - Mock `react-native-health` module using Jest module mocking.
  - Test `fetchTravelHealthData` with two non-overlapping date ranges: assert that data outside both ranges (provided by the mock) does not contribute to totals.
  - Test `fetchTravelHealthData` with overlapping date ranges that might double-count — verify the function queries each range independently and sums correctly.
  - Test that `requestHealthKitPermission` returns `'unavailable'` when the mock signals HealthKit is not available.
  - Test kJ conversion: mock returns 100 kcal active energy; assert result is 418.4 kJ.
- [ ] Create `src/hooks/useHealthKitData.ts`:
  - On mount, reads permission state from MMKV key `healthkit_permission_requested` (bool).
  - If permission not yet requested, sets a `needsPermissionPrompt: true` flag — the UI shows the prompt; actual permission request fires only when the user taps "Allow" in the HealthSection component (not on mount).
  - If permission was previously requested, calls `requestHealthKitPermission()` silently to get current status without showing a system dialog.
  - Exposes: `permissionStatus: 'granted' | 'denied' | 'unavailable' | 'not_asked'`, `healthData: { totalSteps, totalKj, totalFlightsClimbed } | null`, `loading: boolean`, `refetch(): void`.
  - Health data is never stored in Supabase — it is fetched fresh each time the Stats screen mounts.
- [ ] Run tests; all must pass before committing.
- [ ] Commit: `feat(stats): add HealthKit bridge with date-range filtering and unit tests`

---

### Step 4 — Supabase data hook and Stats screen UI [~5 min]

- [ ] Create `src/hooks/useStatsData.ts`:
  - Fetches from Supabase: `trips` (all trips for current user via `trip_participants`), `trip_destinations`, `events` (all events across all user trips), `trip_participants` (for companion calculation).
  - Returns `{ trips, destinations, events, participants, loading, error }`.
  - Uses `useMemo` to derive all stats metrics via `statsCalculator` functions — recalculates only when raw data changes.
- [ ] Create `src/screens/stats/components/StatCard.tsx` — reusable card component displaying a label, a large numeric value, and an optional subtitle or "tap to expand" affordance.
- [ ] Create `src/screens/stats/components/CountryListModal.tsx` — modal with a scrollable `FlatList` of country names; dismiss via close button or backdrop tap.
- [ ] Create `src/screens/stats/components/CityListModal.tsx` — same pattern as `CountryListModal` but for cities.
- [ ] Create `src/screens/stats/components/TravelDashboard.tsx`:
  - Renders all 12 Travel Dashboard metrics as `StatCard` instances.
  - "Countries visited" and "Cities visited" cards show count; tapping opens `CountryListModal` / `CityListModal`.
  - "Furthest distance from home" card shows city name + distance in km; uses `useFurthestDestination` hook; shows a loading skeleton while geocoding is in progress.
  - "Most common travel companion" card shows the companion's display name (looked up from `users` table by `user_id`); handles ties as per `statsCalculator` (deterministic, documented behaviour).
  - No emojis anywhere — follow global UI rule from the spec.
- [ ] Create `src/screens/stats/components/HealthSection.tsx`:
  - If `permissionStatus === 'not_asked'`: show a card with a brief explanation and an "Allow Health Access" button. Tapping calls `requestHealthKitPermission()`, writes `healthkit_permission_requested = true` to MMKV, and refreshes permission state.
  - If `permissionStatus === 'denied'`: show a card with the message "Enable Health Access in Settings" and a "Open Settings" button (links to `UIApplicationOpenSettingsURLString`).
  - If `permissionStatus === 'unavailable'`: hide the HealthKit section entirely (no error state shown to user).
  - If `permissionStatus === 'granted'`: show three `StatCard` instances — "Steps during travel", "Energy burned (kJ)", "Floors climbed during travel". Show loading skeleton while data is fetching.
  - Travel Dashboard section is always rendered regardless of HealthKit state.
- [ ] Create `src/screens/stats/StatsScreen.tsx`:
  - Renders a `ScrollView` with `TravelDashboard` followed by `HealthSection` (if HealthKit available).
  - Registers as the Stats tab in `app/(tabs)/stats.tsx` (Expo Router) — if the file does not yet exist, create it.
  - Also exported for use as a pushed screen from the Profile screen (`app/(tabs)/profile/stats.tsx`) — the same `StatsScreen` component is used in both entry points; no duplication.
  - Back button top-left, settings gear top-right (follow global UI rule).
  - `+` button hidden on this screen (per spec Section 8 context-sensitive + table).
- [ ] Commit: `feat(stats): implement Stats screen UI with Travel Dashboard and Health section`

---

### Step 5 — Profile screen Stats entry point and feature flag guard [~2 min]

- [ ] In the existing Profile screen, add a "Stats" row in the menu list (after "Trip History") that navigates to the `StatsScreen` — this is the second entry point specified in the spec. **Note: This requires the Profile tab to use a nested Stack navigator. Verify that `app/(tabs)/profile/_layout.tsx` defines a Stack navigator before creating `app/(tabs)/profile/stats.tsx`. If the Profile tab does not have a nested stack, add one in this step.**
- [ ] Wrap the HealthKit section in `StatsScreen` with a feature flag check: read `stats_healthkit_enabled` from the `feature_flags` table (fetched alongside stats data in `useStatsData`); if the flag is `false`, render `TravelDashboard` only and do not import or invoke any HealthKit code (tree-shake safe).
- [ ] Verify: with the flag `false`, the Health section is not visible; with the flag `true`, the full Health section (permission prompt or data) renders correctly.
- [ ] Commit: `feat(stats): add Profile screen Stats entry point and feature flag guard`

---

## Self-Review Checklist

Before considering this plan complete, verify:

- [ ] **Road trips filter** — `totalRoadTrips` in `statsCalculator.ts` explicitly guards on `subcategory_detail` being `car_hire` or `self_drive`; the test fixture includes `taxi`, `shuttle`, and `bus` events that must not be counted; the test asserts the exact exclusion.
- [ ] **Haversine is a pure function** — `haversine.ts` has zero imports from app code or external HTTP; `haversine.test.ts` covers known city pairs, zero distance, and antipodal points.
- [ ] **Geocode cache keyed by city+country** — `geocodeCache.ts` lowercases and trims both `city` and `country` before constructing the key; two calls with different casing for the same city produce a cache hit, not two entries.
- [ ] **HealthKit date range filtering tested** — `healthKitBridge.test.ts` includes a test that proves data outside trip date ranges is excluded; mock returns both in-range and out-of-range samples.
- [ ] **HealthKit permission denial handled gracefully** — `HealthSection` renders the "Enable in Settings" prompt when `permissionStatus === 'denied'`; `TravelDashboard` renders fully regardless.
- [ ] **Most common travel companion ties handled** — `statsCalculator.ts` documents the tie-breaking rule (lexicographically smallest `user_id`); the test exercises a two-way tie and asserts the correct winner.
- [ ] **No emojis** — search `StatsScreen.tsx`, `TravelDashboard.tsx`, `HealthSection.tsx`, and `StatCard.tsx` for emoji characters before committing Step 4.
- [ ] **Feature flag tree-shake safety** — `stats_healthkit_enabled` feature flag is correctly read from the `feature_flags` table and gates the HealthKit section — when `false`, no HealthKit code is imported or executed (tree-shake safe).

---

## Review Fixes Applied

The following targeted fixes were applied to this plan during review:

- **Minor 1 — totalDaysAway overlap guard**: Updated `totalDaysAway` function signature to accept trip-level `{ minStart, maxEnd }` objects instead of raw destination rows. Added a note explaining that summing individual destination rows for multi-destination trips will double-count overlapping days; the caller must derive trip-level min/max dates via `MIN(start_date)` / `MAX(end_date)` grouped by trip.

- **Minor 3 — Missing test cases for 5 of 12 metrics**: Added five explicit numbered checklist items to `statsCalculator.test.ts` step covering: `totalFlights` (Air-only filter), `totalCruises` (is_cruise flag), `totalTrainJourneys` (Rail-only filter), `mostVisitedCountry` tie-breaking (alphabetically first), and `countriesVisited` alphabetical sort verification.

- **Minor 4 — subcategory_detail field name must be confirmed**: Added a warning note to the `totalRoadTrips` function definition directing the implementer to confirm before coding whether the car_hire/self_drive distinction lives in `subcategory` itself or a separate `subcategory_detail` field, and to update the filter accordingly.

- **Minor 8 — Profile screen Stats routing**: Added a note to the Profile screen Stats entry point step directing the implementer to verify that `app/(tabs)/profile/_layout.tsx` defines a Stack navigator before creating `app/(tabs)/profile/stats.tsx`, and to add one if it does not exist.

- **Minor — Self-review checklist missing feature flag check**: Added a checklist item confirming that the `stats_healthkit_enabled` feature flag correctly gates HealthKit code in a tree-shake-safe manner.

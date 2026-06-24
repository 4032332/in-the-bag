# Trip & Event Core Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete trip and event CRUD layer — Home screen through full event detail — so users can create trips, plan days, and manage all eleven event categories with correct tab visibility and free-tier cap enforcement.

**Architecture:** Screens live under `app/(app)/` using Expo Router file-based routing; shared business logic (cap checks, tab-visibility rules, form field resolution) is extracted into `src/lib/` utilities so they can be unit-tested independently of the UI. Supabase queries are isolated in `src/services/` files, keeping components thin and making it straightforward to mock data in tests.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase JS client, Zustand (trip/event state), React Hook Form + Zod (detail forms), Jest + React Native Testing Library (unit/integration tests), MMKV (local cache), date-fns (date formatting)

---

## File Structure

### New files — screens
- `app/(app)/index.tsx` — Home screen: active/upcoming trips list and empty state
- `app/(app)/trips/create.tsx` — Create Trip multi-step flow (steps 1-4 per spec Section 12)
- `app/(app)/trips/[tripId]/index.tsx` — Trip screen shell: Summary tab + Day tabs
- `app/(app)/trips/[tripId]/summary.tsx` — Summary tab content (cover photo header, milestone banners, pre-trip checklist)
- `app/(app)/trips/[tripId]/day/[dayId].tsx` — Day tab content: event list with display-style toggle
- `app/(app)/trips/[tripId]/events/[eventId]/index.tsx` — Event screen shell with conditional tab bar
- `app/(app)/trips/[tripId]/events/[eventId]/summary.tsx` — Event Summary tab
- `app/(app)/trips/[tripId]/events/[eventId]/tickets.tsx` — Event Tickets tab (stub — upload UI only, no AI scan)
- `app/(app)/trips/[tripId]/events/[eventId]/transport.tsx` — Event Transport tab (link existing or create inline transport event)
- `app/(app)/trips/[tripId]/events/[eventId]/documents.tsx` — Event Documents tab (stub — upload UI only)
- `app/(app)/history.tsx` — Trip History screen (read-only past trips list)

### New files — sheets / modals
- `src/components/sheets/AddToDaySheet.tsx` — Add to Day bottom sheet (cap check → category → subcategory → detail)
- `src/components/sheets/AddToWholeTripSheet.tsx` — Add to Whole Trip bottom sheet (day picker → cap check → category → subcategory → detail)
- `src/components/sheets/EventDetailSheet.tsx` — Detail form sheet; renders fields based on category/subcategory
- `src/components/sheets/AddTransportInlineSheet.tsx` — Compact inline transport creation modal used from Event Transport tab

### New files — components
- `src/components/trips/TripCard.tsx` — Trip card for Home screen (photo, name, dates, avatars)
- `src/components/trips/EmptyTripsState.tsx` — Empty state illustration + CTA for Home screen
- `src/components/trips/CoverPhotoHeader.tsx` — Animated cover photo header used on Trip Summary tab
- `src/components/trips/MilestoneBanner.tsx` — Single dismissable milestone banner component
- `src/components/trips/MilestoneBannerList.tsx` — Queries and renders the visible banner stack
- `src/components/trips/PreTripChecklist.tsx` — Checklist section (My Tasks only for free users)
- `src/components/trips/DayTabBar.tsx` — Left-side vertical tab bar (Day N / weekday / date)
- `src/components/events/EventTile.tsx` — Event card in Tiles display style
- `src/components/events/EventStackedRow.tsx` — Event row in Stacked display style
- `src/components/events/EventList.tsx` — Renders event list in chosen display style; accepts style prop
- `src/components/events/CategoryPicker.tsx` — Grid of category buttons; filters cruise-only per trip type
- `src/components/events/SubcategoryPicker.tsx` — List of subcategory options for a given category
- `src/components/events/EventDetailFields.tsx` — Renders the correct field set for a given category + subcategory
- `src/components/events/EventTabBar.tsx` — Horizontal tab bar for Event screen; hides tabs per visibility rules
- `src/components/common/DisplayStyleToggle.tsx` — Tiles / Stacked segmented control (Treasure Map excluded in this plan)

### New files — business logic / services
- `src/lib/eventTabVisibility.ts` — Pure function: given category, returns which tabs to show
- `src/lib/eventFieldConfig.ts` — Returns field schema for a given category + subcategory
- `src/lib/freeTierCap.ts` — Returns whether a day is at cap (3 events) for a given user tier
- `src/lib/tripDays.ts` — Helpers: generate trip_days from date range, format day-tab label
- `src/lib/asyncJobQueue.ts` — Thin wrapper: enqueue a job row in `async_jobs` and subscribe via Realtime
- `src/services/trips.ts` — Supabase CRUD for trips, trip_destinations, trip_participants
- `src/services/events.ts` — Supabase CRUD for events and event_participants
- `src/services/tripDays.ts` — Supabase CRUD for trip_days
- `src/services/tasks.ts` — Supabase CRUD for trip_tasks (manual add only in this plan)
- `src/services/milestoneBanners.ts` — Query and mutation helpers for milestone_banner_states
- `src/services/history.ts` — Query past trips for Trip History screen

### New files — tests
- `src/lib/__tests__/eventTabVisibility.test.ts` — Unit tests: all 11 categories, all tab permutations
- `src/lib/__tests__/freeTierCap.test.ts` — Unit tests: 0/1/2/3 events, free vs premium user
- `src/lib/__tests__/eventFieldConfig.test.ts` — Unit tests: field shape for each category
- `src/services/__tests__/trips.test.ts` — Integration tests: create/read trip against Supabase test schema
- `src/services/__tests__/events.test.ts` — Integration tests: create/read event, cap enforcement query

### Modified files
- `app/(app)/_layout.tsx` — Add Home and History routes; wire bottom tab bar (already scaffolded in Plan 1)
- `src/types/database.ts` — Add typed interfaces for trips, trip_destinations, trip_days, events, trip_tasks, milestone_banner_states (extends Plan 1 base types)

---

### Task 1: Database Types & Service Layer Foundation

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/services/trips.ts`
- Create: `src/services/events.ts`
- Create: `src/services/tripDays.ts`
- Create: `src/services/tasks.ts`
- Create: `src/services/history.ts`

- [ ] Step 1: Extend `src/types/database.ts` — add TypeScript interfaces for `Trip`, `TripDestination`, `TripDay`, `TripParticipant`, `Event`, `EventParticipant`, `TripTask`, `MilestoneBannerState`, `AsyncJob`. Mirror the column names from spec Section 6 exactly; use `null` (not `undefined`) for nullable fields.
  ```typescript
  export interface Trip {
    id: string;
    owner_user_id: string;
    name: string;
    cover_photo_url: string | null;
    is_cruise: boolean;
    cruise_details: Record<string, unknown> | null;
    treasure_map_image_url: string | null;
    treasure_map_layout: Record<string, unknown> | null;
    display_style: 'tiles' | 'stacked' | 'treasure_map';
    created_at: string;
    updated_at: string;
  }

  export interface TripDestination {
    id: string;
    trip_id: string;
    city: string;
    country: string;
    start_date: string; // ISO date string
    end_date: string;
    display_order: number;
  }

  export interface TripDay {
    id: string;
    trip_id: string;
    day_number: number;
    date: string; // ISO date string
  }

  export interface TripParticipant {
    id: string;
    trip_id: string;
    user_id: string | null;
    guest_profile_id: string | null;
    is_premium_sponsor: boolean;
  }

  export type EventCategory =
    | 'transport_air'
    | 'transport_road'
    | 'transport_rail'
    | 'transport_water'
    | 'accommodation'
    | 'activity'
    | 'meal'
    | 'rest'
    | 'health'
    | 'free_time'
    | 'shore_excursion';

  export interface Event {
    id: string;
    trip_day_id: string;
    trip_id: string;
    category: EventCategory;
    subcategory: string | null;
    title: string;
    start_time: string | null;
    end_time: string | null;
    address: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    confirmation_number: string | null;
    reservation_details: string | null;
    notes: string | null;
    ai_generated: boolean;
    linked_transport_event_id: string | null;
    display_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface TripTask {
    id: string;
    trip_id: string;
    title: string;
    category: string | null;
    is_completed: boolean;
    is_suggested: boolean;
    is_dismissed: boolean;
    snoozed_until: string | null;
    source: 'user' | 'ai';
    created_at: string;
  }

  export interface MilestoneBannerState {
    id: string;
    trip_id: string;
    user_id: string;
    banner_key: 'insurance_30d' | 'visa_14d' | 'esim_7d' | 'offline_docs_7d' | 'wifi_day_of';
    dismissed_at: string | null;
    resurface_at: string | null;
    action_taken: 'confirm' | 'dismiss' | 'save_now' | null;
  }

  export interface AsyncJob {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    trip_id: string | null;
    event_id: string | null;
    user_id: string;
    created_at: string;
    completed_at: string | null;
    error: string | null;
  }
  ```

- [ ] Step 2: Create `src/services/trips.ts` — implement `createTrip`, `getTrip`, `listActiveTrips`, `listPastTrips`, `updateTrip`. Each function uses the Supabase client from Plan 1's singleton. `listActiveTrips` and `listPastTrips` use a two-step query to correctly handle multi-destination trips: first fetch the user's trip IDs from `trip_participants`, then compute `MAX(end_date)` across all destinations per trip and filter on that.
  **[C3 — Correct multi-destination active/past detection]** The naive approach of joining `trip_destinations!inner` and filtering on `end_date` fails for multi-destination trips because Supabase will match any destination row, not the last one. Use the corrected pattern below:
  ```typescript
  import { supabase } from '../lib/supabase';
  import { Trip, TripDestination, TripParticipant } from '../types/database';

  export async function createTrip(input: {
    name: string;
    is_cruise: boolean;
    cruise_details?: Record<string, unknown>;
    treasure_map_layout: Record<string, unknown>;
    owner_user_id: string;
  }): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        ...input,
        display_style: 'tiles',
        cover_photo_url: null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Step 1: get trip IDs the user participates in. Step 2: compute MAX(end_date) per trip from
   *  trip_destinations, then filter. This correctly handles multi-destination trips where the
   *  !inner join approach would match any destination row instead of the final one. */
  async function getUserTripIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('trip_participants')
      .select('trip_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.trip_id);
  }

  async function getTripMaxEndDates(tripIds: string[]): Promise<Map<string, string>> {
    if (tripIds.length === 0) return new Map();
    // Use a GROUP BY RPC or aggregate in JS. Supabase JS doesn't support GROUP BY natively,
    // so fetch all destination rows for these trips and aggregate in JS.
    const { data, error } = await supabase
      .from('trip_destinations')
      .select('trip_id, end_date')
      .in('trip_id', tripIds);
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of data ?? []) {
      const current = map.get(row.trip_id);
      if (!current || row.end_date > current) map.set(row.trip_id, row.end_date);
    }
    return map;
  }

  export async function listActiveTrips(userId: string): Promise<Trip[]> {
    const today = new Date().toISOString().split('T')[0];
    const tripIds = await getUserTripIds(userId);
    if (tripIds.length === 0) return [];
    const maxEndDates = await getTripMaxEndDates(tripIds);
    const activeTripIds = tripIds.filter((id) => {
      const maxEnd = maxEndDates.get(id);
      return maxEnd !== undefined && maxEnd >= today;
    });
    if (activeTripIds.length === 0) return [];
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_destinations(*), trip_participants(*)')
      .in('id', activeTripIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  export async function listPastTrips(userId: string): Promise<Trip[]> {
    const today = new Date().toISOString().split('T')[0];
    const tripIds = await getUserTripIds(userId);
    if (tripIds.length === 0) return [];
    const maxEndDates = await getTripMaxEndDates(tripIds);
    const pastTripIds = tripIds.filter((id) => {
      const maxEnd = maxEndDates.get(id);
      return maxEnd !== undefined && maxEnd < today;
    });
    if (pastTripIds.length === 0) return [];
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_destinations(*), trip_participants(*)')
      .in('id', pastTripIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  export async function getTrip(tripId: string): Promise<Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] }> {
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_destinations(*), trip_participants(*)')
      .eq('id', tripId)
      .single();
    if (error) throw error;
    return data;
  }

  export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip> {
    const { data, error } = await supabase
      .from('trips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  ```

- [ ] Step 3: Create `src/services/events.ts` — implement `createEvent`, `getEvent`, `listEventsForDay`, `updateEvent`, `deleteEvent`, `countEventsForDay`. `countEventsForDay` is the cap-check query used by the free-tier enforcement.
  ```typescript
  import { supabase } from '../lib/supabase';
  import { Event } from '../types/database';

  export async function createEvent(input: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'ai_generated'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...input, ai_generated: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  export async function listEventsForDay(tripDayId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('trip_day_id', tripDayId)
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  export async function countEventsForDay(tripDayId: string): Promise<number> {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('trip_day_id', tripDayId);
    if (error) throw error;
    return count ?? 0;
  }

  export async function getEvent(eventId: string): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    return data;
  }

  export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  export async function deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  }
  ```

- [ ] Step 4: Create `src/services/tripDays.ts` and `src/services/tasks.ts` and `src/services/history.ts`.
  ```typescript
  // tripDays.ts
  import { supabase } from '../lib/supabase';
  import { TripDay } from '../types/database';

  export async function createTripDays(tripId: string, days: Omit<TripDay, 'id'>[]): Promise<TripDay[]> {
    const { data, error } = await supabase.from('trip_days').insert(days).select();
    if (error) throw error;
    return data ?? [];
  }

  export async function listTripDays(tripId: string): Promise<TripDay[]> {
    const { data, error } = await supabase
      .from('trip_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  // tasks.ts
  import { supabase } from '../lib/supabase';
  import { TripTask } from '../types/database';

  export async function listMyTasks(tripId: string): Promise<TripTask[]> {
    // My Tasks: is_suggested = false, is_dismissed = false (spec Section 6)
    const { data, error } = await supabase
      .from('trip_tasks')
      .select('*')
      .eq('trip_id', tripId)
      .eq('is_suggested', false)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  export async function addManualTask(tripId: string, title: string): Promise<TripTask> {
    const { data, error } = await supabase
      .from('trip_tasks')
      .insert({ trip_id: tripId, title, is_suggested: false, is_dismissed: false, is_completed: false, source: 'user' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  export async function toggleTaskComplete(taskId: string, is_completed: boolean): Promise<void> {
    const { error } = await supabase.from('trip_tasks').update({ is_completed }).eq('id', taskId);
    if (error) throw error;
  }

  // history.ts — thin wrapper; reuses listPastTrips from trips.ts
  export { listPastTrips as listHistoryTrips } from './trips';
  ```

- [ ] Step 5: Create `src/services/milestoneBanners.ts` — query visible banners per spec Section 6 banner display rules and write dismiss/snooze mutations.
  ```typescript
  import { supabase } from '../lib/supabase';
  import { MilestoneBannerState } from '../types/database';

  export async function getVisibleBanners(tripId: string, userId: string): Promise<MilestoneBannerState[]> {
    const now = new Date().toISOString();
    // Fetch all banner states for this trip+user; filter in JS per the two query rules (spec Section 6)
    const { data, error } = await supabase
      .from('milestone_banner_states')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', userId);
    if (error) throw error;
    const states: MilestoneBannerState[] = data ?? [];

    return states.filter((b) => {
      if (b.dismissed_at !== null) return false; // all banners: hide if dismissed
      if (b.banner_key === 'visa_14d') return true; // no snooze for visa banner
      // snooze-eligible banners: hide if resurface_at is in the future
      if (b.resurface_at !== null && b.resurface_at > now) return false;
      return true;
    });
  }

  export async function dismissBanner(
    tripId: string,
    userId: string,
    bannerKey: MilestoneBannerState['banner_key'],
    actionTaken: 'confirm' | 'dismiss' | 'save_now'
  ): Promise<void> {
    const now = new Date().toISOString();
    await supabase.from('milestone_banner_states').upsert(
      { trip_id: tripId, user_id: userId, banner_key: bannerKey, dismissed_at: now, action_taken: actionTaken },
      { onConflict: 'trip_id,user_id,banner_key' }
    );
  }

  export async function snoozeBanner(
    tripId: string,
    userId: string,
    bannerKey: MilestoneBannerState['banner_key']
  ): Promise<void> {
    // Snooze duration: 24 hours for milestone banners (spec Section 13)
    const resurface = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('milestone_banner_states').upsert(
      { trip_id: tripId, user_id: userId, banner_key: bannerKey, resurface_at: resurface },
      { onConflict: 'trip_id,user_id,banner_key' }
    );
  }
  ```

- [ ] Step 6: Commit
  ```bash
  git commit -m "feat: add database types and Supabase service layer for trips, events, days, tasks, and milestone banners"
  ```

---

### Task 2: Business Logic Utilities

**Files:**
- Create: `src/lib/eventTabVisibility.ts`
- Create: `src/lib/eventFieldConfig.ts`
- Create: `src/lib/freeTierCap.ts`
- Create: `src/lib/tripDays.ts`
- Create: `src/lib/asyncJobQueue.ts`
- Create: `src/lib/__tests__/eventTabVisibility.test.ts`
- Create: `src/lib/__tests__/freeTierCap.test.ts`
- Create: `src/lib/__tests__/eventFieldConfig.test.ts`

- [ ] Step 1: Create `src/lib/eventTabVisibility.ts` — pure function returning tab visibility per spec Section 14. This is the single source of truth used by `EventTabBar` and `EventScreen`.
  ```typescript
  import { EventCategory } from '../types/database';

  export interface TabVisibility {
    summary: boolean;
    tickets: boolean;
    transport: boolean;
    documents: boolean;
  }

  // Spec Section 14 tab visibility rules
  export function getTabVisibility(category: EventCategory): TabVisibility {
    return {
      summary: true, // always shown
      tickets:
        category === 'transport_air' ||
        category === 'transport_rail' ||
        category === 'transport_water' ||
        category === 'activity',
      transport:
        category === 'activity', // only Activity shows Transport tab (spec Section 14)
      documents:
        category !== 'rest' && category !== 'free_time', // excluded per spec Section 14
    };
  }
  ```

- [ ] Step 2: Create `src/lib/__tests__/eventTabVisibility.test.ts` — test every category against the expected result from spec Section 14.
  ```typescript
  import { getTabVisibility } from '../eventTabVisibility';

  describe('getTabVisibility', () => {
    it('transport_air: Summary, Tickets, Documents — no Transport', () => {
      const v = getTabVisibility('transport_air');
      expect(v).toEqual({ summary: true, tickets: true, transport: false, documents: true });
    });
    it('transport_road: Summary, Documents only — no Tickets, no Transport', () => {
      const v = getTabVisibility('transport_road');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: true });
    });
    it('transport_rail: Summary, Tickets, Documents', () => {
      const v = getTabVisibility('transport_rail');
      expect(v).toEqual({ summary: true, tickets: true, transport: false, documents: true });
    });
    it('transport_water: Summary, Tickets, Documents', () => {
      const v = getTabVisibility('transport_water');
      expect(v).toEqual({ summary: true, tickets: true, transport: false, documents: true });
    });
    it('accommodation: Summary, Documents — no Tickets, no Transport', () => {
      const v = getTabVisibility('accommodation');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: true });
    });
    it('activity: Summary, Tickets, Transport, Documents — all four tabs', () => {
      const v = getTabVisibility('activity');
      expect(v).toEqual({ summary: true, tickets: true, transport: true, documents: true });
    });
    it('meal: Summary, Documents only', () => {
      const v = getTabVisibility('meal');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: true });
    });
    it('rest: Summary only — no Tickets, Transport, or Documents', () => {
      const v = getTabVisibility('rest');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: false });
    });
    it('health: Summary, Documents', () => {
      const v = getTabVisibility('health');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: true });
    });
    it('free_time: Summary only', () => {
      const v = getTabVisibility('free_time');
      expect(v).toEqual({ summary: true, tickets: false, transport: false, documents: false });
    });
    it('shore_excursion: Summary, Tickets, Documents', () => {
      const v = getTabVisibility('shore_excursion');
      expect(v).toEqual({ summary: true, tickets: true, transport: false, documents: true });
    });
  });
  ```

- [ ] Step 3: Create `src/lib/freeTierCap.ts` — pure function and `src/lib/__tests__/freeTierCap.test.ts`. Cap is 3 events per day for authenticated free users (spec Section 13/22). Demo mode users are never capped — caller is responsible for passing `isDemoMode = true` when applicable.
  ```typescript
  // freeTierCap.ts
  export const FREE_TIER_EVENT_CAP = 3;

  export function isDayAtCap(eventCount: number, isPremium: boolean, isDemoMode = false): boolean {
    if (isDemoMode) return false;
    if (isPremium) return false;
    return eventCount >= FREE_TIER_EVENT_CAP;
  }
  ```
  ```typescript
  // freeTierCap.test.ts
  import { isDayAtCap } from '../freeTierCap';

  describe('isDayAtCap', () => {
    it('free user with 0 events: not at cap', () => expect(isDayAtCap(0, false)).toBe(false));
    it('free user with 2 events: not at cap', () => expect(isDayAtCap(2, false)).toBe(false));
    it('free user with 3 events: AT cap', () => expect(isDayAtCap(3, false)).toBe(true));
    it('free user with 4 events: AT cap', () => expect(isDayAtCap(4, false)).toBe(true));
    it('premium user with 3 events: NOT at cap', () => expect(isDayAtCap(3, true)).toBe(false));
    it('premium user with 10 events: NOT at cap', () => expect(isDayAtCap(10, true)).toBe(false));
    it('demo mode free user with 3 events: NOT capped', () => expect(isDayAtCap(3, false, true)).toBe(false));
  });
  ```

- [ ] Step 4: Create `src/lib/eventFieldConfig.ts` — defines the field list for each category + subcategory combination per spec Section 14. Returns an array of field descriptors consumed by `EventDetailFields.tsx`.
  ```typescript
  import { EventCategory } from '../types/database';

  export type FieldType = 'text' | 'textarea' | 'time' | 'date' | 'phone' | 'email';

  export interface FieldDescriptor {
    name: string; // maps to Event column or extra field in reservation_details jsonb
    label: string;
    type: FieldType;
    required?: boolean;
    placeholder?: string;
  }

  const COMMON_FIELDS: FieldDescriptor[] = [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'start_time', label: 'Start time', type: 'time' },
    { name: 'end_time', label: 'End time', type: 'time' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  export function getEventFields(category: EventCategory, subcategory?: string | null): FieldDescriptor[] {
    switch (category) {
      case 'transport_air':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'airline', label: 'Airline', type: 'text' },
          { name: 'flight_number', label: 'Flight number', type: 'text' },
          { name: 'start_time', label: 'Departure time', type: 'time' },
          { name: 'end_time', label: 'Arrival time', type: 'time' },
          { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'transport_road':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'provider', label: 'Provider', type: 'text' },
          { name: 'pickup_location', label: 'Pickup location', type: 'text' },
          { name: 'dropoff_location', label: 'Dropoff location', type: 'text' },
          { name: 'start_time', label: 'Pickup time', type: 'time' },
          { name: 'confirmation_number', label: 'Confirmation number', type: 'text' },
          { name: 'contact_phone', label: 'Provider phone', type: 'phone' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'transport_rail':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'operator', label: 'Operator', type: 'text' },
          { name: 'route', label: 'Route', type: 'text' },
          { name: 'start_time', label: 'Departure time', type: 'time' },
          { name: 'end_time', label: 'Arrival time', type: 'time' },
          { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'transport_water':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'operator', label: 'Operator', type: 'text' },
          { name: 'route', label: 'Route', type: 'text' },
          { name: 'start_time', label: 'Departure time', type: 'time' },
          { name: 'end_time', label: 'Arrival time', type: 'time' },
          { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'accommodation':
        return [
          { name: 'title', label: 'Property name', type: 'text', required: true },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'start_time', label: 'Check-in time', type: 'time' },
          { name: 'end_time', label: 'Check-out time', type: 'time' },
          { name: 'confirmation_number', label: 'Confirmation number', type: 'text' },
          { name: 'contact_name', label: 'Contact name', type: 'text' },
          { name: 'contact_phone', label: 'Contact phone', type: 'phone' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'activity':
        return [
          { name: 'title', label: 'Activity name', type: 'text', required: true },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'start_time', label: 'Start time', type: 'time' },
          { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'meal':
        return [
          { name: 'title', label: 'Restaurant / cafe name', type: 'text', required: true },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'start_time', label: 'Time', type: 'time' },
          { name: 'reservation_details', label: 'Reservation details', type: 'text' },
          // Dietary flags from user profile are displayed as a read-only reminder banner (not an input field)
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'rest':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'health':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'contact_name', label: 'Provider name', type: 'text' },
          { name: 'address', label: 'Address', type: 'text' },
          { name: 'start_time', label: 'Appointment time', type: 'time' },
          { name: 'contact_phone', label: 'Provider phone', type: 'phone' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'free_time':
        return [
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'address', label: 'Location (optional)', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      case 'shore_excursion': // cruise trips only (spec Section 14 / Section 26)
        return [
          { name: 'title', label: 'Excursion name', type: 'text', required: true },
          { name: 'address', label: 'Port', type: 'text' },
          { name: 'operator', label: 'Operator', type: 'text' },
          { name: 'start_time', label: 'Start time', type: 'time' },
          { name: 'duration', label: 'Duration', type: 'text' },
          { name: 'confirmation_number', label: 'Booking reference', type: 'text' },
          { name: 'meeting_point', label: 'Meeting point', type: 'text' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ];

      default:
        return COMMON_FIELDS;
    }
  }
  ```

- [ ] Step 5: Create `src/lib/__tests__/eventFieldConfig.test.ts` — verify all 11 categories return a non-empty field list and that category-specific required fields are present.
  ```typescript
  import { getEventFields } from '../eventFieldConfig';

  const ALL_CATEGORIES = [
    'transport_air', 'transport_road', 'transport_rail', 'transport_water',
    'accommodation', 'activity', 'meal', 'rest', 'health', 'free_time', 'shore_excursion',
  ] as const;

  describe('getEventFields', () => {
    it.each(ALL_CATEGORIES)('%s: returns at least one field with a title', (cat) => {
      const fields = getEventFields(cat);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.name === 'title')).toBe(true);
    });

    it('transport_air includes airline and flight_number', () => {
      const fields = getEventFields('transport_air');
      const names = fields.map((f) => f.name);
      expect(names).toContain('airline');
      expect(names).toContain('flight_number');
    });

    it('shore_excursion includes port, operator, meeting_point', () => {
      const fields = getEventFields('shore_excursion');
      const names = fields.map((f) => f.name);
      expect(names).toContain('operator');
      expect(names).toContain('meeting_point');
    });

    it('rest has only title and notes — no address, no times', () => {
      const fields = getEventFields('rest');
      const names = fields.map((f) => f.name);
      expect(names).not.toContain('address');
      expect(names).not.toContain('start_time');
    });
  });
  ```

- [ ] Step 6: Create `src/lib/tripDays.ts` — generate TripDay rows from a date range and format the day-tab label.
  ```typescript
  import { format, eachDayOfInterval, parseISO } from 'date-fns';
  import { TripDay } from '../types/database';

  export function generateTripDays(tripId: string, startDate: string, endDate: string): Omit<TripDay, 'id'>[] {
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    return days.map((date, index) => ({
      trip_id: tripId,
      day_number: index + 1,
      date: format(date, 'yyyy-MM-dd'),
    }));
  }

  /** Returns the three-line label shown on the left-side day tab: ["Day 3", "WED", "16/7"] */
  export function formatDayTabLabel(day: TripDay, dateFormat: string): [string, string, string] {
    const parsed = parseISO(day.date);
    const weekday = format(parsed, 'EEE').toUpperCase(); // "WED"
    // Use a simplified date for the tab — day/month without leading zeros
    const dayMonth = `${parsed.getDate()}/${parsed.getMonth() + 1}`;
    return [`Day ${day.day_number}`, weekday, dayMonth];
  }
  ```

- [ ] Step 7: Create `src/lib/asyncJobQueue.ts` — enqueue an async job row in `async_jobs`.
  ```typescript
  import { supabase } from './supabase';
  import { AsyncJob } from '../types/database';

  export async function enqueueJob(input: {
    type: AsyncJob['type'];
    input: Record<string, unknown>;
    trip_id?: string;
    event_id?: string;
    user_id: string;
  }): Promise<AsyncJob> {
    const { data, error } = await supabase
      .from('async_jobs')
      .insert({ ...input, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  ```

- [ ] Step 8: Run tests to confirm all pass.
  ```bash
  npx jest src/lib/__tests__/ --passWithNoTests
  ```

- [ ] Step 9: Commit
  ```bash
  git commit -m "feat: add event tab visibility, field config, free-tier cap utilities, and passing unit tests"
  ```

---

### Task 3: Home Screen

**Files:**
- Create: `app/(app)/index.tsx`
- Create: `src/components/trips/TripCard.tsx`
- Create: `src/components/trips/EmptyTripsState.tsx`

- [ ] Step 1: Create `src/components/trips/TripCard.tsx` — card component showing cover photo, trip name, destination summary, dates, and participant avatars. Accepts a `Trip` with eager-loaded `trip_destinations` and `trip_participants`. Tapping navigates to `/trips/[tripId]`.
  ```typescript
  import React from 'react';
  import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
  import { useRouter } from 'expo-router';
  import { Trip, TripDestination, TripParticipant } from '../../types/database';
  import { format, parseISO } from 'date-fns';

  interface Props {
    trip: Trip & { trip_destinations: TripDestination[]; trip_participants: TripParticipant[] };
  }

  export function TripCard({ trip }: Props) {
    const router = useRouter();
    const firstDest = trip.trip_destinations[0];
    const startDate = firstDest ? format(parseISO(firstDest.start_date), 'dd MMM yyyy') : '';
    const endDate = firstDest ? format(parseISO(firstDest.end_date), 'dd MMM yyyy') : '';
    const destinationLabel = trip.trip_destinations.map((d) => d.city).join(', ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/trips/${trip.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open trip ${trip.name}`}
      >
        {trip.cover_photo_url ? (
          <Image source={{ uri: trip.cover_photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]} />
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{trip.name}</Text>
          {destinationLabel ? <Text style={styles.destination}>{destinationLabel}</Text> : null}
          <Text style={styles.dates}>{startDate}{endDate ? ` - ${endDate}` : ''}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const styles = StyleSheet.create({
    card: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, backgroundColor: '#f0f0f0' },
    photo: { width: '100%', height: 160 },
    photoPlaceholder: { backgroundColor: '#d0d0d0' },
    info: { padding: 12 },
    name: { fontSize: 18, fontWeight: '600' },
    destination: { fontSize: 14, color: '#666', marginTop: 2 },
    dates: { fontSize: 12, color: '#999', marginTop: 4 },
  });
  ```

- [ ] Step 2: Create `src/components/trips/EmptyTripsState.tsx` — empty state shown when the user has no trips. Includes a headline, subtext, and a "Create your first trip" button that navigates to `/trips/create`.
  ```typescript
  import React from 'react';
  import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
  import { useRouter } from 'expo-router';

  export function EmptyTripsState() {
    const router = useRouter();
    return (
      <View style={styles.container}>
        <Text style={styles.headline}>No trips yet</Text>
        <Text style={styles.subtext}>Tap the button below to plan your first adventure.</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/trips/create')}>
          <Text style={styles.ctaText}>Create your first trip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    headline: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    subtext: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
    cta: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
  ```

- [ ] Step 3: Create `app/(app)/index.tsx` — Home screen. Fetches active trips via `listActiveTrips`. Shows `EmptyTripsState` when list is empty. Renders a `FlatList` of `TripCard` components otherwise. Header right: settings gear (stub navigation). + button in bottom tab bar navigates to `/trips/create` per spec Section 8.
  ```typescript
  import React, { useEffect, useState } from 'react';
  import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
  import { useLocalSearchParams } from 'expo-router';
  import { TripCard } from '../../src/components/trips/TripCard';
  import { EmptyTripsState } from '../../src/components/trips/EmptyTripsState';
  import { listActiveTrips } from '../../src/services/trips';
  import { useAuth } from '../../src/hooks/useAuth'; // from Plan 1

  export default function HomeScreen() {
    const { user } = useAuth();
    const [trips, setTrips] = useState<Awaited<ReturnType<typeof listActiveTrips>>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (!user) return;
      listActiveTrips(user.id)
        .then(setTrips)
        .finally(() => setLoading(false));
    }, [user]);

    if (loading) return <ActivityIndicator style={styles.loader} />;
    if (trips.length === 0) return <EmptyTripsState />;

    return (
      <View style={styles.container}>
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TripCard trip={item as any} />}
          contentContainerStyle={styles.list}
        />
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { padding: 16 },
    loader: { flex: 1 },
  });
  ```

- [ ] Step 4: Commit
  ```bash
  git commit -m "feat: add Home screen with TripCard list and EmptyTripsState"
  ```

---

### Task 4: Create Trip Flow

**Files:**
- Create: `app/(app)/trips/create.tsx`

- [ ] Step 1: Scaffold the multi-step form component with a step counter (steps 1-4: name, destinations+dates, family members, cruise toggle). Use `useState` for step tracking and React Hook Form for each step's fields.
  ```typescript
  import React, { useState } from 'react';
  import { View, Text, StyleSheet, ScrollView } from 'react-native';
  import { useRouter } from 'expo-router';
  import { useForm, Controller } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import * as z from 'zod';
  // Steps are rendered conditionally based on `step` state variable

  type Step = 1 | 2 | 3 | 4;
  ```

- [ ] Step 2: Implement Step 1 — trip name input. Auto-focus the text field. "Next" button validates the field is non-empty before advancing.
  ```typescript
  // Inside CreateTripScreen — Step 1 fragment
  const step1Schema = z.object({ name: z.string().min(1, 'Trip name is required') });

  function Step1({ onNext }: { onNext: (name: string) => void }) {
    const { control, handleSubmit, formState: { errors } } = useForm({
      resolver: zodResolver(step1Schema),
    });
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What is your trip called?</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="e.g. Paris Summer 2027"
              value={value}
              onChangeText={onChange}
              autoFocus
            />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
        <Button title="Next" onPress={handleSubmit(({ name }) => onNext(name))} />
      </View>
    );
  }
  ```

- [ ] Step 3: Implement Step 2 — destination(s) + dates. Single destination by default; "Add another destination" checkbox reveals a second row. Each destination row: city text input, country text input, start date picker, end date picker. Use `@react-native-community/datetimepicker` for date inputs.

- [ ] Step 4: Implement Step 3 — family member selector. Load family group members from Supabase (`family_group_members` joined with `users` and `guest_profiles` for the current user's owned group). Render each as a row with avatar thumbnail + first name + checkbox toggle. "+" at end of list is a stub (shows "Coming soon" toast for now — full invitation flow is out of scope for this plan).

- [ ] Step 5: Implement Step 4 — cruise toggle. Two options: "No" (default) and "Yes". If "Yes", show additional fields: cruise company, ship name, departure port, destination port, stops (textarea), package inclusions (textarea). All cruise fields optional for now. "Create trip" button on this step triggers save.

- [ ] Step 6: Implement the `handleCreateTrip` function called when the user taps "Create trip". This must:
  1. Compute the Treasure Map layout synchronously (random seed + derived tile positions; write to `trips.treasure_map_layout`) — spec Section 12 step 6.
  2. Insert the trip row via `createTrip`.
  3. Insert `trip_destinations` rows.
  4. Insert `trip_participants` row for the current user.
  5. Generate `trip_days` rows via `generateTripDays` and insert via `createTripDays`.
  6. Enqueue `cover_photo_fetch` async job for all users.
  7. Navigate to `/trips/[tripId]` on success.
  ```typescript
  async function handleCreateTrip(formData: FormData) {
    const layout = computeTreasureMapLayout(); // generates random seed + tile positions
    const trip = await createTrip({
      name: formData.name,
      is_cruise: formData.isCruise,
      cruise_details: formData.isCruise ? formData.cruiseDetails : undefined,
      treasure_map_layout: layout,
      owner_user_id: user.id,
    });
    await insertTripDestinations(trip.id, formData.destinations);
    await insertTripParticipant(trip.id, user.id);
    const days = generateTripDays(trip.id, formData.destinations[0].start_date, formData.destinations[formData.destinations.length - 1].end_date);
    await createTripDays(trip.id, days);
    await enqueueJob({ type: 'cover_photo_fetch', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
    // [C2 — Premium async jobs on trip save]
    if (isPremium) {
      // AI task suggestions (premium only)
      await enqueueJob({ type: 'pre_trip_checklist_generate', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
      // Imagen 3 treasure map background generation (premium only)
      await enqueueJob({ type: 'treasure_map_generate', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
      // AI packing suggestions at trip scope — no event_id, no trip_day_id (premium only)
      await enqueueJob({ type: 'in_the_bag_suggest', input: { trip_id: trip.id }, trip_id: trip.id, user_id: user.id });
    }
    router.replace(`/trips/${trip.id}`);
  }

  // Stub for layout generation — full Skia implementation is Plan 4 (Treasure Map)
  function computeTreasureMapLayout(): Record<string, unknown> {
    const seed = Math.random().toString(36).slice(2);
    return { seed, tiles: [], paths: [] };
  }
  ```

- [ ] Step 7: Commit
  ```bash
  git commit -m "feat: add Create Trip multi-step flow with destinations, family selector, cruise toggle, and async job queuing stubs"
  ```

---

### Task 5: Trip Screen Shell and Summary Tab

**Files:**
- Create: `app/(app)/trips/[tripId]/index.tsx`
- Create: `app/(app)/trips/[tripId]/summary.tsx`
- Create: `src/components/trips/CoverPhotoHeader.tsx`
- Create: `src/components/trips/MilestoneBanner.tsx`
- Create: `src/components/trips/MilestoneBannerList.tsx`
- Create: `src/components/trips/PreTripChecklist.tsx`
- Create: `src/components/trips/DayTabBar.tsx`

- [ ] Step 1: Create `src/components/trips/DayTabBar.tsx` — left-side vertical tab bar per spec Section 13. Renders one tab per `TripDay` showing three lines: "Day N", weekday abbreviation, date. Active tab highlighted with a solid accent colour; inactive tabs dimmed. Uses a `ScrollView` so long trips scroll. Accepts `days`, `activeDayId`, and `onSelectDay` props.
  ```typescript
  import React from 'react';
  import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
  import { TripDay } from '../../types/database';
  import { formatDayTabLabel } from '../../lib/tripDays';

  interface Props {
    days: TripDay[];
    activeDayId: string | null;
    onSelectDay: (day: TripDay) => void;
    userDateFormat?: string;
  }

  export function DayTabBar({ days, activeDayId, onSelectDay, userDateFormat = 'dd/MM' }: Props) {
    return (
      <ScrollView style={styles.tabBar} showsVerticalScrollIndicator={false}>
        {days.map((day) => {
          const [dayLabel, weekday, date] = formatDayTabLabel(day, userDateFormat);
          const isActive = day.id === activeDayId;
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectDay(day)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.dayLabel, isActive && styles.activeText]}>{dayLabel}</Text>
              <Text style={[styles.weekday, isActive && styles.activeText]}>{weekday}</Text>
              <Text style={[styles.date, isActive && styles.activeText]}>{date}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    tabBar: { width: 64, backgroundColor: '#f8f8f8', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#ddd' },
    tab: { paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
    tabActive: { backgroundColor: '#007AFF' },
    dayLabel: { fontSize: 10, fontWeight: '700', color: '#333' },
    weekday: { fontSize: 9, color: '#555', marginTop: 1 },
    date: { fontSize: 9, color: '#555', marginTop: 1 },
    activeText: { color: '#fff' },
  });
  ```

- [ ] Step 2: Create `app/(app)/trips/[tripId]/index.tsx` — Trip screen shell. Loads trip + days. Renders a two-column layout: `DayTabBar` on the left, content area on the right. The "Summary" pseudo-tab is the first item in the tab bar (or a separate header button — designer choice; implement as a button above the day tabs). Manages `activeView` state: `'summary'` or a `TripDay` id.

- [ ] Step 3: Create `src/components/trips/CoverPhotoHeader.tsx` — displays the cover photo (or placeholder) in a tall header with trip name, destination, dates, and participant avatar strip overlaid. Listens for Supabase Realtime updates to `trips.cover_photo_url` to swap placeholder for real photo when the `cover_photo_fetch` job completes.
  ```typescript
  // Realtime subscription pattern (spec Section 3)
  useEffect(() => {
    const channel = supabase
      .channel(`trip-cover-${tripId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        (payload) => {
          if (payload.new.cover_photo_url) setCoverUrl(payload.new.cover_photo_url);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId]);
  ```

- [ ] Step 4: Create `src/components/trips/MilestoneBanner.tsx` — renders a single banner card. Props: `bannerKey`, `tripStartDate`, `onConfirm`, `onDismiss`, `onSnooze` (optional — `visa_14d` has no snooze per spec Section 6). Determines whether the banner should be visible based on the days-until-departure calculation. Reads the banner copy map:
  - `insurance_30d`: "Have you organised travel insurance?" — Confirm + Remind Me Later
  - `visa_14d`: "Confirm your visa and immigration requirements" — Confirm ("I've sorted this") + Dismiss ("Not applicable to me")
  - `esim_7d`: "Organise an e-SIM so you're online when you land" — Confirm + Remind Me Later
  - `offline_docs_7d`: "Save critical documents for offline access" — Save Now + Later
  - `wifi_day_of`: "Connect to airport WiFi as soon as you land" — dismiss only

- [ ] Step 5: Create `src/components/trips/MilestoneBannerList.tsx` — queries and renders the visible banner stack. Implement the following steps explicitly in order: **[C5 — Banner threshold gating]**
  1. Compute `daysUntilDeparture` from `Math.ceil((parseISO(tripStartDate) - new Date()) / 86400000)`.
  2. Define the five banner trigger windows:
     - `insurance_30d`: visible when `daysUntilDeparture <= 30`
     - `visa_14d`: visible when `daysUntilDeparture <= 14`
     - `esim_7d`: visible when `daysUntilDeparture <= 7`
     - `offline_docs_7d`: visible when `daysUntilDeparture <= 7`
     - `wifi_day_of`: visible when `daysUntilDeparture <= 0`
  3. Filter the five banner keys down to those whose window condition is met, producing `windowActiveBanners`.
  4. Call `getVisibleBanners(tripId, userId)` to obtain the dismiss/snooze state for each banner from Supabase.
  5. Cross-reference: only render banners that are both in `windowActiveBanners` AND not filtered out by `getVisibleBanners` (i.e. not dismissed and not currently snoozed).
  6. Render the resulting subset as a stack of `MilestoneBanner` components.
  7. Pass `onDismiss` → `dismissBanner`, `onSnooze` → `snoozeBanner` callbacks and refresh the visible list after each mutation.

- [ ] Step 6: Create `src/components/trips/PreTripChecklist.tsx` — renders My Tasks section. Shows a list of `TripTask` rows (from `listMyTasks`). Each row: checkbox + title. Tapping checkbox calls `toggleTaskComplete`. A small inline "+" button at the bottom of the list opens a modal text input to add a new task via `addManualTask`. Free users see only this section. Premium Suggested Tasks section is a stub (`{/* AI Suggested Tasks — Plan 3 */}`) commented placeholder.

- [ ] Step 7: Create `app/(app)/trips/[tripId]/summary.tsx` — assembles `CoverPhotoHeader`, `MilestoneBannerList`, `PreTripChecklist`, and a share icon stub (right of header — tapping shows "Coming soon" toast). `Offline Documents` button is shown only when a local MMKV flag `offline_save_done_${tripId}` is truthy — button is hidden by default (spec Section 24). **[C4]** The key must be `offline_save_done_${tripId}` (not `offline_docs_saved_${tripId}`) to match the spec Section 24 definition and Plan 9's implementation.

- [ ] Step 8: Commit
  ```bash
  git commit -m "feat: add Trip screen shell, Summary tab with cover photo header, milestone banners, and pre-trip checklist"
  ```

---

### Task 6: Day Tab & Event List

**Files:**
- Create: `app/(app)/trips/[tripId]/day/[dayId].tsx`
- Create: `src/components/events/EventTile.tsx`
- Create: `src/components/events/EventStackedRow.tsx`
- Create: `src/components/events/EventList.tsx`
- Create: `src/components/common/DisplayStyleToggle.tsx`

- [ ] Step 1: Create `src/components/common/DisplayStyleToggle.tsx` — segmented control with two segments: "Tiles" and "Stacked". Treasure Map segment is deliberately excluded from this component in this plan (added in Plan 4). Accepts `value` prop (`'tiles' | 'stacked'`) and `onChange` callback. Persists user preference to MMKV key `trip_display_style_${tripId}`.
  ```typescript
  import React from 'react';
  import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
  import { storage } from '../../lib/storage'; // MMKV instance from Plan 1

  type DisplayStyle = 'tiles' | 'stacked';

  interface Props {
    tripId: string;
    value: DisplayStyle;
    onChange: (style: DisplayStyle) => void;
  }

  export function DisplayStyleToggle({ tripId, value, onChange }: Props) {
    const options: { label: string; value: DisplayStyle }[] = [
      { label: 'Tiles', value: 'tiles' },
      { label: 'Stacked', value: 'stacked' },
    ];
    return (
      <View style={styles.container}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, value === opt.value && styles.active]}
            onPress={() => {
              storage.set(`trip_display_style_${tripId}`, opt.value);
              onChange(opt.value);
            }}
          >
            <Text style={[styles.label, value === opt.value && styles.activeLabel]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#007AFF' },
    segment: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: '#fff' },
    active: { backgroundColor: '#007AFF' },
    label: { fontSize: 13, color: '#007AFF' },
    activeLabel: { color: '#fff' },
  });
  ```

- [ ] Step 2: Create `src/components/events/EventTile.tsx` — card-style event display for Tiles mode. Shows: category icon, event title, start time, subcategory label. Tapping navigates to `/trips/[tripId]/events/[eventId]`. Category icon is a simple text label for now (full icon set is a polish task).

- [ ] Step 3: Create `src/components/events/EventStackedRow.tsx` — horizontal row for Stacked mode. Shows: coloured category strip on left, event title, time range. Tapping navigates to the event screen.

- [ ] Step 4: Create `src/components/events/EventList.tsx` — renders events using the appropriate sub-component based on `displayStyle` prop. Handles the empty state ("No events yet — tap + to add one").
  ```typescript
  import React from 'react';
  import { FlatList, View, Text } from 'react-native';
  import { Event } from '../../types/database';
  import { EventTile } from './EventTile';
  import { EventStackedRow } from './EventStackedRow';

  interface Props {
    events: Event[];
    displayStyle: 'tiles' | 'stacked';
    tripId: string;
  }

  export function EventList({ events, displayStyle, tripId }: Props) {
    if (events.length === 0) {
      return <View><Text>No events yet — tap + to add one.</Text></View>;
    }
    return (
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) =>
          displayStyle === 'tiles'
            ? <EventTile event={item} tripId={tripId} />
            : <EventStackedRow event={item} tripId={tripId} />
        }
        contentContainerStyle={{ padding: 8 }}
      />
    );
  }
  ```

- [ ] Step 5: Create `app/(app)/trips/[tripId]/day/[dayId].tsx` — Day tab screen. Fetches events for the day via `listEventsForDay`. Renders `DisplayStyleToggle` in the header, then `EventList`. The tab-bar `+` button triggers navigation to the Add to Day sheet with `dayId` as a param.

- [ ] Step 6: Commit
  ```bash
  git commit -m "feat: add Day tab screen with event list, Tiles/Stacked display toggle, and empty state"
  ```

---

### Task 7: Add to Day Sheet & Free-Tier Cap

**Files:**
- Create: `src/components/sheets/AddToDaySheet.tsx`
- Create: `src/components/events/CategoryPicker.tsx`
- Create: `src/components/events/SubcategoryPicker.tsx`

- [ ] Step 1: Create `src/components/events/CategoryPicker.tsx` — grid of category buttons. Receives `isCruise: boolean` prop; when `false`, filters out `shore_excursion` (spec Section 6 `is_cruise_only` flag). Categories: Transport (Air / Road / Rail / Water), Accommodation, Activity, Meal, Rest, Health, Free Time, Shore Excursion (cruise only). "Add with AI" button at top is rendered greyed-out with a "Premium" badge stub for now.
  ```typescript
  const CATEGORIES: { id: EventCategory; label: string; isCruiseOnly: boolean }[] = [
    { id: 'transport_air', label: 'Transport — Air', isCruiseOnly: false },
    { id: 'transport_road', label: 'Transport — Road', isCruiseOnly: false },
    { id: 'transport_rail', label: 'Transport — Rail', isCruiseOnly: false },
    { id: 'transport_water', label: 'Transport — Water', isCruiseOnly: false },
    { id: 'accommodation', label: 'Accommodation', isCruiseOnly: false },
    { id: 'activity', label: 'Activity', isCruiseOnly: false },
    { id: 'meal', label: 'Meal', isCruiseOnly: false },
    { id: 'rest', label: 'Rest', isCruiseOnly: false },
    { id: 'health', label: 'Health', isCruiseOnly: false },
    { id: 'free_time', label: 'Free Time', isCruiseOnly: false },
    { id: 'shore_excursion', label: 'Shore Excursion', isCruiseOnly: true },
  ];
  ```

- [ ] Step 2: Create `src/components/events/SubcategoryPicker.tsx` — list of subcategory options for a given category. Subcategories for each category (spec Section 14):
  - `transport_road`: Car hire, Taxi, Shuttle, Bus, Self-drive
  - `transport_rail`: Train, Tram, Metro
  - `transport_water`: Ferry, Cruise leg, Water taxi
  - `accommodation`: Hotel, Airbnb, Resort, Hostel, Other
  - `activity`: Theme park, Show, Sightseeing, Sporting event, Exhibition, Tour, Other
  - `meal`: Restaurant, Cafe, Food tour
  - `health`: Appointment, Pharmacy, Medical
  - All other categories: no subcategories (skip this step, go straight to detail)
  Renders as a plain list; tapping an item calls `onSelect(subcategory)`.

- [ ] Step 3: Create `src/components/sheets/AddToDaySheet.tsx` — multi-step bottom sheet (using `@gorhom/bottom-sheet`). Step order per spec Section 13: (1) Cap check, (2) Category picker, (3) Subcategory picker (if applicable), (4) Detail sheet. If cap is hit, renders the upgrade prompt UI instead of the category picker. Sheet is opened from the Day tab `+` button.
  ```typescript
  type SheetStep = 'cap_check' | 'category' | 'subcategory' | 'detail' | 'upgrade_prompt';

  export function AddToDaySheet({ tripDayId, tripId, isCruise, isPremium, isDemoMode, onClose, onEventCreated }) {
    const [step, setStep] = useState<SheetStep>('cap_check');
    const [category, setCategory] = useState<EventCategory | null>(null);
    const [subcategory, setSubcategory] = useState<string | null>(null);

    // Cap check on mount (Add to Day: day is pre-selected, check immediately)
    useEffect(() => {
      countEventsForDay(tripDayId).then((count) => {
        if (isDayAtCap(count, isPremium, isDemoMode)) {
          setStep('upgrade_prompt');
        } else {
          setStep('category');
        }
      });
    }, [tripDayId]);

    // ... render step content
  }
  ```

- [ ] Step 4: Add the "upgrade prompt" step UI — shows the 3-event cap message with "Upgrade to Premium" and "Maybe Later" buttons. "Upgrade to Premium" is a stub (shows "Coming soon" toast). "Maybe Later" closes the sheet.

- [ ] Step 5: Commit
  ```bash
  git commit -m "feat: add Add to Day sheet with category picker, subcategory picker, and free-tier 3-event cap enforcement"
  ```

---

### Task 8: Add to Whole Trip Sheet

**Files:**
- Create: `src/components/sheets/AddToWholeTripSheet.tsx`

- [ ] Step 1: Create `src/components/sheets/AddToWholeTripSheet.tsx`. Step order per spec Section 13 (different from Add to Day): (1) Day picker, (2) Cap check for selected day, (3) Category picker, (4) Subcategory picker, (5) Detail sheet. The day picker shows a list of `TripDay` rows for the trip; the user selects which day before proceeding.
  ```typescript
  type SheetStep = 'day_picker' | 'cap_check' | 'category' | 'subcategory' | 'detail' | 'upgrade_prompt';

  export function AddToWholeTripSheet({ tripId, days, isCruise, isPremium, isDemoMode, onClose, onEventCreated }) {
    const [step, setStep] = useState<SheetStep>('day_picker');
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
    const [category, setCategory] = useState<EventCategory | null>(null);
    const [subcategory, setSubcategory] = useState<string | null>(null);

    async function handleDaySelected(dayId: string) {
      setSelectedDayId(dayId);
      const count = await countEventsForDay(dayId);
      if (isDayAtCap(count, isPremium, isDemoMode)) {
        setStep('upgrade_prompt');
      } else {
        setStep('category');
      }
    }

    // ...render per step
  }
  ```

- [ ] Step 2: Implement the day picker step — renders `TripDay` rows as selectable list items showing the same "Day N / Weekday / Date" label as the tab bar. Tapping a day calls `handleDaySelected`.

- [ ] Step 3: Wire `AddToWholeTripSheet` to the tab-bar `+` button on the Summary tab (spec Section 8).

- [ ] Step 4: Commit
  ```bash
  git commit -m "feat: add Add to Whole Trip sheet with day picker first, then cap check, matching spec Section 13 step order"
  ```

---

### Task 9: Event Detail Sheet

**Files:**
- Create: `src/components/sheets/EventDetailSheet.tsx`
- Create: `src/components/events/EventDetailFields.tsx`

- [ ] Step 1: Create `src/components/events/EventDetailFields.tsx` — given `category` and `subcategory` props, calls `getEventFields` and renders each `FieldDescriptor` as the appropriate input component (`TextInput` for text/phone/email, `TimePicker` for time fields, `TextInput multiline` for textarea). Uses React Hook Form's `Controller` for each field.
  ```typescript
  import React from 'react';
  import { View, Text, TextInput, StyleSheet } from 'react-native';
  import { Control, Controller } from 'react-hook-form';
  import { getEventFields, FieldDescriptor } from '../../lib/eventFieldConfig';
  import { EventCategory } from '../../types/database';

  interface Props {
    category: EventCategory;
    subcategory?: string | null;
    control: Control<any>;
    errors: Record<string, any>;
  }

  export function EventDetailFields({ category, subcategory, control, errors }: Props) {
    const fields = getEventFields(category, subcategory);
    return (
      <View>
        {fields.map((field) => (
          <View key={field.name} style={styles.fieldRow}>
            <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
            <Controller
              control={control}
              name={field.name}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, field.type === 'textarea' && styles.textarea]}
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder={field.placeholder ?? ''}
                  multiline={field.type === 'textarea'}
                  numberOfLines={field.type === 'textarea' ? 3 : 1}
                  keyboardType={field.type === 'phone' ? 'phone-pad' : field.type === 'email' ? 'email-address' : 'default'}
                />
              )}
            />
            {errors[field.name] && <Text style={styles.error}>{errors[field.name]?.message}</Text>}
          </View>
        ))}
      </View>
    );
  }

  const styles = StyleSheet.create({
    fieldRow: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    textarea: { height: 80, textAlignVertical: 'top' },
    error: { color: 'red', fontSize: 12, marginTop: 2 },
  });
  ```

- [ ] Step 2: Add a dietary reminder banner inside `EventDetailFields` when `category === 'meal'`. Read the current user's `dietary_requirements` and `food_allergies` from the auth context (Plan 1). If populated, show a read-only reminder strip: "Reminder: [dietary requirements] — [food allergies]". This is informational only; no input needed.

- [ ] Step 3: Create `src/components/sheets/EventDetailSheet.tsx` — the final step in both Add to Day and Add to Whole Trip flows. Wraps `EventDetailFields` in a scrollable bottom sheet. "Save" button submits via `handleSubmit`:
  1. Validates required fields.
  2. Calls `createEvent` with the form values, `trip_day_id`, `trip_id`, `category`, and `subcategory`.
  3. Calls `onEventCreated(newEvent)` callback to refresh the parent list.
  4. Closes the sheet.
  5. **[C1 — Premium async job]** After a successful `createEvent` call, if `isPremium && !isDemoMode()`, enqueue an AI packing suggestions job:
     ```typescript
     if (isPremium && !isDemoMode()) {
       await enqueueJob({
         type: 'in_the_bag_suggest',
         input: { event_id: newEvent.id, trip_id, trip_day_id },
         event_id: newEvent.id,
         trip_id,
         user_id: user.id,
       });
     }
     ```
     This is premium-only per spec. Free and demo-mode users do not trigger AI packing suggestions on event save.

- [ ] Step 4: Wire `EventDetailSheet` as the final step in both `AddToDaySheet` and `AddToWholeTripSheet`.

- [ ] Step 5: Commit
  ```bash
  git commit -m "feat: add EventDetailSheet with dynamic field rendering for all 11 event categories"
  ```

---

### Task 10: Event Screen

**Files:**
- Create: `app/(app)/trips/[tripId]/events/[eventId]/index.tsx`
- Create: `app/(app)/trips/[tripId]/events/[eventId]/summary.tsx`
- Create: `app/(app)/trips/[tripId]/events/[eventId]/tickets.tsx`
- Create: `app/(app)/trips/[tripId]/events/[eventId]/transport.tsx`
- Create: `app/(app)/trips/[tripId]/events/[eventId]/documents.tsx`
- Create: `src/components/events/EventTabBar.tsx`
- Create: `src/components/sheets/AddTransportInlineSheet.tsx`

- [ ] Step 1: Create `src/components/events/EventTabBar.tsx` — horizontal tab bar. Accepts `category` prop; calls `getTabVisibility(category)` to determine which tabs to render. Renders only the tabs that are `true` in the result. Active tab underlined with accent colour.
  ```typescript
  import React from 'react';
  import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
  import { EventCategory } from '../../types/database';
  import { getTabVisibility } from '../../lib/eventTabVisibility';

  type TabKey = 'summary' | 'tickets' | 'transport' | 'documents';

  const TAB_LABELS: Record<TabKey, string> = {
    summary: 'Summary',
    tickets: 'Tickets',
    transport: 'Transport',
    documents: 'Documents',
  };

  interface Props {
    category: EventCategory;
    activeTab: TabKey;
    onSelectTab: (tab: TabKey) => void;
  }

  export function EventTabBar({ category, activeTab, onSelectTab }: Props) {
    const visibility = getTabVisibility(category);
    const visibleTabs = (Object.keys(TAB_LABELS) as TabKey[]).filter((key) => visibility[key]);
    return (
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => onSelectTab(tab)}
          >
            <Text style={[styles.label, activeTab === tab && styles.activeLabel]}>{TAB_LABELS[tab]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const styles = StyleSheet.create({
    tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
    label: { fontSize: 14, color: '#666' },
    activeLabel: { color: '#007AFF', fontWeight: '600' },
  });
  ```

- [ ] Step 2: Create `app/(app)/trips/[tripId]/events/[eventId]/index.tsx` — Event screen shell. Fetches the event by id. Renders `EventTabBar` with correct `category`. Manages `activeTab` state; defaults to `'summary'`. Renders the active tab content component. Tab-bar `+` button: stub "Add document" action. Floating backpack icon: stub (Plan 3).

- [ ] Step 3: Create `app/(app)/trips/[tripId]/events/[eventId]/summary.tsx` — Summary tab. Renders all event fields in read-only mode. "Edit" button opens `EventDetailSheet` pre-filled with current event data; on save calls `updateEvent`. Shows participant list (stub — just user count for now).

- [ ] Step 4: Create `app/(app)/trips/[tripId]/events/[eventId]/tickets.tsx` — Tickets tab (stub). Shows a placeholder message "Upload tickets or scan QR codes" with three buttons: "Upload from library", "Take photo", "Scan". All three show "Coming soon" toast for now.

- [ ] Step 5: Create `app/(app)/trips/[tripId]/events/[eventId]/documents.tsx` — Documents tab (stub). Same placeholder and upload buttons as Tickets tab. "Coming soon" toast.

- [ ] Step 6: Create `src/components/sheets/AddTransportInlineSheet.tsx` — compact modal for creating a transport event from the Activity event Transport tab (spec Section 15). Shows: (1) transport subcategory selector (Road / Air / Rail / Water), (2) fields that adapt per subcategory (per spec: Road → provider + pickup + start time; Air → airline + flight number + start time; Rail → operator + route + start time; Water → operator + route + start time). On save, creates the event via `createEvent` and writes its id to `events.linked_transport_event_id` on the parent Activity event via `updateEvent`.

- [ ] Step 7: Create `app/(app)/trips/[tripId]/events/[eventId]/transport.tsx` — Transport tab (only shown for Activity category). Fetches that day's Transport-category events via `listEventsForDay` filtered to transport categories. Renders them as tappable cards to link. "Create new transport event" button opens `AddTransportInlineSheet`.
  ```typescript
  // Filter transport events on the same day
  const transportEvents = events.filter((e) =>
    ['transport_air', 'transport_road', 'transport_rail', 'transport_water'].includes(e.category)
  );
  ```

- [ ] Step 8: Commit
  ```bash
  git commit -m "feat: add Event screen with conditional tab bar, Summary/Tickets/Transport/Documents tabs, and inline transport creation"
  ```

---

### Task 11: Trip History Screen

**Files:**
- Create: `app/(app)/history.tsx`

- [ ] Step 1: Create `app/(app)/history.tsx` — reads past trips via `listPastTrips`. Renders a `FlatList` of `TripCard` components. On tap, navigates to `/trips/[tripId]` but the screen must open in read-only mode. Pass a `readOnly` query param: `/trips/${id}?readOnly=true`.

- [ ] Step 2: In `app/(app)/trips/[tripId]/index.tsx`, read the `readOnly` param from `useLocalSearchParams`. When `readOnly === 'true'`: hide the `+` button and hide "Edit" buttons on the Summary and Event screens. Show a "This trip is in the past" banner at the top. **[M7 — Read-only derived from trip end date, not only URL param]** Read-only mode must also be enforced by checking the trip's own end date, so that deep-linked past trips (e.g. from push notifications) open in read-only mode even without the `readOnly` query param:
  ```typescript
  const { readOnly: readOnlyParam } = useLocalSearchParams<{ readOnly?: string }>();
  // Also compute from trip data once loaded
  const tripMaxEnd = trip?.trip_destinations
    ? trip.trip_destinations.reduce((max, d) => (d.end_date > max ? d.end_date : max), '')
    : '';
  const isPastTrip = tripMaxEnd !== '' && tripMaxEnd < new Date().toISOString().split('T')[0];
  const isReadOnly = readOnlyParam === 'true' || isPastTrip;
  ```
  Use `isReadOnly` (not `readOnlyParam`) throughout the Trip screen shell and child screens.

- [ ] Step 3: Wire the Trip History screen to `Profile > Trip History` entry point (modify `app/(app)/profile/index.tsx` or equivalent from Plan 1 to add a "Trip History" row that navigates to `/history`).

- [ ] Step 4: Commit
  ```bash
  git commit -m "feat: add Trip History screen with read-only past trips list"
  ```

---

### Task 12: Integration Test Pass & Wiring

**Files:**
- Create: `src/services/__tests__/trips.test.ts`
- Create: `src/services/__tests__/events.test.ts`

- [ ] Step 1: Create `src/services/__tests__/trips.test.ts` — integration tests against a Supabase test project (or local Supabase via `supabase start`). Test `createTrip`, `listActiveTrips`, `listPastTrips`. Use a test user seeded in the `users` table.
  ```typescript
  // Requires SUPABASE_URL and SUPABASE_ANON_KEY in .env.test
  describe('trips service', () => {
    it('createTrip writes a row and returns it', async () => { /* ... */ });
    it('listActiveTrips excludes past trips', async () => { /* ... */ });
    it('listPastTrips excludes future trips', async () => { /* ... */ });
  });
  ```

- [ ] Step 2: Create `src/services/__tests__/events.test.ts` — test `createEvent`, `listEventsForDay`, `countEventsForDay`. Verify that `countEventsForDay` returns the correct count used by cap enforcement.

- [ ] Step 3: Run all tests.
  ```bash
  npx jest --passWithNoTests
  ```

- [ ] Step 4: Verify navigation end-to-end: Home → Create Trip → Trip Summary → Day tab → Add to Day → Event → Edit Event → back. Fix any broken imports or missing route params.

- [ ] Step 5: Final commit
  ```bash
  git commit -m "feat: add service integration tests and fix end-to-end navigation wiring for trip and event core"
  ```

---

## Self-Review Checklist

- [x] All 11 event categories present: `transport_air`, `transport_road`, `transport_rail`, `transport_water`, `accommodation`, `activity`, `meal`, `rest`, `health`, `free_time`, `shore_excursion`
- [x] `shore_excursion` correctly gated to cruise trips only via `isCruiseOnly` filter in `CategoryPicker`
- [x] Tab visibility per spec Section 14:
  - `transport_air`: Summary + Tickets + Documents (no Transport) ✓
  - `transport_road`: Summary + Documents only (no Tickets, no Transport) ✓
  - `transport_rail`: Summary + Tickets + Documents ✓
  - `transport_water`: Summary + Tickets + Documents ✓
  - `accommodation`: Summary + Documents (no Tickets — spec note: QR codes go to Documents, not Tickets) ✓
  - `activity`: Summary + Tickets + Transport + Documents (all four) ✓
  - `meal`: Summary + Documents ✓
  - `rest`: Summary only ✓
  - `health`: Summary + Documents ✓
  - `free_time`: Summary only ✓
  - `shore_excursion`: Summary + Tickets + Documents ✓
- [x] Add to Whole Trip step order: day picker → cap check → category → subcategory → detail (spec Section 13) ✓
- [x] Add to Day step order: cap check (day pre-selected) → category → subcategory → detail (spec Section 13) ✓
- [x] Free tier cap at 3 events per day; demo mode bypasses cap ✓
- [x] Milestone banners with correct snooze rules: `visa_14d` no snooze; others snooze 24h (spec Section 6) ✓
- [x] Cover photo placeholder shown immediately; Realtime update when async job completes ✓
- [x] Treasure Map layout computed synchronously at trip save and stored; Imagen 3 job queued async ✓
- [x] Trip History screen opens in read-only mode ✓
- [x] No emojis anywhere in UI copy (spec Section 7) ✓
- [x] All steps estimated at 2-5 minutes each ✓
- [x] Each task ends with a git commit ✓

---

## Review Fixes Applied

The following fixes were applied to this plan on 2026-06-24:

- **C1 — Queue `in_the_bag_suggest` async job on event save:** Added to Task 9, Step 3 (EventDetailSheet save handler). After a successful `createEvent`, if `isPremium && !isDemoMode()`, enqueues an `in_the_bag_suggest` job with `event_id`, `trip_id`, and `trip_day_id`. Premium-only per spec.

- **C2 — Queue additional async jobs on trip save:** Added to Task 4, Step 6 (`handleCreateTrip`). After the existing `cover_photo_fetch` enqueue, premium users also receive: `pre_trip_checklist_generate` (AI task suggestions), `treasure_map_generate` (Imagen 3 background), and `in_the_bag_suggest` at trip scope (no `event_id`, no `trip_day_id`).

- **C3 — Fix listActiveTrips/listPastTrips for multi-destination trips:** Task 1, Step 2 rewritten. The naive `!inner` join approach was replaced with a two-step query: (1) fetch the user's trip IDs from `trip_participants`; (2) fetch all `trip_destinations` rows for those trips and compute `MAX(end_date)` per trip in JS; (3) filter trip IDs by whether `max_end >= today` (active) or `max_end < today` (past); (4) fetch full trip rows by ID. Helper functions `getUserTripIds` and `getTripMaxEndDates` document the pattern.

- **C4 — Fix MMKV key for offline save status:** Task 5, Step 7 updated. The MMKV flag key is `offline_save_done_${tripId}` (not `offline_docs_saved_${tripId}`), matching spec Section 24 and Plan 9's implementation.

- **C5 — Milestone banner threshold gating:** Task 5, Step 5 (MilestoneBannerList) expanded into a seven-point numbered checklist. Steps: (1) compute `daysUntilDeparture`; (2) define the five trigger windows (30d, 14d, 7d, 7d, 0d); (3) filter to `windowActiveBanners`; (4) call `getVisibleBanners` for dismiss/snooze state; (5) cross-reference both filters; (6) render; (7) wire mutation callbacks.

- **M7 — Trip History read-only derived from trip end date, not only URL param:** Task 11, Step 2 updated. In addition to checking `readOnly === 'true'` from the URL param, the screen now computes `isPastTrip` from `MAX(end_date)` across the trip's destinations. The combined `isReadOnly = readOnlyParam === 'true' || isPastTrip` is used throughout, ensuring deep-linked past trips (e.g. from push notifications) open in read-only mode without requiring the query param.

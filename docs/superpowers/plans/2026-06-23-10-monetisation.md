# Monetisation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire RevenueCat subscription management, premium gating across all six+ gate points, family premium sharing, and demo mode bypass so free and premium tiers enforce correctly throughout the app.
**Architecture:** A `useSubscription` hook is the single source of truth for premium status, reading from the `subscriptions` table and `trip_participants.is_premium_sponsor`, with the result cached in MMKV for the session; all gate points call only this hook. RevenueCat webhooks hit a Supabase Edge Function that writes to the `subscriptions` table, keeping the app in sync without polling. Demo mode short-circuits the entire RevenueCat path via an MMKV `demo_tier` flag checked before any subscription query.
**Tech Stack:** RevenueCat (react-native-purchases), Supabase Edge Functions (webhook), Supabase `subscriptions` table

---

## File Structure

```
src/
  hooks/
    useSubscription.ts              # Core premium-status hook
    useSubscription.test.ts         # Unit tests: all subscription cases
  components/
    upgrade/
      UpgradePromptSheet.tsx        # Reusable upgrade prompt (all gate points)
      UpgradePromptSheet.test.tsx
  lib/
    revenuecat.ts                   # RevenueCat initialisation + purchase helpers
    subscriptionCache.ts            # MMKV cache read/write for subscription status
  context/
    SubscriptionContext.tsx         # Provider wrapping app root; exposes isPremium
supabase/
  functions/
    revenuecat-webhook/
      index.ts                      # Edge Function: validate → upsert subscriptions
      index.test.ts
    _shared/
      premiumSponsor.ts             # Shared sponsor-selection logic (also used by trip creation)
      premiumSponsor.test.ts
```

---

## Tasks

### Step 1 — Install and configure RevenueCat SDK

- [ ] Install `react-native-purchases` and run `npx expo install` to sync native modules.
- [ ] Add `REVENUECAT_API_KEY_IOS` to `app.config.ts` (reads from `.env`).
- [ ] Create `src/lib/revenuecat.ts`:
  - Export `initRevenueCat()` — calls `Purchases.configure({ apiKey })`.
  - Export `purchaseMonthly()`, `purchaseLifetime()`, `restorePurchases()` — thin wrappers around `Purchases.purchasePackage` and `Purchases.restorePurchases`; each returns `{ success, error }`.
  - Guard every call with `if (isDemoMode()) return` so demo builds never touch StoreKit.
- [ ] Call `initRevenueCat()` in the app root `_layout.tsx` after auth is resolved (Plan 1 foundation hook).
- [ ] Commit: `feat: install and configure RevenueCat SDK`

---

### Step 2 — Supabase Edge Function: RevenueCat webhook

- [ ] Create `supabase/functions/revenuecat-webhook/index.ts`:
  - Verify `Authorization` header: compare `request.headers.get('Authorization')` directly against the `REVENUECAT_WEBHOOK_SECRET` environment variable using a constant-time comparison (to prevent timing attacks). Return `401` if they do not match. Do not use HMAC — RevenueCat sends a plain shared secret in the Authorization header.
  - Parse event body — supported event types: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `UNCANCELLATION`.
  - Extract `app_user_id` (maps to `users.id`) and `product_identifier` to derive `type` (`monthly` | `lifetime`).
  - Upsert `subscriptions` row: `{ user_id, type, status, expires_at, revenuecat_customer_id, updated_at }`.
    - `INITIAL_PURCHASE` / `RENEWAL` / `UNCANCELLATION` → `status = 'active'`, set `expires_at` from event.
    - `CANCELLATION` → `status = 'cancelled'`, keep `expires_at` (access until then).
    - `EXPIRATION` → `status = 'expired'`, `expires_at = now()`.
  - Return `200 OK` for all handled events; `400` for unrecognised payload; `401` for bad secret.
- [ ] Write unit tests in `index.test.ts` covering: valid purchase, renewal, cancellation, expiration, bad secret.
- [ ] Deploy: `supabase functions deploy revenuecat-webhook --no-verify-jwt`.
- [ ] Register the deployed URL as a RevenueCat webhook endpoint in RevenueCat dashboard (document this step in a comment at the top of `index.ts`).
- [ ] Commit: `feat: supabase edge function for revenuecat webhook`

---

### Step 3 — MMKV subscription cache and `useSubscription` hook

- [ ] Create `src/lib/subscriptionCache.ts`:
  - Keys: `sub_is_premium` (bool), `sub_cached_at` (ISO timestamp), `sub_sponsor_trip_ids` (JSON array of trip IDs where user is a beneficiary).
  - `cacheSubscriptionStatus(isPremium, sponsorTripIds)` — writes to MMKV with current timestamp.
  - `readCachedStatus()` — returns `{ isPremium, sponsorTripIds, cachedAt }` or `null` if never cached.
  - Cache is session-scoped: invalidated on sign-out (call `clearSubscriptionCache()` in sign-out handler).

- [ ] Create `src/hooks/useSubscription.ts`:

  ```ts
  // Returns { isPremium, isLoading, refetch }
  ```

  Logic (in order):

  1. **Demo mode check** — if `MMKV.getString('demo_tier')` is set:
     - `isPremium = demo_tier === 'premium'`
     - Return immediately; skip all Supabase and RevenueCat calls.

  2. **Cache read** — read `subscriptionCache`. If a cached value exists from this session, return it as the initial value while a background refresh runs.

  3. **Active subscription query** — query `subscriptions` table for `user_id = auth.uid()` and `status = 'active'` and (`expires_at IS NULL` OR `expires_at > now()`).
     - If found → `isPremium = true`.

  4. **Sponsor query** — if no active own subscription, find any `trip_participants` row where `user_id = auth.uid()` AND the SAME trip has ANOTHER participant with `is_premium_sponsor = true` AND the trip's `end_date >= today`. The corrected Supabase query pattern:

     ```typescript
     const { data } = await supabase
       .from('trip_participants')
       .select('trip_id, trips!inner(end_date)')
       .eq('user_id', userId)
       .eq('is_premium_sponsor', false) // this user is NOT the sponsor
       .gte('trips.end_date', today)
       .in('trip_id',
         // subquery: trips that HAVE a sponsor
         supabase.from('trip_participants').select('trip_id').eq('is_premium_sponsor', true)
       )
     ```

     Alternatively restructure as two sequential queries. The key invariant: `is_premium_sponsor = false` matches rows where the current user is a co-participant (not the sponsor), filtered to trips that also have a sponsor row. Do NOT query `is_premium_sponsor = false` without the `in` subquery — that would match every ordinary participant on every trip and return `isPremium = true` incorrectly for all free users.
     - If any such row exists → `isPremium = true` (sponsor's benefit persists until trip end).

  5. **Fallback** → `isPremium = false`.

  6. Write result to cache via `cacheSubscriptionStatus`.

- [ ] Create `src/context/SubscriptionContext.tsx`:
  - `SubscriptionProvider` wraps app root; calls `useSubscription` once and exposes `{ isPremium }` via context.
  - Export `usePremium()` convenience hook — reads context; throws if called outside provider.

- [ ] Write `useSubscription.test.ts` covering:
  - [ ] Active monthly subscription → `isPremium = true`
  - [ ] Active lifetime subscription → `isPremium = true`
  - [ ] Expired subscription → `isPremium = false`
  - [ ] Cancelled subscription within `expires_at` → `isPremium = true`
  - [ ] Cancelled subscription past `expires_at` → `isPremium = false`
  - [ ] No own subscription, is co-participant on trip with active sponsor, trip not ended → `isPremium = true`
  - [ ] No own subscription, sponsor's subscription lapsed, trip not yet ended → `isPremium = true` (persists until `end_date`)
  - [ ] No own subscription, trip end_date in the past → `isPremium = false`
  - [ ] Demo mode `demo_tier = 'premium'` → `isPremium = true`, no Supabase calls made
  - [ ] Demo mode `demo_tier = 'free'` → `isPremium = false`, no Supabase calls made
  - [ ] Multiple trips: sponsor on one active, one past → returns `true` (at least one active)

- [ ] Commit: `feat: useSubscription hook with MMKV cache and full test coverage`

---

### Step 4 — Reusable UpgradePromptSheet component

- [ ] Create `src/components/upgrade/UpgradePromptSheet.tsx`:

  Props:
  ```ts
  interface UpgradePromptSheetProps {
    visible: boolean;
    onClose: () => void;
    featureTitle: string;       // e.g. "Treasure Map"
    featureDescription: string; // one sentence shown below the title
    variant: 'authenticated' | 'demo';
  }
  ```

  **`variant = 'authenticated'`** layout:
  - Feature title + description
  - Two product cards side by side: Premium Monthly and Premium Lifetime. **Prices must be fetched from RevenueCat at sheet mount time** using `Purchases.getOfferings()`. Display the localised price strings from `offerings.current.monthly.product.priceString` and `offerings.current.lifetime.product.priceString`. Show a loading skeleton while offerings load. Do not hardcode price strings — this ensures correct currency display for international users and compliance with App Store Review Guidelines.
  - "Subscribe" button (calls `purchaseMonthly()` or `purchaseLifetime()` based on selected card; closes sheet on success)
  - "Restore Purchase" button (calls `restorePurchases()`)
  - "Maybe Later" button (calls `onClose()`)
  - On successful purchase: calls `useSubscription().refetch()` then `onClose()`

  **`variant = 'demo'`** layout:
  - Feature title + description
  - Single button: "Switch to Premium (demo)" → sets `MMKV.set('demo_tier', 'premium')`, calls `onClose()`; SubscriptionContext re-renders automatically because `usePremium` reads from context which reads from `useSubscription` which re-runs
  - "Maybe Later" button

  No emojis anywhere (per Section 7 global UI rules).

- [ ] Write `UpgradePromptSheet.test.tsx`:
  - [ ] Renders correct buttons for `variant = 'authenticated'`
  - [ ] Renders "Switch to Premium (demo)" for `variant = 'demo'`
  - [ ] "Maybe Later" calls `onClose`
  - [ ] Demo switch sets MMKV and calls `onClose`

- [ ] Commit: `feat: reusable UpgradePromptSheet component`

---

### Step 5 — Wire gate point 1: Add with AI (Add to Day / Add to Whole Trip)

Gate location: `src/screens/trip/AddToDay/AddWithAIOption.tsx` (stub exists from Plan 2).

- [ ] Import `usePremium` hook.
- [ ] If `!isPremium`: render "Add with AI" row greyed out with "Premium" badge.
- [ ] On tap when not premium: open `UpgradePromptSheet` with:
  - `featureTitle="Add with AI"`
  - `featureDescription="Let AI suggest activities, restaurants, and experiences based on your trip context."`
  - `variant` derived from `isDemoMode() ? 'demo' : 'authenticated'`
- [ ] If `isPremium`: existing AI flow (no change).
- [ ] Commit: `feat: gate "Add with AI" behind premium subscription`

---

### Step 6 — Wire gate point 2: 3-event-per-day cap

Gate location: cap check already in Plan 2 UI. This step wires the real enforcement.

- [ ] In `src/screens/trip/AddToDay/index.tsx` (and AddToWholeTrip equivalent):
  - After day is selected, query event count for that day.
  - If `!isPremium && eventCount >= 3`:
    - Do NOT open the Add sheet.
    - Open `UpgradePromptSheet` with:
      - `featureTitle="Unlimited Events"`
      - `featureDescription="Free accounts are limited to 3 events per day. Upgrade to add unlimited events."`
      - `variant` from `isDemoMode() ? 'demo' : 'authenticated'`
  - Demo mode: skip this check entirely (`isDemoMode()` returns true → no cap).
- [ ] Commit: `feat: wire 3-event-per-day cap to real subscription gate`

---

### Step 7 — Wire gate point 3: Treasure Map

Gate location: `src/screens/trip/TreasureMap/index.tsx` and the map-pin icon button in `TripScreen` header.

- [ ] Map-pin icon tap handler:
  - If `!isPremium`: show `UpgradePromptSheet` with `featureTitle="Treasure Map"`, `featureDescription="Visualise your trip as an illustrated treasure map. Pan, zoom, and tap days to explore."`.
  - If `isPremium`: open Treasure Map overlay (existing Plan 2 stub).
- [ ] Settings screen — Display Style picker:
  - Treasure Map option: if `!isPremium`, render greyed out with "Premium" badge; tap → `UpgradePromptSheet`.
- [ ] Commit: `feat: gate Treasure Map display style behind premium`

---

### Step 8 — Wire gate point 4: Explore tab

Gate location: `src/screens/explore/index.tsx`.

- [ ] On screen mount, read `isPremium`.
- [ ] If `!isPremium` (authenticated): replace entire tab content with `UpgradePromptSheet` rendered inline (not as a modal sheet — rendered as the screen body), `featureTitle="Explore"`, `featureDescription="Chat with AI to find your next holiday or extract recommendations from YouTube and TikTok travel videos."`, `variant='authenticated'`, `onClose` is a no-op (prompt stays until user subscribes or navigates away).
- [ ] If `!isPremium` (demo free): same but `variant='demo'`.
- [ ] Commit: `feat: gate Explore tab behind premium`

---

### Step 9 — Wire gate point 5: Social post creator

Gate location: share icon in `TripSummaryTab` header and `DayTab` header.

- [ ] Share icon tap:
  - If `!isPremium`: open `UpgradePromptSheet` with `featureTitle="Social Post Creator"`, `featureDescription="Generate shareable postcards and stats cards from your trip to save to your camera roll."`.
  - If `isPremium`: open existing social post creator flow (Plan 2 stub).
- [ ] Commit: `feat: gate social post creator behind premium`

---

### Step 10 — Wire gate point 6: In the Bag AI suggestions

Gate location: `src/components/InTheBag/InTheBagSheet.tsx` — AI suggestions section.

- [ ] Free users: show a locked section (greyed out list placeholder + lock icon + text "Upgrade to Premium for AI-suggested packing items") with a tappable area that opens `UpgradePromptSheet` with `featureTitle="AI Packing Suggestions"`, `featureDescription="Automatically get packing suggestions tailored to each event, your destination, and your personal profile."`.
- [ ] Premium users: existing AI suggestion display from Plan 2.
- [ ] Commit: `feat: gate In the Bag AI suggestions behind premium`

---

### Step 10b — Wire gate point: Suggested Tasks (pre-trip checklist)

Gate location: `PreTripChecklist` component in `TripSummaryTab` (Plan 2).

The Trip Summary tab's pre-trip checklist has two sections: manually-added tasks and AI-generated Suggested Tasks (`is_suggested = true`). The Suggested Tasks section is premium-only.

- [ ] Import `usePremium` hook in the `PreTripChecklist` component.
- [ ] If `!isPremium`: **hide the Suggested Tasks section entirely** — do not render it at all, do not show a locked/greyed state. Free users simply see no Suggested Tasks section.
- [ ] If `isPremium`: display AI-suggested tasks as described in the spec (existing Plan 2 implementation).
- [ ] Confirm: there is no `UpgradePromptSheet` at this gate — the section is silently omitted for free users.
- [ ] Commit: `feat: gate Suggested Tasks section in pre-trip checklist behind premium`

---

### Step 11 — Premium sponsor logic (family sharing)

- [ ] Create `supabase/functions/_shared/premiumSponsor.ts`:

  ```ts
  // selectSponsor(tripId: string, supabaseClient): Promise<string | null>
  // Returns user_id of the first active premium subscriber among participants, ordered by user_id ASC.
  // Returns null if no participant holds an active subscription.
  ```

  Logic: execute a single SQL query — do NOT iterate client-side over participants:

  ```sql
  SELECT tp.user_id
  FROM trip_participants tp
  JOIN subscriptions s ON s.user_id = tp.user_id
  WHERE tp.trip_id = $tripId
    AND tp.user_id IS NOT NULL
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY tp.user_id ASC
  LIMIT 1
  ```

  This returns the correct sponsor in one round-trip with deterministic ordering. Return the `user_id` result, or `null` if no rows returned.

- [ ] Write `premiumSponsor.test.ts`:
  - [ ] Single participant with active sub → returned as sponsor
  - [ ] Multiple participants with active subs → lowest user_id returned
  - [ ] Participant with expired sub → not returned
  - [ ] No participants with active subs → returns null
  - [ ] Mix of guest_profile_id rows (no user_id) and user rows → guest rows ignored in sponsor selection

- [ ] Create `src/lib/sponsorEvaluation.ts` (client-side, called at trip creation time):
  - `evaluateSponsor(tripId, supabaseClient)` — calls the Supabase RPC function `evaluate_trip_sponsor($tripId)`.
  - **Atomicity requirement:** the two-step write (clear all sponsors, set new sponsor) must be atomic to prevent race conditions. Implement this as a Supabase RPC function that runs both writes in a single database transaction:
    ```sql
    -- RPC: evaluate_trip_sponsor(trip_id uuid)
    UPDATE trip_participants SET is_premium_sponsor = false WHERE trip_id = $1;
    UPDATE trip_participants SET is_premium_sponsor = true
      WHERE trip_id = $1 AND user_id = (
        SELECT tp.user_id FROM trip_participants tp
        JOIN subscriptions s ON s.user_id = tp.user_id
        WHERE tp.trip_id = $1 AND tp.user_id IS NOT NULL
          AND s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())
        ORDER BY tp.user_id ASC LIMIT 1
      );
    ```
    Add this RPC to the Plan 1 schema migration or as a new migration in this plan.
  - The client calls `supabase.rpc('evaluate_trip_sponsor', { trip_id: tripId })` — not two separate client-side update calls.

- [ ] Hook into trip creation flow (`src/screens/trip/CreateTrip/index.tsx`):
  - After the trip record and `trip_participants` rows are inserted, call `evaluateSponsor`.
  - This runs for every trip creation (new trips always re-evaluate).

- [ ] Commit: `feat: premium sponsor selection logic with family sharing`

---

### Step 12 — App launch subscription check and profile ring indicator

- [ ] In `SubscriptionContext.tsx`, call `useSubscription` once on mount and store `isPremium` in context. This is the session-cached check (Step 3 cache logic applies).
- [ ] In the bottom tab bar Profile icon component (`src/navigation/TabBar.tsx` or equivalent):
  - Import `usePremium`.
  - If `isPremium`: render a gold ring border around the profile photo circle.
  - Demo mode: gold ring shown when `demo_tier = 'premium'` (handled automatically because `usePremium` returns `true` for premium demo tier).
- [ ] Commit: `feat: premium gold ring on profile tab icon`

---

### Step 13 — Purchase flow in Settings and Account screen

- [ ] `src/screens/settings/Account.tsx`:
  - Display current plan: if `isPremium` show type and `expires_at` (or "Lifetime"); if not show "Free".
  - If not premium: show "Upgrade" button → opens `UpgradePromptSheet` with `featureTitle="In the Bag Premium"`, `featureDescription="Unlock AI planning, Treasure Map, social sharing, and unlimited events."`.
  - "Manage Subscription" button → `Linking.openURL('https://apps.apple.com/account/subscriptions')`.
  - "Restore Purchase" button → calls `restorePurchases()` from `src/lib/revenuecat.ts`; on success calls `useSubscription().refetch()`; shows success/failure toast.
- [ ] Commit: `feat: subscription management in Settings > Account`

---

### Step 14 — Demo mode wiring and banner

- [ ] `src/lib/demoMode.ts`:
  - `isDemoMode(): boolean` — returns `true` if `MMKV.getString('demo_tier')` is not null; gated by build flag (`__DEV__ || IS_TESTFLIGHT`).
  - **Defining `IS_TESTFLIGHT`:** In `eas.json`, add `'IS_TESTFLIGHT': 'true'` to the `env` section of the `preview` build profile, and omit it (or set `'IS_TESTFLIGHT': 'false'`) in the `production` profile. Read it in `app.config.ts` via `process.env.IS_TESTFLIGHT` and expose via `expo-constants` extra field (e.g. `extra: { isTestFlight: process.env.IS_TESTFLIGHT === 'true' }`). Access in `demoMode.ts` via `Constants.expoConfig?.extra?.isTestFlight`.
  - `getDemoTier(): 'free' | 'premium' | null`.
  - `setDemoTier(tier: 'free' | 'premium'): void` — writes to MMKV.

- [ ] Demo banner component `src/components/DemoBanner.tsx`:
  - Only rendered when `isDemoMode()` is true.
  - Thin banner pinned below status bar: "Demo Mode — [Free / Premium]" with "Switch" label on right.
  - "Switch" tap → action sheet: "Switch to Free" / "Switch to Premium" / "Cancel".
  - On switch: calls `setDemoTier()` then triggers `useSubscription().refetch()` so `isPremium` updates immediately.
  - Wrap in `_layout.tsx` so it renders above all screens.

- [ ] Confirm all gate points (Steps 5–10, 13) pass `variant={isDemoMode() ? 'demo' : 'authenticated'}` to `UpgradePromptSheet`.
- [ ] Confirm `isDemoMode()` returns `false` in production builds (build flag check).
- [ ] Commit: `feat: demo mode banner and tier switching`

---

### Step 15 — Integration test: end-to-end gate coverage check

- [ ] Write an integration test file `src/__tests__/premiumGating.test.ts`:
  - For each gate point, confirm that when `isPremium = false` (non-demo) the gate renders `UpgradePromptSheet` (not the premium content).
  - For each gate point, confirm that when `isPremium = true` the premium content renders (not the prompt).
  - Confirm demo free tier shows `variant='demo'` prompt, not `variant='authenticated'`.
  - Confirm demo premium tier bypasses all gate components.
  - Gate points covered: Add with AI, event cap, Treasure Map display style, Treasure Map screen, Explore tab, Social post creator, In the Bag AI suggestions.
- [ ] Commit: `test: integration coverage for all premium gate points`

---

## Self-review checklist (verify before marking complete)

- [ ] All 6+ gate points covered: Add with AI, event cap, Treasure Map (setting + screen), Explore tab, social post creator, In the Bag AI suggestions
- [ ] `UpgradePromptSheet` is a single component used at every gate — no inline duplicate implementations
- [ ] Sponsor logic handles: single subscriber, multiple subscribers (lowest user_id wins), no subscribers, guest-profile-only participants (ignored), mid-trip lapse (sponsor gone but trip not ended → still premium for co-participants)
- [ ] `useSubscription` tests cover: active sub, expired sub, cancelled-within-expiry, sponsor status, mid-trip lapse, demo free, demo premium
- [ ] Demo bypass confirmed at every gate point — no RevenueCat calls in demo mode
- [ ] Demo banner renders in dev/TestFlight only; absent in production builds
- [ ] Gold profile ring appears for premium users and for premium demo tier
- [ ] All 7+ gate points covered (including Suggested Tasks pre-trip checklist — silently hidden for free users)
- [ ] No emojis in any UI copy (Section 7 rule)

---

## Review Fixes Applied

The following targeted fixes were applied to this plan after initial review:

**C1 — Suggested Tasks gate (Step 10b added)**
Added a new step wiring the premium gate for the Suggested Tasks section in the pre-trip checklist. Free users see no Suggested Tasks section at all (silently omitted, not locked). This gate was missing from the original plan.

**C2 — RevenueCat webhook authentication (Step 2)**
Changed authentication description from "HMAC or shared secret" to constant-time direct comparison of the `Authorization` header against `REVENUECAT_WEBHOOK_SECRET`. RevenueCat uses a plain shared secret, not HMAC.

**C3 — `selectSponsor` uses SQL ORDER BY (Step 11)**
Replaced the client-side loop ("for each user_id, check subscriptions") with a single SQL query using a JOIN and `ORDER BY tp.user_id ASC LIMIT 1`. Returns the correct sponsor in one round-trip with deterministic ordering.

**C4 — `evaluateSponsor` is atomic via RPC (Step 11)**
Replaced two separate client-side update calls with a single Supabase RPC (`evaluate_trip_sponsor`) that runs both writes (clear sponsors, set sponsor) in one database transaction. Prevents race conditions. RPC must be added to a schema migration.

**M1 — `useSubscription` sponsor query corrected (Step 3)**
The sponsor query was logically backwards — `is_premium_sponsor = false` alone would match every free user on every trip. The corrected query adds an `in` subquery to filter to trips that also have a sponsor row, so only genuine co-participants on sponsored trips receive `isPremium = true`.

**M4 — `IS_TESTFLIGHT` build flag concretely defined (Step 14)**
Added concrete implementation: set `IS_TESTFLIGHT: 'true'` in the `preview` EAS build profile env, read it in `app.config.ts` via `process.env.IS_TESTFLIGHT`, expose via `expo-constants` extra field, and access in `demoMode.ts` via `Constants.expoConfig?.extra?.isTestFlight`.

**M5 — Prices fetched from RevenueCat, not hardcoded (Step 4)**
Replaced hardcoded price strings (`"$6.99/month"`, `"$44.99"`) with a call to `Purchases.getOfferings()` at sheet mount time, displaying localised `priceString` values. Shows a loading skeleton while offerings load. Required for correct international currency display and App Store Review Guidelines compliance.

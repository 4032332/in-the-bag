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
  - Verify `Authorization` header matches `REVENUECAT_WEBHOOK_SECRET` env var (HMAC or shared secret per RevenueCat docs).
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

  4. **Sponsor query** — if no active own subscription, query `trip_participants` for rows where `user_id = auth.uid()` and `is_premium_sponsor = false` (i.e. the user is a co-participant, not the sponsor themselves) AND the trip's `end_date >= today`. Join to `trips` to get `end_date`.
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
  - Two product cards side by side: Premium Monthly ($6.99/month) and Premium Lifetime ($44.99)
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

### Step 11 — Premium sponsor logic (family sharing)

- [ ] Create `supabase/functions/_shared/premiumSponsor.ts`:

  ```ts
  // selectSponsor(tripId: string, supabaseClient): Promise<string | null>
  // Returns user_id of the first active premium subscriber among participants, ordered by user_id ASC.
  // Returns null if no participant holds an active subscription.
  ```

  Logic:
  1. Query `trip_participants` for `trip_id = tripId` where `user_id IS NOT NULL`.
  2. For each `user_id`, check `subscriptions` for `status = 'active'` and `expires_at > now()` (or lifetime).
  3. Return the lowest `user_id` (string sort ascending) that has an active subscription, or `null`.

- [ ] Write `premiumSponsor.test.ts`:
  - [ ] Single participant with active sub → returned as sponsor
  - [ ] Multiple participants with active subs → lowest user_id returned
  - [ ] Participant with expired sub → not returned
  - [ ] No participants with active subs → returns null
  - [ ] Mix of guest_profile_id rows (no user_id) and user rows → guest rows ignored in sponsor selection

- [ ] Create `src/lib/sponsorEvaluation.ts` (client-side, called at trip creation time):
  - `evaluateSponsor(tripId, participants, supabaseClient)` — mirrors the Edge Function logic for use in the trip creation flow.
  - After evaluating, performs two writes in a single transaction:
    1. Set `is_premium_sponsor = false` for all current sponsors on this trip.
    2. Set `is_premium_sponsor = true` for the selected sponsor (if any).

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
- [ ] No emojis in any UI copy (Section 7 rule)

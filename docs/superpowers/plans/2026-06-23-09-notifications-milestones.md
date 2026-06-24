# Notifications & Milestones Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement push notifications for trip countdown triggers and family events, and in-app milestone banners on the Trip Summary tab with per-banner dismiss/snooze logic backed by the `milestone_banner_states` table.

**Architecture:** Expo Notifications handles push permission, scheduling, and deep link payload dispatch; notification scheduling is performed client-side at trip creation and re-evaluated on app launch (skipping already-past triggers); in-app milestone banners query `milestone_banner_states` from Supabase on Summary tab load, apply per-banner display rules, and write state mutations (dismiss, snooze, confirm, save_now) back via direct Supabase client calls; offline document download is a shared function invoked from both the in-app banner and the push notification deep link handler.

**Tech Stack:** Expo Notifications, Supabase (milestone_banner_states, trip_tasks), MMKV

---

## File Structure

```
src/
  notifications/
    NotificationService.ts          # Permission request, scheduling, cancellation
    scheduleNotifications.ts        # Trip countdown scheduling logic
    NotificationHandler.ts          # Foreground/background payload handler + deep link routing
    notifications.types.ts          # Payload types and action constants
  features/
    milestones/
      useMilestoneBanners.ts        # Query milestone_banner_states, apply display rules
      MilestoneBannerList.tsx       # Renders active banners on Summary tab
      banners/
        Insurance30dBanner.tsx
        Visa14dBanner.tsx
        ESim7dBanner.tsx
        OfflineDocs7dBanner.tsx
        WifiDayOfBanner.tsx
      milestones.types.ts
    offline/
      offlineDocumentDownload.ts    # Shared download function (banner + deep link)
      useOfflineDocuments.ts        # Query eligible docs from Supabase
supabase/
  functions/
    snooze-reset-cron/
      index.ts                      # Hourly cron: reset expired snoozed_until on trip_tasks
src/
  __tests__/
    milestones/
      useMilestoneBanners.test.ts   # Banner display logic unit tests
      offlineDocumentDownload.test.ts
    notifications/
      scheduleNotifications.test.ts # Scheduling skip logic
      NotificationHandler.test.ts   # Deep link + save_now dispatch
```

---

## Tasks

### Step 1 — Notification types, constants, and permission flow

- [ ] Create `src/notifications/notifications.types.ts`:
  - Export `NotificationPayload` type: `{ action: 'save_offline_docs' | 'trip_reminder' | 'family_invitation' | 'treasure_map_ready' | 'family_accepted'; trip_id?: string }`
  - Export action button identifier constants: `SAVE_NOW_ACTION = 'SAVE_NOW'`, `LATER_ACTION = 'LATER'`
  - Export notification category identifier: `OFFLINE_DOCS_CATEGORY = 'OFFLINE_DOCS'`

- [ ] Create `src/notifications/NotificationService.ts`:
  - `requestPermissions()`: calls `Notifications.requestPermissionsAsync()`; returns `granted: boolean`; stores result in MMKV key `notifications_permission` to avoid re-requesting
  - `registerActionCategories()`: registers `OFFLINE_DOCS_CATEGORY` with two action buttons — "Save Now" (`SAVE_NOW_ACTION`, opens app) and "Later" (`LATER_ACTION`, background)
  - `getExpoPushToken()`: calls `Notifications.getExpoPushTokenAsync()`; stores token in MMKV; returns token string
  - `cancelNotificationsForTrip(tripId: string)`: cancels all scheduled local notifications whose payload contains `trip_id === tripId` (used on trip deletion)
  - Call `registerActionCategories()` once at app startup (in root layout)

- [ ] Commit: `feat: add notification types, constants, and permission service`

---

### Step 2 — Trip countdown scheduling logic

- [ ] Create `src/notifications/scheduleNotifications.ts`:
  - Export `scheduleTripNotifications(trip: { id: string; name: string; departureDateISO: string })`:
    - Compute `now = Date.now()`
    - Define triggers array (all times are 9:00 AM local device time on the target date):

      | Offset | Banner key | Body |
      |---|---|---|
      | departure − 30 days | `insurance_30d` | "Have you organised travel insurance for [trip]?" |
      | departure − 14 days | `visa_14d` | "Confirm your visa and immigration requirements for [trip]." |
      | departure − 7 days | `esim_7d` | "Organise an e-SIM so you're online when you land for [trip]." |
      | departure − 7 days | `offline_docs_7d` | "Save critical documents for [trip] for offline access." (category: `OFFLINE_DOCS_CATEGORY`; payload: `{ action: 'save_offline_docs', trip_id: trip.id }`) |
      | departure − 0 days | `wifi_day_of` | "Connect to airport WiFi as soon as you land." |

    - Skip any trigger whose fire time is <= `now` (handles trips created less than 30 days before departure)
    - Schedule each remaining trigger with `Notifications.scheduleNotificationAsync`; store returned notification IDs in MMKV under key `trip_notif_ids_<tripId>` (JSON array) for later cancellation
    - Return array of scheduled notification IDs (empty array if all triggers were in the past)

  - Export `cancelTripNotifications(tripId: string)`: reads IDs from MMKV, calls `Notifications.cancelScheduledNotificationAsync` for each, clears MMKV key

- [ ] Unit tests `src/__tests__/notifications/scheduleNotifications.test.ts`:
  - Trip created exactly 30 days before departure → all 5 triggers scheduled
  - Trip created 20 days before departure → `insurance_30d` trigger skipped; 4 scheduled
  - Trip created 6 days before departure → `insurance_30d`, `visa_14d`, `esim_7d`, `offline_docs_7d` skipped; only `wifi_day_of` scheduled
  - Trip created on departure day → 0 triggers scheduled; returns empty array
  - `offline_docs_7d` trigger has correct category (`OFFLINE_DOCS_CATEGORY`) and payload `{ action: 'save_offline_docs', trip_id }`

- [ ] Commit: `feat: trip countdown notification scheduling with past-trigger skip logic`

---

### Step 3 — Family and async-job notifications

- [ ] Add to `src/notifications/NotificationService.ts`:
  - `sendFamilyInvitationNotification(inviterName: string)`: schedules an immediate local notification — "{{inviterName}} has invited you to join their family on In the Bag." (This fires when the app receives the invitation via Supabase Realtime; the push token path is handled server-side, but the local trigger covers the case where the app is foregrounded)
  - `sendFamilyAcceptedNotification(inviteeName: string)`: schedules an immediate local notification — "{{inviteeName}} has joined your family on In the Bag."
  - `sendTreasureMapReadyNotification(tripName: string, tripId: string)`: schedules an immediate local notification — "Your Treasure Map for {{tripName}} is ready."; payload `{ action: 'treasure_map_ready', trip_id: tripId }`

- [ ] Wire these calls into their trigger sites:
  - Family invitation received: in the Supabase Realtime subscription handler for `family_invitations` table (where `invitee_email` matches current user and `status = 'pending'`), call `sendFamilyInvitationNotification`
  - Family invitation accepted: in the Realtime subscription handler for `family_invitations` (where `inviter_user_id` matches current user and `status = 'accepted'`), call `sendFamilyAcceptedNotification`
  - Treasure Map ready: in the `async_jobs` Realtime handler (where `type = 'treasure_map_generate'` and `status = 'completed'`), call `sendTreasureMapReadyNotification`

- [ ] Commit: `feat: family event and treasure map ready notifications`

---

### Step 4 — Notification deep link handler

- [ ] Create `src/notifications/NotificationHandler.ts`:
  - `initNotificationHandler(router: ExpoRouter)`:
    - Register `Notifications.addNotificationResponseReceivedListener` for background/quit tap events
    - Register `Notifications.addNotificationReceivedListener` for foreground events (display only — no auto-navigation while app is active)
    - In the response listener, call `handleNotificationResponse(response, router)`
  - `handleNotificationResponse(response, router)`:
    - Read `payload = response.notification.request.content.data` as `NotificationPayload`
    - If `payload.action === 'save_offline_docs'` AND `response.actionIdentifier === SAVE_NOW_ACTION`:
      - Navigate to trip Summary tab: `router.push(\`/trips/${payload.trip_id}\`)`
      - After navigation settles (100ms delay), dispatch event `TRIGGER_OFFLINE_SAVE` with `trip_id` via a lightweight EventEmitter (or Zustand action) — the Summary tab listens and auto-invokes `offlineDocumentDownload(tripId)`
    - If `payload.action === 'treasure_map_ready'` and `payload.trip_id`:
      - Navigate to trip Summary tab: `router.push(\`/trips/${payload.trip_id}\`)`
    - All other payloads: no navigation (user tapped the notification body — app opens to foreground state)

- [ ] Unit tests `src/__tests__/notifications/NotificationHandler.test.ts`:
  - `save_offline_docs` + `SAVE_NOW_ACTION` → router receives correct trip path AND `TRIGGER_OFFLINE_SAVE` event fires with correct `trip_id`
  - `save_offline_docs` + `LATER_ACTION` → no navigation, no event dispatched
  - `treasure_map_ready` → router receives correct trip path
  - Unknown action → no navigation, no error thrown

- [ ] Call `initNotificationHandler(router)` in root layout (`app/_layout.tsx`) after permission check

- [ ] Commit: `feat: notification response handler with Save Now deep link dispatch`

---

### Step 5 — Offline document download function

- [ ] Create `src/features/offline/offlineDocumentDownload.ts`:

  > **Schema note (C1 & C2):** The `event_documents` table must include a `tab_source` field to distinguish Tickets tab entries from Documents tab entries. If this field does not exist in the Plan 1 schema, add a `tab_source` column with values `'tickets' | 'documents'` to `event_documents` as a migration in this plan.

  - Export `offlineDocumentDownload(tripId: string, userId: string): Promise<OfflineSaveResult>`:
    1. Query events for the trip:
       - **Visa/immigration docs**: `event_documents` rows where `event.trip_id = tripId` AND `event.category = 'Transport'` AND `event.subcategory = 'Air'` AND `tab_source = 'documents'`. This broader approach (all Documents-tab files from Transport-Air events) covers visa/immigration docs without fragile label matching and matches spec intent — the 'international' flag can be derived from the `is_international` boolean field on the events table if finer filtering is needed later, but including all Documents-tab files is simpler and safer.
       - **Boarding passes**: `event_documents` rows where `event.trip_id = tripId` AND `event.category = 'Transport'` AND `event.subcategory = 'Air'` AND `tab_source = 'tickets'`. Note: `tab_source` must be used here — a filter of `type IN ('scan', 'qr')` alone would match scanned documents in BOTH the Tickets tab AND the Documents tab, incorrectly including non-boarding-pass scanned docs.
       - **Airport transport confirmations**: `event_documents` rows where `event.trip_id = tripId` AND `event.category = 'Transport'` AND `event.trip_day_id` corresponds to the first or last day of the trip (join `trip_days` on `day_number = 1` or `day_number = max(day_number)` for this trip)
       - **Hotel confirmation**: `event_documents` rows where `event.trip_id = tripId` AND `event.category = 'Accommodation'`
    2. For each qualifying `storage_url`, download to device file system via `expo-file-system` (`FileSystem.downloadAsync`) into `FileSystem.documentDirectory + 'offline/' + tripId + '/'`
    3. Store manifest in MMKV under key `offline_docs_<tripId>`: JSON array of `{ label, localUri, originalUrl, savedAt }`
    4. Set MMKV key `offline_save_done_<tripId>` = `'true'` (used by Summary tab to show/hide the "Offline Documents" button)
    5. Return `{ success: boolean; savedCount: number; errors: string[] }`

- [ ] Unit tests `src/__tests__/milestones/offlineDocumentDownload.test.ts`:
  - Transport-Air event with a Documents-tab file (`tab_source = 'documents'`) → included in visa/immigration download set
  - Transport-Air event with a Documents-tab scanned visa doc (`type = 'scan'`, `tab_source = 'documents'`) → included in visa/immigration set AND NOT included in boarding pass set (C1/C2: tab_source distinguishes the two sets)
  - Transport-Air event with boarding pass (`tab_source = 'tickets'`) → included in boarding pass set
  - Transport-Air event with a Tickets-tab file (`tab_source = 'tickets'`, type=scan) → included in boarding passes; NOT included in visa/immigration set
  - Transport event on day 1 → included; Transport event on day 3 of 5-day trip → excluded
  - Transport event on last day (day 5) → included
  - Accommodation event documents → included
  - Non-qualifying event (Activity) → excluded
  - Mix of qualifying and non-qualifying → only qualifying downloaded
  - MMKV manifest written correctly; `offline_save_done_<tripId>` set to 'true' on success

- [ ] Commit: `feat: offline document download function with document selection logic`

---

### Step 6 — Banner display query hook

- [ ] Create `src/features/milestones/milestones.types.ts`:
  - `BannerKey = 'insurance_30d' | 'visa_14d' | 'esim_7d' | 'offline_docs_7d' | 'wifi_day_of'`
  - `MilestoneBannerState`: mirrors `milestone_banner_states` table row shape
  - `ActiveBanner`: `{ key: BannerKey; state: MilestoneBannerState | null }` (null state means no row yet — treat as fully un-dismissed)

- [ ] Create `src/features/milestones/useMilestoneBanners.ts`:
  - Input: `tripId: string`, `userId: string`, `departureDateISO: string`
  - Queries `milestone_banner_states` for all rows matching `trip_id` and `user_id`
  - Determines which banners are within their trigger window (computed from `departureDateISO` and `Date.now()`):
    - `insurance_30d`: show if now is within 30 days of departure (departureDateISO − 30d <= now <= departure)
    - `visa_14d`: show if now is within 14 days of departure
    - `esim_7d`: show if now is within 7 days of departure
    - `offline_docs_7d`: show if now is within 7 days of departure
    - `wifi_day_of`: show if today is the departure date
  - For each in-window banner, applies display rules:
    - `insurance_30d`, `esim_7d`, `offline_docs_7d`, `wifi_day_of`: show if `dismissed_at IS NULL` AND (`resurface_at IS NULL` OR `resurface_at <= now()`)
    - `visa_14d`: show if `dismissed_at IS NULL` (no snooze — `resurface_at` always NULL for this key)
  - Returns `activeBanners: ActiveBanner[]` (ordered: insurance_30d, visa_14d, esim_7d, offline_docs_7d, wifi_day_of)
  - Exposes mutation helpers:
    - `confirmBanner(key: BannerKey)`: upserts row with `dismissed_at = now()`, `action_taken = 'confirm'`
    - `dismissBanner(key: BannerKey)`: upserts row with `dismissed_at = now()`, `action_taken = 'dismiss'`
    - `snoozeBanner(key: BannerKey)`: upserts row with `resurface_at = now() + 24 hours`; only callable for snooze-eligible keys (guard: throw if called with `visa_14d`)
    - `saveNowBanner(key: BannerKey)`: upserts row with `dismissed_at = now()`, `action_taken = 'save_now'`; then calls `offlineDocumentDownload(tripId, userId)`

- [ ] Unit tests `src/__tests__/milestones/useMilestoneBanners.test.ts` — cover all display rule branches:
  - `insurance_30d`: no row → shown (within 30-day window)
  - `insurance_30d`: `dismissed_at` set → hidden
  - `insurance_30d`: `resurface_at` in future → hidden
  - `insurance_30d`: `resurface_at` in past → shown
  - `visa_14d`: no row → shown (within 14-day window)
  - `visa_14d`: `dismissed_at` set → hidden
  - `visa_14d`: `resurface_at` set to a past date, `dismissed_at IS NULL` → **SHOWN** (not hidden); `resurface_at` is intentionally ignored for `visa_14d` — the sole display gate is `dismissed_at IS NULL`; this test confirms `resurface_at` has no effect on this banner key
  - `esim_7d`, `offline_docs_7d`, `wifi_day_of`: same snooze/dismiss rules as `insurance_30d`
  - Snooze writes `resurface_at = now + 24h`; `dismissed_at` remains NULL
  - Confirm writes `dismissed_at = now()`, `action_taken = 'confirm'`
  - Dismiss writes `dismissed_at = now()`, `action_taken = 'dismiss'`
  - `snoozeBanner('visa_14d')` throws guard error
  - Both `esim_7d` and `offline_docs_7d` appear simultaneously at 7 days (independent banners)
  - Banner outside trigger window (e.g. `insurance_30d` at 5 days before departure) → not included in activeBanners regardless of row state

- [ ] Commit: `feat: useMilestoneBanners hook with display rules and mutation helpers`

---

### Step 7 — Banner UI components

- [ ] Create individual banner components in `src/features/milestones/banners/`:

  **Insurance30dBanner.tsx**
  - Title: "Have you organised travel insurance?"
  - Buttons: "Confirm" (primary) → `confirmBanner('insurance_30d')`; "Remind Me Later" (secondary) → `snoozeBanner('insurance_30d')`

  **Visa14dBanner.tsx**
  - Title: "Confirm your visa and immigration requirements"
  - Buttons: "I've sorted this" (maps to `confirmBanner`, `action_taken = 'confirm'`); "Not applicable to me" (maps to `dismissBanner`, `action_taken = 'dismiss'`)
  - No "Remind Me Later" button — permanent action only

  **ESim7dBanner.tsx**
  - Title: "Organise an e-SIM so you're online when you land"
  - Buttons: "Confirm" → `confirmBanner('esim_7d')`; "Remind Me Later" → `snoozeBanner('esim_7d')`

  **OfflineDocs7dBanner.tsx**
  - Title: "Save critical documents for offline access"
  - Buttons: "Save Now" (primary) → `saveNowBanner('offline_docs_7d')` (triggers download + writes dismissed_at + action_taken='save_now'); "Later" (secondary) → `snoozeBanner('offline_docs_7d')`

  **WifiDayOfBanner.tsx**
  - Title: "Connect to airport WiFi as soon as you land"
  - Buttons: "Dismiss" → `dismissBanner('wifi_day_of')`; no snooze option (day-of, snooze would resurface same day — still supported by display rules; include "Remind Me Later" → `snoozeBanner('wifi_day_of')` for consistency)

  All banners:
  - Dismissable via an X icon (calls the dismiss/confirm mutation as appropriate per banner)
  - No emojis in any label, title, or button text
  - Accessible: `accessibilityRole="alert"`, appropriate labels

- [ ] Create `src/features/milestones/MilestoneBannerList.tsx`:
  - Accepts `tripId`, `userId`, `departureDateISO` props
  - Calls `useMilestoneBanners`
  - Maps `activeBanners` to the corresponding banner component
  - Returns null if no active banners

- [ ] Wire `MilestoneBannerList` into the Trip Summary tab below the cover photo header, above the pre-trip checklist

- [ ] Listen for `TRIGGER_OFFLINE_SAVE` event in Summary tab: when received with matching `trip_id`, call `offlineDocumentDownload` and show a loading indicator; on completion show a brief toast ("Documents saved for offline access")

- [ ] Show "Offline Documents" button on Summary tab when `offline_save_done_<tripId>` MMKV key equals `'true'`; tapping opens a modal listing documents from the MMKV manifest

- [ ] Commit: `feat: milestone banner components and Summary tab integration`

---

### Step 8 — Pre-trip checklist snooze cron (Supabase Edge Function)

- [ ] Create `supabase/functions/snooze-reset-cron/index.ts`:
  - Triggered by Supabase scheduled function (cron: every hour — `0 * * * *`)
  - Runs as service role (bypasses RLS)
  - Query: `UPDATE trip_tasks SET snoozed_until = NULL WHERE snoozed_until IS NOT NULL AND snoozed_until <= now()`
  - Log count of rows reset; return 200 with `{ reset: count }`
  - Snooze duration written by app when user taps Snooze on a suggested task: `snoozed_until = now() + interval '48 hours'` (48h, distinct from the 24h banner snooze)

- [ ] Register the scheduled function in `supabase/config.toml` (or via Supabase dashboard cron job definition) with schedule `0 * * * *`

- [ ] Commit: `feat: hourly cron Edge Function to reset expired task snooze`

---

### Step 9 — Wire scheduling into trip creation and app launch

- [ ] In the Create Trip flow (after trip saved to Supabase), call `scheduleTripNotifications({ id: trip.id, name: trip.name, departureDateISO: trip.departure_date })`

- [ ] **Edit Trip departure date (M1):** If the trip's departure date is edited after creation, the app must cancel existing notifications and re-schedule them with the new date. Wire into the Edit Trip save flow: call `cancelTripNotifications(tripId)` then `scheduleTripNotifications(...)` with the updated departure date. This is a gap in the current plan — handle it here in the Edit Trip save flow or flag it explicitly for Plan 2's Edit Trip flow. Do not leave it unhandled.

- [ ] On app launch (root layout `useEffect`), iterate all active/upcoming trips from local MMKV cache; for each trip that has no notification IDs stored (`trip_notif_ids_<tripId>` missing or empty), call `scheduleTripNotifications` — handles the case where permissions were denied at create time and later granted

- [ ] On trip deletion, call `cancelTripNotifications(tripId)` and delete `offline_save_done_<tripId>` and `offline_docs_<tripId>` from MMKV

- [ ] Commit: `feat: wire notification scheduling to trip creation, launch, and deletion`

---

### Step 10 — Integration smoke test and self-review

- [ ] Manual smoke test checklist (Expo Go / Xcode Simulator):
  - [ ] Create a trip 8 days in future → verify `esim_7d`, `offline_docs_7d`, `wifi_day_of` notifications scheduled; `insurance_30d` and `visa_14d` skipped (in the past)
  - [ ] Open Summary tab → `esim_7d` and `offline_docs_7d` banners both appear; also verify `insurance_30d` banner IS STILL VISIBLE — even though its push notification was skipped (trigger date was in the past), the banner display window (within 30 days of departure) is still active at 8 days out. Push notification scheduling and in-app banner display are independent systems: the banner shows based on the current date vs departure date, not on whether the notification was ever sent (M2)
  - [ ] Tap "Remind Me Later" on `insurance_30d` → banner hides; reappears after 24h (`resurface_at` set)
  - [ ] Tap "Not applicable to me" on `visa_14d` → permanently hidden; no snooze available
  - [ ] Tap "Save Now" on `offline_docs_7d` → download starts; "Offline Documents" button appears on Summary tab after completion
  - [ ] Simulate push notification tap with `SAVE_NOW_ACTION` → navigates to Summary tab; offline save triggered automatically
  - [ ] Simulate push notification tap with `LATER_ACTION` → no navigation; banner still visible on next Summary tab visit
  - [ ] Snooze a suggested task → verify `snoozed_until` set to 48h; after simulated hour tick (manual cron run), `snoozed_until` reset to NULL and task resurfaces

- [ ] Self-review checklist:
  - [ ] All 5 banner keys covered: `insurance_30d`, `visa_14d`, `esim_7d`, `offline_docs_7d`, `wifi_day_of`
  - [ ] Snooze durations correct: banners snooze 24h; checklist tasks snooze 48h — confirmed distinct
  - [ ] Deep link payload matches spec: `{ "action": "save_offline_docs", "trip_id": "<uuid>" }`
  - [ ] `visa_14d` has no snooze button and `snoozeBanner('visa_14d')` guard tested
  - [ ] Both `esim_7d` and `offline_docs_7d` fire independently at 7 days
  - [ ] Offline document selection covers all 4 document types from spec (visa/immigration docs, boarding passes, airport transport confirmations, hotel confirmation)
  - [ ] Notifications skip past-due triggers on creation < 30 days before departure
  - [ ] `offline_docs_7d` notification payload has `categoryIdentifier = OFFLINE_DOCS_CATEGORY` with Save Now / Later action buttons

- [ ] Commit: `feat: notifications and milestones smoke test pass, plan complete`

---

## Review Fixes Applied

The following targeted fixes were applied to this plan after initial review:

**C1 — Boarding pass selection disambiguated (Step 5)**
- Added schema note requiring a `tab_source` column (`'tickets' | 'documents'`) on `event_documents`, with a migration if not already present.
- Updated boarding pass filter from `type IN ('scan', 'qr')` to `tab_source = 'tickets'` with an explanation of why the old filter was ambiguous (would have matched scanned docs in both tabs).
- Added test case: Documents-tab scanned visa doc (`type=scan`, `tab_source='documents'`) must NOT appear in the boarding pass download set.

**C2 — Visa/immigration doc selection uses tab_source, not label heuristic (Step 5)**
- Replaced the fragile `label contains 'visa' or 'immigration'` heuristic with `tab_source = 'documents'` on Transport-Air events (broader approach, simpler, matches spec intent).
- Noted that `is_international` on the events table could be used for finer filtering if needed later.
- Updated tests to reflect the corrected selection logic using `tab_source`.

**M4 — visa_14d test assertion corrected (Step 6)**
- The test for `visa_14d` with `resurface_at` set to a past date previously said "still hidden" — this was wrong.
- Fixed: a `visa_14d` row with `dismissed_at IS NULL` and any `resurface_at` value must show the banner, because `resurface_at` is intentionally irrelevant for this key. Test now asserts SHOWN, with a comment explaining why.

**M1 — Edit Trip departure date must re-schedule notifications (Step 9)**
- Added an explicit requirement: when the departure date is edited, call `cancelTripNotifications(tripId)` then `scheduleTripNotifications(...)` with the new date.
- Flagged as a gap that must be handled in the Edit Trip save flow (this plan or Plan 2).

**M2 — Smoke test must verify insurance_30d banner at 8 days out (Step 10)**
- Updated the "8 days in future" smoke test scenario to also verify that the `insurance_30d` banner IS visible on the Summary tab, even though its push notification was skipped.
- Added clarifying note: push notification scheduling and in-app banner display are independent systems.

# In the Bag — App Design Specification
**Date:** 2026-06-23  
**Version:** 1.1  
**Platform:** iOS (Expo / React Native), testable via Expo Go and Xcode Simulator  
**Status:** Approved for implementation planning

---

## 1. Product Overview

In the Bag is a one-stop holiday planning and execution app for iOS. It allows users to plan every detail of a trip — transport, accommodation, activities, meals — and provides an AI agentic component to fill gaps, recommend activities, and assist with pre-trip preparation. The signature feature is the "In the Bag" packing list, which intelligently aggregates essential items across events and days.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Expo (React Native), Expo Router |
| Canvas rendering | React Native Skia |
| Gestures & animation | React Native Gesture Handler + Reanimated |
| Backend & database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (custom SMTP, custom templates, custom domain) |
| AI — reasoning | Gemini 2.5 Pro (via Supabase Edge Functions) |
| AI — image generation | Gemini Imagen 3 (via Supabase Edge Functions) |
| AI — vision/scanning | Gemini Vision (boarding pass, QR code, document scanning in Event Documents) |
| Async job queue | Supabase Edge Functions + `async_jobs` table |
| Payments | RevenueCat (wraps Apple StoreKit) |
| Push notifications | Expo Notifications |
| Email delivery | Resend — branded sender for auth emails and family invitations only |
| File storage | Supabase Storage |
| Apple Health | HealthKit via react-native-health |

---

## 3. Architecture

**Pattern:** Expo app + Supabase + async Edge Functions (Approach C)

- Fast operations (CRUD for trips, events, tasks) → direct Supabase client calls with row-level security
- Heavy AI operations (Treasure Map generation, YouTube/TikTok extraction, flight data lookup, AI trip/day suggestions) → Supabase Edge Functions with async job queuing
- App subscribes via Supabase Realtime to `async_jobs` for job completion notification
- All Gemini calls routed through a single Edge Function service layer — swapping models or adding AI features requires no changes to app code
- Feature flags stored in `feature_flags` table — new features togglable without an app release
- Event categories and subcategories stored in the database — new types addable without a code change
- Internationalisation-ready string handling from day one
- No iOS-only APIs used unless unavoidable — Android can be added later with minimal rework

---

## 4. Scalability Principles

- Modular screen architecture — each feature area is a self-contained module
- AI prompt layer abstracted into Edge Functions
- Database-driven configuration (categories, subcategories, feature flags, suggested task rules)
- RevenueCat webhooks update Supabase subscription status — no polling required
- Supabase Realtime for family trip collaboration

---

## 5. Authentication & Branding

- Sign up / Log in via: Email + password, Sign in with Apple, Sign in with Google
- Email delivery via Resend from branded address (e.g. `hello@inthebag.app`)
- Resend is used for two purposes only: auth emails (verification, password reset) and family invitation emails
- All email templates fully designed in In the Bag brand — no Supabase branding visible
- Deep links route users from emails back into the app (Expo Linking)
- Custom auth domain (e.g. `auth.inthebag.app`) — Supabase not exposed in API calls

**Guest / Demo Mode (tester-only, not in production build):**
- Demo mode exists solely to allow testers to evaluate the app without creating an account. It is removed before production release and will not be visible to end users.
- "Continue as Guest (Demo Mode)" button appears on the onboarding splash in development/TestFlight builds only (gated by a build flag, not a feature flag)
- After tapping "Continue as Guest", a full-screen tier selector is presented (not dismissable without selecting — there is no back button or close gesture on this screen): two large tappable cards side by side, "Free" and "Premium", each with a brief description of what that tier includes. Tapping either card sets `demo_tier` in MMKV and navigates to the Home screen.
- The selected tier is stored in MMKV (`demo_tier`: `free` | `premium`)
- A persistent thin banner is pinned to the top of every screen (below the status bar, above all other content) showing "Demo Mode — [Free / Premium]" with a tappable "Switch" label on the right. Tapping "Switch" shows a simple action sheet: "Switch to Free" / "Switch to Premium" / "Cancel". Switching updates `demo_tier` in MMKV and re-renders the current screen immediately.
- Demo data is stored in local device storage only; no Supabase records are created
- All production monetisation gates (RevenueCat, upgrade prompts, event caps, trip caps) are bypassed in demo mode — the selected tier grants full access to its features directly
- Guest profiles (uninvited family members managed by primary user) are a separate concept from Guest/Demo mode — see Section 6

---

## 6. Data Model

### Users & Family

**`users`**
id, email, full_name, date_of_birth, profile_photo_url, phone, address, country_of_residency, citizenship_countries[], passport_expiry, family_role (mother/father/grandmother/grandfather/other), disability_accessibility_needs, medical_conditions, medications, food_allergies, dietary_requirements, pref_date_format, pref_time_format, pref_colour_scheme, pref_trip_display_style (tiles/stacked/treasure_map), pref_memories_style (postcards/fridge_magnets/polaroids/passport_stamps/puzzle_pieces/monopoly_figures), created_at

**`family_groups`**
id, name, created_by_user_id, created_at, max_members (default 8)

A `family_groups` record and corresponding `family_group_members` row (role = owner) are created automatically at user account creation. This ensures every user has a family group ID available before they send their first invitation.

**Primary family group:** When a user sends an invitation, the invitation always uses their own auto-created family group (the one they own). If a user belongs to multiple groups (having been invited into others), they always invite from their own group — not from a group they were invited into. The `family_invitations.family_group_id` is always the inviter's owned group ID. This rule removes ambiguity when a user is a member of multiple groups.

**`family_group_members`**
id, family_group_id, user_id, role, joined_at

**`guest_profiles`**
id, managed_by_user_id, full_name, date_of_birth, profile_photo_url, family_role, disability_accessibility_needs, medical_conditions, medications, food_allergies, dietary_requirements, created_at
*(Uninvited family members managed by the primary user. Not the same as Guest/Demo mode.)*

**`family_invitations`**
id, inviter_user_id, invitee_email, family_role, family_group_id, status (pending/accepted/declined/expired), token, created_at, expires_at, responded_at

**Family group cap clarification:**
- A family group is capped at 8 members (linked accounts + guest profiles combined)
- A trip can have participants from multiple family groups — the 8-member cap applies per family group, not per trip
- In practice, most trips will draw from a single family group

### Trips

**`trips`**
id, owner_user_id, name, cover_photo_url, is_cruise, cruise_details (jsonb), treasure_map_image_url, treasure_map_layout (jsonb — tile positions, path bezier control points, random seed; generated once on trip creation and persisted), display_style (tiles/stacked/treasure_map), created_at, updated_at

**`trip_destinations`**
id, trip_id, city, country, start_date, end_date, display_order

**`trip_participants`**
id, trip_id, user_id (nullable), guest_profile_id (nullable), is_premium_sponsor (bool)

**Premium sponsor logic:**
- `is_premium_sponsor` is set to true for exactly one trip participant — the first active premium subscriber found among the trip's participants (ordered by `user_id` ascending for determinism). If multiple participants hold active subscriptions, only one is set as sponsor; the others still benefit from trip-level premium access via the sponsor mechanism but are not marked as sponsor themselves.
- If the sponsor's subscription lapses mid-trip, premium access for co-participants persists until the trip's end date — checked at app launch and cached locally
- On the next trip creation, sponsorship is re-evaluated against the current subscription status
- If no participant holds a premium subscription, premium features are gated individually per user

### Days & Events

**`trip_days`**
id, trip_id, day_number, date

**`events`**
id, trip_day_id, trip_id, category, subcategory, title, start_time, end_time, address, contact_name, contact_phone, contact_email, confirmation_number, reservation_details, notes, ai_generated (bool), linked_transport_event_id (uuid nullable — used by Activity events to reference the transport event shown in their Transport tab), display_order, created_at, updated_at

**`event_participants`**
id, event_id, user_id (nullable), guest_profile_id (nullable)

**`event_documents`**
id, event_id, label, type (photo/document/scan/qr), storage_url, created_at
- Supported upload methods: camera photo, device library, file picker (PDF, image)
- On scan (type = scan or qr): Gemini Vision parses content and auto-fills relevant event fields where possible (e.g. boarding pass → airline, flight number, times)
- All files stored in Supabase Storage, accessible offline if pre-saved

### Planning & Packing

**`trip_tasks`**
id, trip_id, title, category, is_completed, is_suggested (bool), is_dismissed (bool), snoozed_until (timestamp, nullable), source (user/ai), created_at

**Pre-trip checklist population (premium users only):**
- On trip creation for premium users, Gemini 2.5 Pro generates suggested tasks as an async job; free users receive no AI-generated suggestions and see no Suggested Tasks section
- Input: user's citizenship countries, country of residency, trip destination(s), trip dates, medical/accessibility needs, dietary requirements
- Output: categorised list of suggested tasks (visa, insurance, medication import, banking, driving permit, e-SIM, vaccinations, accessibility needs)
- Suggestions written to `trip_tasks` with `is_suggested = true`
- User can: Confirm (sets `is_suggested = false`, moves to My Tasks section), Dismiss (sets `is_dismissed = true`, never resurfaces), or Snooze (sets `snoozed_until` to now + 48 hours; a Supabase cron job runs hourly, queries for tasks where `snoozed_until <= now()`, and resets `snoozed_until` to NULL so the task resurfaces in the Suggested Tasks section)
- **My Tasks query rule:** My Tasks section shows all `trip_tasks` where `is_suggested = false` AND `is_dismissed = false` AND `is_completed = false` (or completed=true for the completed sub-list). Source field (`user` or `ai`) is irrelevant to the My Tasks filter — what matters is `is_suggested = false`, which means the user has either manually created the task, confirmed an AI suggestion, or added it via URL extraction Quick Add.
- User can also manually add tasks at any time

**`in_the_bag_items`**
id, trip_id, trip_day_id (nullable), event_id (nullable), title, is_packed (bool), is_ai_suggested (bool), created_at

**Scoping and rollup logic:**
- Items with `event_id` set are event-scoped; in this case `trip_day_id` must be NULL (not duplicated from the parent event's day) and `trip_id` is set for RLS purposes only
- Items with `trip_day_id` set (and `event_id` NULL) are day-scoped; `trip_id` is also set
- Items with only `trip_id` set (both `trip_day_id` and `event_id` NULL) are trip-scoped
- Day-level In the Bag view: shows all event-scoped items for that day's events, plus day-scoped items; deduplicates by exact title match (case-insensitive); grouped by event for context
- Event-level view: shows only items scoped to that event
- Manual add: user can add to any scope from the relevant In the Bag screen
- Free users: manual add only — no AI suggestions
- Premium users: AI suggestions pre-populated per event based on event type, destination, weather, and user medical/dietary/accessibility profile

### System

**`subscriptions`**
id, user_id, type (monthly/lifetime), status (active/expired/cancelled), expires_at, revenuecat_customer_id, updated_at

**`async_jobs`**
id, type (treasure_map_generate / cover_photo_fetch / youtube_extract / tiktok_extract / flight_lookup / ai_trip_suggest / ai_day_suggest / pre_trip_checklist_generate / in_the_bag_suggest), status (pending/processing/completed/failed), input (jsonb), output (jsonb), trip_id (nullable), event_id (nullable), user_id, created_at, completed_at, error (nullable)

Cover photo fetch (`cover_photo_fetch`): queued at trip creation — Gemini searches for a representative destination image and returns a URL; image downloaded and saved to Supabase Storage. Usable with placeholder immediately.

`in_the_bag_suggest` is used for both scopes:
- Trip-level: queued once at trip creation (premium users only); `trip_id` set, `event_id` NULL; resulting `in_the_bag_items` rows must have `trip_day_id` NULL and `event_id` NULL (trip-scoped items per Section 6 scoping rules). At trip creation there are no events yet; the job generates general packing items based solely on destination, trip duration, and user profile (e.g. "travel adaptor", "sunscreen"). The job is not re-queued as events are added — event-level jobs cover event-specific items separately.
- Event-level: queued each time a new event is created for a premium user; `event_id` set, `trip_id` set; resulting `in_the_bag_items` rows must have `trip_day_id` NULL and `event_id` set (event-scoped items per Section 6 scoping rules)
- Scoping enforcement: the Edge Function output writer validates that `trip_day_id` is NULL before writing any `in_the_bag_items` rows; invalid rows are discarded and logged to the job's `error` field rather than written with incorrect scope

**`feature_flags`**
id, key, enabled (bool), description, updated_at

Example flags (not exhaustive):
- `treasure_map_enabled` — toggle Treasure Map feature globally
- `ai_url_extraction_enabled` — toggle YouTube/TikTok extraction
- `memories_puzzle_style_enabled` — toggle Puzzle display style for memories
- `stats_healthkit_enabled` — toggle Apple Health integration

**`event_categories`**
id, name, display_order, icon_name, is_custom (bool), is_cruise_only (bool)

The `is_cruise_only` flag controls whether a category appears in the event type picker. For non-cruise trips, the category picker filters out rows where `is_cruise_only = true` (e.g. Shore Excursion). For cruise trips, all categories are shown. This filtering is applied at the application layer when building the category picker list.

**`event_subcategories`**
id, category_id, name, display_order

**`milestone_banner_states`**
id, trip_id, user_id, banner_key (varchar — values: `insurance_30d` / `visa_14d` / `esim_7d` / `offline_docs_7d` / `wifi_day_of`), dismissed_at (timestamp, nullable), resurface_at (timestamp, nullable), action_taken (varchar nullable — `confirm` / `dismiss` / `save_now`, for analytics only)

This table stores the per-user per-trip per-banner state. On Summary tab load, the app queries this table to determine which banners to display.

**Banner display query rule per banner_key:**
- `insurance_30d`, `esim_7d`, `offline_docs_7d`, `wifi_day_of`: show if `dismissed_at` IS NULL AND (`resurface_at` IS NULL OR `resurface_at` <= now()). These banners support "Remind Me Later" (snooze).
- `visa_14d`: show if `dismissed_at` IS NULL. This banner has no snooze; `resurface_at` is always NULL for this key.

**Snooze write path:** when the user taps "Remind Me Later" on a snooze-eligible banner, the app sets `resurface_at = now() + 24 hours` (from the moment of the tap, not from the banner's first render). `dismissed_at` remains NULL until the user taps Confirm or Dismiss.

### Row-Level Security
- Users can only read/write their own data
- Trip participants can read trip, day, and event data for trips they are on
- Guest profiles are only editable by their managing user
- Premium gating checked via `subscriptions` table or `trip_participants.is_premium_sponsor`

---

## 7. Global UI Rules

- **No emojis anywhere in the UI** — not in labels, buttons, placeholders, or AI-generated content
- Back button top-left on every screen
- Settings gear top-right on every screen (shortcuts to Settings)
- Timezone follows device timezone at all times
- Date format follows user preference (default: DD-MM-YYYY)
- Time format follows user preference (default: device setting, 12hr or 24hr)
- Colour scheme: Light / Dark / Auto (follows device system setting)
- All fonts and UI elements follow Apple Human Interface Guidelines

---

## 8. Navigation Structure

**Bottom Tab Bar (persistent):**
Home — Explore — + (context-sensitive) — Stats — Profile

The Profile tab uses the user's profile photo as its icon (circular crop, same size as standard tab icons). If no profile photo has been set, a placeholder avatar (initials if a name is available, silhouette if not) is used. When an active premium subscription is in effect, the profile photo is ringed with a gold border to indicate premium status — the ring appears on the tab bar icon on every screen. This is the only visual premium indicator in the persistent UI.

In demo mode: the Profile tab shows a silhouette placeholder (no name, no photo). The gold ring is shown when `demo_tier = 'premium'` — this allows testers to verify the ring rendering without a real subscription.

Settings accessible via gear icon on every screen (not in tab bar).

**Context-sensitive + button behaviour by screen:**

| Current screen | + action |
|---|---|
| Home | Create new trip |
| Trip Summary tab | Open Add to Whole Trip sheet (same category → subcategory → detail flow as Add to Day, but the user selects the trip day within that sheet rather than it being pre-selected; distinct from the pre-trip checklist inline + which adds tasks; see Section 24 for the conditional Offline Documents button also on this tab; the floating backpack icon also appears at bottom-right, separate from the tab-bar +) |
| Trip Day tab | Open Add to Day sheet |
| Event Screen | Add document/photo to current event (this is the tab-bar + button; the floating backpack icon is a separate persistent button that opens the In the Bag sheet — two different action targets coexist on the Event Screen) |
| In the Bag (event) | Add item to event packing list *(In the Bag is a bottom sheet modal — these are states of the same sheet, not separate screens pushed onto the navigation stack)* |
| In the Bag (day) | Add item to day packing list *(same bottom sheet modal, day-scoped state)* |
| Explore | Start new AI conversation |
| Stats | No action (+ hidden) |
| Profile | Add family member |
| Settings | No action (+ hidden) |

**Screen Hierarchy:**
```
Home
└── Trip Screen
    ├── Summary Tab
    │   ├── Add to Whole Trip sheet (tab-bar + button)
    │   └── In the Bag — Trip level (floating backpack icon → bottom sheet modal)
    ├── Day Tab (one per day, left-side tabs: Day N | DAY | DD/MM)
    │   ├── Add to Day sheet (category → subcategory → detail)
    │   └── Event Screen
    │       ├── Summary tab
    │       ├── Tickets tab
    │       ├── Transport tab
    │       └── Documents tab
    └── Treasure Map (premium) — full-screen overlay opened via map icon button on Trip Screen header; not a tab; has its own back navigation via iOS back button
        └── Event-level Treasure Map (full-screen push; opened by tapping a day tile; back returns to day-level Treasure Map)
            └── Event Screen (opened by tapping an event tile; back returns to event-level Treasure Map)

Explore (premium)
└── AI Assistant
    ├── Find a Holiday mode
    └── Enhance My Trip mode

Stats
└── Travel Dashboard + Apple Health

Profile
├── My Details
├── Family Members
├── Trip History
└── Stats (mirrors Stats tab)

Settings
├── Preferences
└── Account
```

---

## 9. Onboarding Flow

1. Splash screen with app logo
2. Options: Sign Up / Log In / Continue with Apple / Continue with Google / Continue as Guest (Demo Mode) *(demo option visible only in development and TestFlight builds, gated by a build flag; hidden in production App Store builds)*
3. New account setup:
   - Full name
   - Profile photo (optional — all users, free and premium)
   - Country of residency
   - Citizenship countries (multi-select)
4. Medical section (optional, skippable, can be completed later in Profile):
   - Disability and accessibility needs
   - Medical conditions
   - Medications
   - Food allergies
   - Dietary requirements
5. Passport expiry (optional — date only, no passport number stored)
6. Home screen — empty state prompts user to create first trip or explore

---

## 10. Home Screen

**Active / Upcoming Trips section:**
- Displayed in user's chosen style: Tiles, Stacked, or Treasure Map thumbnail
- Each trip card: destination photo, trip name, dates, participant avatars
- Centre + creates a new trip

**Past Trips — Memories section:**
- Appears below active trips once at least one trip has ended
- Style toggle on Home screen cycles through display options:
  - **Postcards** — landscape card with destination photo and handwritten-style caption; generated on-device using trip cover photo + Skia text rendering
  - **Fridge Magnets** — small rounded tile with a destination illustration; generated on-device
  - **Polaroids** — slightly rotated white-bordered photo with a handwritten caption; generated on-device
  - **Passport Stamps** — stamp-style graphic in a passport-page layout; generated on-device
  - **Puzzle Pieces** — each past trip is a puzzle piece; the collection grows and interlocks over time; generated on-device
  - **Monopoly Figures** — isometric miniature figure themed to destination; generated on-device using pre-designed destination-themed assets
- All Memories styles generated on-device using Skia — Imagen 3 is not used for Memories
- Style preference saved per user in Settings

---

## 11. Family Invitation Flow

1. User taps + on Family Members screen (in Profile) or inline on trip/event participant selector
2. Enters invitee's email address and selects their family role
3. App sends a branded invitation email via Resend containing a deep link with a unique token
4. Invitee receives email → taps link → app opens (or App Store if not installed) → prompted to create account or log in
5. On account creation/login: invitation is accepted, `family_invitations` status updated to `accepted`, invitee added to the inviter's family group (`family_group_members` row created with the `family_group_id` from the invitation). If the invitee already belongs to a different family group, they are added to the inviter's group as well — a user can belong to multiple family groups. The invitee's existing family group memberships are not removed.
6. Inviter receives push notification: "X has joined your family on In the Bag"
7. If invitee declines: status set to `declined`; inviter is not notified (no pressure flow)
8. Invitations expire after 14 days (status set to `expired` by scheduled Edge Function); inviter sees expired status and can resend
9. A dedicated "Pending Invitations" section in Family Members screen shows outstanding invitations with resend/cancel options

---

## 12. Create Trip Flow

1. Trip name (auto-suggested from destination, editable)
2. Destination(s) + dates — multi-destination checkbox expands to add cities with individual date ranges
3. Family member selector:
   - Profile photo thumbnail + first name for each family group member
   - Tap to toggle inclusion on the trip
   - + at end of row adds a new family member inline (opens mini add-member sheet without leaving create trip flow)
   - Both linked accounts and guest profiles appear
4. Cruise toggle:
   - **No:** standard trip creation continues
   - **Yes:** collects cruise company, ship name, departure port, destination port, stops, package inclusions; day-level planning simplified
5. Cover photo: A placeholder cover image is shown immediately on trip creation. A `cover_photo_fetch` async job is queued; the Edge Function calls Gemini 2.5 Pro with Google Search grounding enabled, prompts it to find a high-quality destination photo for the trip location, and uses the grounded search result URL. The image is downloaded and saved to Supabase Storage; `trips.cover_photo_url` is updated and the app refreshes via Realtime. This is web search retrieval with grounding, not Imagen 3 generation. User can replace the cover photo from their device library at any time.
6. Before saving: the client computes the Treasure Map layout synchronously — generates a random seed and derives tile positions, bezier control points, and rotation angles; this is written to `trips.treasure_map_layout` as part of the trip creation database write (not as an async job). This happens for all users so the layout is ready if they later upgrade to premium.
7. Trip saved → opens Trip Summary tab
8. Async jobs queued on trip save: `cover_photo_fetch` (all users), `pre_trip_checklist_generate` (premium users only — free users can manually add tasks but receive no AI-generated suggestions), `treasure_map_generate` (premium users only — generates the Imagen 3 background image; the layout computed in step 6 is already stored), `in_the_bag_suggest` for trip-level items (premium users only)

---

## 13. Trip Screen

### Summary Tab

- Cover photo header with trip name, destination, dates, participant avatars
- **Milestone banners** (dismissable, appear at top of Summary tab):
  - 30 days out: "Have you organised travel insurance?" — with Confirm (marks done, never resurfaces) and Remind Me Later (resurfaces in 24 hours) buttons
  - 14 days out: "Confirm your visa and immigration requirements" — with Confirm ("I've sorted this") and Dismiss ("Not applicable to me"). Both actions write `dismissed_at = now()` and `action_taken = 'confirm'` or `action_taken = 'dismiss'` respectively to `milestone_banner_states`. Both permanently hide the banner; the semantic difference is captured in `action_taken` for analytics only.
  - 7 days out: "Organise an e-SIM so you're online when you land" — with Confirm (marks e-SIM as done, banner never resurfaces) and Remind Me Later (resurfaces in 24 hours)
  - 7 days out: "Save critical documents for offline access" — with Save Now and Later buttons; Save Now triggers offline save of visa/immigration docs, airport transport confirmations, hotel confirmation, boarding passes. This banner fires independently of the e-SIM banner; both appear simultaneously at 7 days. They are separate reminders about separate tasks.
  - Day of trip: "Connect to airport WiFi as soon as you land" — dismissable reminder
  - Banners are dismissable individually; dismissed state stored per trip per user in Supabase (so dismissal syncs across devices)
  - Relationship to push notifications: push notifications (Section 23) fire when the app is backgrounded or closed; in-app milestone banners appear when the user opens the trip Summary tab; both systems fire independently — a user who dismisses a push notification still sees the in-app banner on next visit, and vice versa. The "Remind Me Later" resurfacing logic applies only to in-app banners, not to push notifications.
  - Snooze duration: all "Remind Me Later" banners snooze for 24 hours. The 48-hour snooze applies only to pre-trip checklist suggested tasks (Section 6), not to milestone banners.
- **Pre-trip checklist:**
  - My Tasks section: user-created tasks + confirmed AI suggestions
  - Suggested Tasks section: AI-generated suggestions (premium users only) with Confirm / Dismiss / Snooze per item; free users see no Suggested Tasks section — only My Tasks with a manual inline + button to add tasks
  - Tasks marked complete with a checkbox
  - The checklist section has its own inline + button (adds a task to My Tasks). This is separate from the tab-bar + button, which opens the Add to Whole Trip sheet for adding events/activities. Both + actions coexist on the Summary tab: the tab-bar + is the primary floating action button; the checklist inline + is a smaller + within the checklist list itself.
- **Social media post creator** (share icon, top-right of Summary tab):
  - Generates a shareable Postcard or Stats Card image from trip data
  - Postcard: destination cover photo + trip name + dates + styled text
  - Stats Card: trip stats summary (destinations, events, participants)
  - Both formats saved to camera roll as PNG
  - Premium feature — greyed out with upgrade prompt for free users

### Day Tabs

- Left-side tabs: Day N / weekday abbreviation / date (e.g. Day 3 WED 16/7)
- Active tab highlighted; inactive tabs dimmed
- Events shown in chronological order in user's display style (Tiles / Stacked)
- Treasure Map is a separate overlay view, not a tab — accessed via a map-pin icon button positioned in the top-right area of the Trip Screen header (alongside the settings gear icon). The icon is visible to all users; for free users, tapping it shows the standard upgrade prompt sheet (Section 22) rather than opening the Treasure Map.
- Social media post creator per day (share icon in day header) — premium only
- Centre + opens Add to Day

### Add to Day / Add to Whole Trip

**Add to Whole Trip sheet step order:** (1) Day-picker — user selects which trip day; (2) Cap check — if that day has 3 events (free tier), upgrade prompt replaces the rest of the flow; (3) Add with AI option + Category picker; (4) Subcategory picker; (5) Detail sheet.

**Add to Day sheet step order:** (1) Cap check (day is pre-selected); (2) Add with AI option + Category picker; (3) Subcategory picker; (4) Detail sheet.

Action sheet presents:
1. **Add with AI** (top of list)
   - **Premium:** fully active — user types natural language input; Gemini reviews trip context, location, remaining days, and user medical/dietary profile; asks 1–2 clarifying questions in a short conversational flow; returns 3–5 suggestion cards; each card has a Quick Add button
   - **Free:** visible but greyed out with "Premium" badge; tapping shows a full-screen upgrade prompt sheet with pricing and feature list
2. Standard categories (TRANSPORT / ACCOMMODATION / ACTIVITY / MEAL / REST / HEALTH / FREE TIME / Add New Category)

Category → subcategory picker → detail sheet (fields adapt per subcategory — see Section 14)

**On event save (premium users only):** an `in_the_bag_suggest` async job is queued with `event_id` set, generating packing suggestions for that specific event. The In the Bag sheet on the event will show a loading state until the job completes.

**Free tier event cap:** When the user taps + to open Add to Day or Add to Whole Trip, the cap check is enforced at the point the user selects a day. For Add to Day, the day is pre-selected (the current day tab), so the check happens immediately before the category picker. For Add to Whole Trip, the day-picker is shown first; after the user picks a day, the app checks whether that day already has 3 events before proceeding to the category picker — if yes, the upgrade prompt is shown instead. In both cases, the upgrade prompt replaces the category picker entirely (the category picker is never shown). See Section 22 for upgrade prompt content variants by user type. This check applies to authenticated free users only. Demo mode users are not subject to this cap regardless of their selected demo tier — all monetisation gates, including event caps, are bypassed in demo mode.

---

## 14. Event Detail Fields by Category

| Category | Subcategories | Key Fields | Tabs shown |
|---|---|---|---|
| Transport — Air | (none) | Airline, flight number (auto-fetches details); camera scan for boarding pass/QR (Gemini Vision parses); visa/immigration prompt if international | Summary, Tickets, Documents |
| Transport — Road | Car hire, taxi, shuttle, bus, self-drive | Provider, pickup/dropoff location, confirmation number | Summary, Documents *(no Tickets tab — road transport bookings are stored as documents, not scannable tickets)* |
| Transport — Rail | Train, tram, metro | Operator, route, departure/arrival times, booking ref | Summary, Tickets, Documents |
| Transport — Water | Ferry, cruise leg, water taxi | Operator, route, departure/arrival, booking ref | Summary, Tickets, Documents |
| Accommodation | Hotel, Airbnb, resort, hostel, other | Property name, address, check-in/out times, confirmation number, contact name/phone | Summary, Documents |
| Activity | Theme park, show, sightseeing, sporting event, exhibition, tour, other | Name, address, start time, booking ref | Summary, Tickets, Transport, Documents |
| Meal | Restaurant, cafe, food tour | Name, address, time, reservation details, dietary flags from user profile shown as reminder | Summary, Documents |
| Rest | (free-form) | Notes only | Summary |
| Health | Appointment, pharmacy, medical | Provider name, address, time, notes | Summary, Documents |
| Free Time | (free-form) | Notes, location (optional) | Summary |
| Shore Excursion *(cruise trips only)* | (none) | Excursion name, port, operator, start time, duration, booking ref, meeting point | Summary, Tickets, Documents |

**Tab visibility:** Tabs are shown conditionally based on the event category per the table above. Rules:
- Tickets tab: shown only for Transport — Air, Transport — Rail, Transport — Water, and Activity
- Transport tab: shown only for Activity — it links to a transport event that serves as the journey to this activity; Transport-category events do not have a Transport tab (a flight does not need "how to get to the flight")
- Documents tab: shown for all categories except Rest and Free Time. This exclusion is intentional design — Rest and Free Time are unstructured buffer entries not associated with bookings or paperwork. Users needing to attach a medical document should use the Health category instead.
- Transport-category events (Air, Road, Rail, Water) do not have a Transport tab pointing to themselves
- Accommodation events have no Tickets tab. Hotel QR codes, digital keys, and check-in confirmations are stored in the Documents tab of the Accommodation event, not a Tickets tab. The Tickets tab is reserved for scannable transport and event entry tickets.

---

## 15. Event Screen

Tabs shown depend on event category (see Section 14).

- **Summary:** all core fields editable via Edit button (re-opens detail sheet pre-filled); participants list; In the Bag floating icon
- **Tickets:** upload (device library), photograph (camera), or scan (Gemini Vision) tickets and QR codes; displayed as tappable full-screen-capable cards; stored in Supabase Storage
- **Transport:** how to get to this event — search existing transport events on the same day (shows a list of that day's Transport-category events as tappable cards to link) or create a new transport event inline. The inline compact modal shows: (1) Transport subcategory selector; (2) fields that adapt per subcategory — Road shows provider + pickup location + start time; Air shows airline + flight number + start time; Rail shows operator + route + start time; Water shows operator + route + start time. On save, the new event is added to the day's event list and its id written to `events.linked_transport_event_id` on the Activity event.
- **Documents:** any additional files (maps, vouchers, itineraries, medical certificates); upload via camera, device library, or file picker (PDF, image); Gemini Vision optionally parses scanned documents to surface key fields; all files stored in Supabase Storage

---

## 16. In the Bag

**Floating backpack icon:**
- Appears on every Day screen and every Event screen
- Also appears on the Trip Summary tab — tapping it opens the trip-level In the Bag view (see below). On the Summary tab, the floating backpack icon and the tab-bar + button coexist: the tab-bar + is positioned at the bottom-centre (standard tab bar position); the backpack icon floats at the bottom-right corner above the tab bar. They are visually distinct and do not conflict.
- Persistent soft glow + drop shadow — visually floats above screen content
- Subtle sparkle animation on first appearance each session (Reanimated)
- Position varies by screen to avoid obscuring primary content — defined per screen layout
- Tapping opens In the Bag as a bottom sheet modal

**Event-level In the Bag:**
- Shows items scoped to that event (event_id matches)
- Premium: AI suggestions pre-populated based on event type, destination, weather, and user medical/dietary/accessibility profile
- Free: manual add only
- Items checked off as packed

**Day-level In the Bag:**
- Amalgamates all event-scoped items for that day's events + day-scoped items
- Deduplication: items with identical titles (case-insensitive) shown once; tooltip indicates which events require that item
- Grouped by event for context, with a "Day-level items" section at the bottom
- Manual add at day level creates a day-scoped item
- Packed state is per-item, not per-event — checking off "sunscreen" marks it packed for the whole day

**Trip-level In the Bag:**
- Accessible from the Trip Summary tab via the floating backpack icon
- Shows items with only `trip_id` set (no `trip_day_id`, no `event_id`) — trip-wide items not tied to a specific day
- Used for general packing items applicable to the whole trip (e.g. "travel adaptor", "sunglasses")
- Manual add creates a trip-scoped item
- Premium: AI suggests trip-wide items on trip creation based on destination, trip duration, and user profile

**Free vs Premium:**
- Free: manual add (tap + to type item name)
- Premium: AI suggestions arrive automatically; sparkle animation plays when new AI suggestions are added

---

## 17. Treasure Map (Premium)

**Rendering:** React Native Skia canvas

**Layout generation (one-time, synchronous at trip save):**
- A random seed and the resulting tile positions, path bezier control points, and rotation angles are computed on the client at the moment the trip is saved, then written to `trips.treasure_map_layout` as part of the trip creation database write. This is synchronous — the layout is available immediately when the trip is first opened. The `treasure_map_generate` async job covers only the Imagen 3 background image generation, not the layout.
- A random seed is generated and stored in `trips.treasure_map_layout`
- Seed determines: tile anchor positions, bezier path control point offsets, tile rotation angles
- Tiles are placed as waypoints along a single continuous flowing path — not scattered independently
- Path is one cubic bezier curve per segment; control points offset organically to create bowing, winding curves
- The same layout renders consistently across all devices using the stored seed
- Layout is never re-randomised after creation (prevents confusion for users who have memorised the map)

**Background:**
- Gemini Imagen 3 generates a hand-drawn illustrated map themed to the destination
- Generated as async job on trip creation (premium users only)
- Stored in Supabase Storage; placeholder parchment texture shown until complete
- Cruise trips: nautical/pirate ocean theme

**Tiles:**
- Light parchment with dark brown text and border
- Slight rotation per tile (from stored seed)
- Small anchor dot where tile connects to path

**Progressive disclosure — zoom-level triggered:**

| Zoom level | Tile content |
|---|---|
| Default (opens at this scale) | Day number + weekday + date + event count (e.g. "4 events") |
| Zoomed out — mid | Day number + weekday + date |
| Zoomed out — minimum (pinch limit) | DAY 1, DAY 2, etc. only |

The default scale is the maximum zoom level. The table above covers all three distinct content states corresponding to the three zoom levels.

**Canvas behaviour:**
- Pannable in all directions (React Native Gesture Handler)
- For longer trips: path and tiles extend off-screen in any direction; user pans to follow
- Pinch-to-zoom: default scale is the maximum zoom level (cannot zoom in further); pinching out (zoom out) shrinks tiles through progressive disclosure states per the table above
- Minimum scale (fully zoomed out): tiles show day label only
- Maximum scale (default, fully zoomed in): tiles show day number + weekday + date + event count

**Day vs Event level:**
- Day level: one tile per day, path connects days chronologically
- Tapping a day tile drills into event level: a new Treasure Map canvas appears showing individual event tiles for that day in chronological order by start time, connected by the same path style; the canvas is presented as a full-screen push navigation (event-level Treasure Map)
- Back navigation from event-level Treasure Map: standard iOS back button (top-left) returns to the day-level Treasure Map
- Tapping an event tile on the event-level Treasure Map navigates to that Event Screen (standard push navigation); back from Event Screen returns to the event-level Treasure Map

---

## 18. Explore Screen (AI Assistant — Premium)

**Find a Holiday mode:**
- Conversational Gemini 2.5 Pro chat interface
- User describes what they want in natural language
- Gemini considers: travel dates, budget hints, group composition (from trip participants if a trip exists), medical/dietary/accessibility needs
- Returns 3–5 destination suggestions as tappable cards with: destination name, why it suits the user, best time to visit, rough itinerary outline
- Tapping a card starts the Create Trip flow pre-filled with that destination
- Conversation history stored in local device storage only (not Supabase); retained until the user starts a new conversation (tapping a "New Conversation" button clears history); cleared on app uninstall; no server-side conversation storage

**Enhance My Trip mode (URL extraction):**
- Requires at least one existing trip in the user's account; if no trips exist, the Enhance My Trip tab shows an empty state with a prompt to create a trip first
- If the user has multiple trips, a trip selector appears at the top of the Enhance My Trip screen before URL input — the user picks which trip the extraction is for; this determines both the day-picker options for Events and which trip's pre-trip checklist receives Tasks
- User pastes a YouTube or TikTok URL
- Supported: any public YouTube video URL; TikTok URLs (transcript/caption extraction where available)
- Gemini extracts: named locations, activities, restaurants, hotels, tips — with timestamps where available
- Presented as a tappable checklist: each item shows the recommendation and source timestamp
- User selects items → taps Quick Add → selects which trip day to add to → items are classified and created:
  - Location-based items (restaurants, hotels, attractions, tours, landmarks) → created as events with the appropriate category (Meal, Accommodation, Activity)
  - Tips, advice, packing reminders, practical notes → created as trip tasks in the pre-trip checklist
  - Gemini performs this classification during the extraction async job. When the job completes, the checklist is shown with each item already labelled (Event or Task). The user can toggle any item's classification before acting. The day-picker trigger is evaluated at the moment the user taps Quick Add, based on the final classification state of the selected items — not dynamically as toggles happen. If the final selection after toggles contains any Event-type items, the day-picker is shown; if it contains only Task-type items, no day-picker is shown.
  - Day selection: when the user taps Quick Add:
    - If the selection contains only Task-type items: the tasks are written immediately to `trip_tasks`; no day-picker is shown; a brief toast confirmation appears ("X tasks added to your checklist")
    - If the selection contains any Event-type items (with or without Tasks): a day-picker is shown listing only the days belonging to the trip selected in the trip selector at the top of the Enhance My Trip screen; Tasks are written immediately in the same action; no separate confirmation for tasks
  - All Task-type writes go to the selected trip's `trip_tasks` table with `source = 'ai'` and `is_suggested = false`. These writes are independent of any in-flight `pre_trip_checklist_generate` async job — both jobs write different rows to `trip_tasks` and do not conflict. If both complete around the same time, the Suggested Tasks section and My Tasks section may refresh in quick succession; this is acceptable behaviour. If any Event-type items are selected, a day-picker appears to assign those events to a trip day — all selected Event items are assigned to the same day. If the user needs events on different days, they tap Quick Add in multiple passes, selecting different events each time. This single-day-per-pass constraint is intentional for simplicity; users are expected to refine event timing after adding.
- Async job: `youtube_extract` or `tiktok_extract` — app shows loading state with Realtime update on completion

**Free users:** Explore tab visible; all content replaced with upgrade prompt

---

## 19. Stats Screen

Accessible from: bottom tab bar + Profile screen (same screen, two entry points)

**Travel Dashboard:**
- Total trips taken
- Total days away
- Countries visited (count + scrollable list)
- Cities visited (count + scrollable list)
- Total flights
- Total cruises
- Total train journeys
- Total road trips (car hire and self-drive events only; taxi, shuttle, and bus events are excluded from this count as they are not driver-led trips)
- Longest single trip
- Most visited country
- Most common travel companion
- Furthest distance from home (calculated from trip destination vs country of residency — geocoding is performed at stats display time via a Gemini grounded search call that returns approximate lat/long for each unique destination city and the user's country of residency; results cached locally per city in MMKV to avoid repeat lookups; straight-line haversine distance used)

**Apple Health Integration (HealthKit):**
- Data read: step count, active energy burned (kJ), flights climbed
- Filtered to trip date ranges only — not all-time health data
- Displayed as: total steps taken during travel, total kJ burned during travel, total floors/staircases climbed during travel
- Requires HealthKit permission request on first Stats screen visit
- Graceful degradation: Travel Dashboard displayed fully if permission denied; Health section shows "Enable in Settings" prompt
- Health data fetched on demand (not cached in Supabase — remains on device)

---

## 20. Profile & Family

**My Details:** all user fields — name, DOB, profile photo, contact info, address, country of residency, citizenship countries, passport expiry (date only), medical conditions, medications, food allergies, dietary requirements, disability/accessibility needs, family role

**Family Members:**
- The screen shows a merged view of all family group members across all groups the user belongs to (their own group + any groups they have been invited into). Members are deduplicated by user_id if they appear in multiple groups.
- Linked accounts section: accepted invitation members with profile photo + name
- Pending invitations section: outstanding invitations with status, resend, and cancel options
- Tap any member to view/edit their details (same fields as user profile)
- Remove member removes them from the family group (does not delete their account)
- + button: choose Send Invitation (email) or Add Guest Profile

**Trip History:** read-only list of all past trips; tapping opens in read-only mode with all events and documents accessible

**Stats:** mirrors Stats tab — same screen, same data

---

## 21. Settings

**Preferences:**
- Date format: DD-MM-YYYY (default) / YYYY-MM-DD / MM-DD-YYYY / DD-Month (e.g. 05 Aug)
- Time format: 12hr / 24hr
- Colour scheme: Light / Dark / Auto
- Display style: Tiles / Stacked / Treasure Map — the Treasure Map option is greyed out with a "Premium" badge for free users; tapping it shows the standard upgrade prompt sheet (Section 22); free users cannot select it

**Account:**
- Current subscription plan + expiry or "Free"
- Upgrade button (if free) — opens RevenueCat paywall
- Manage subscription (links to App Store subscription management)
- Restore purchase
- Change email (requires re-verification)
- Change password
- Sign out
- Delete account — requires typed confirmation; irreversible; triggers Supabase account deletion and RevenueCat customer deletion

---

## 22. Monetisation

| Tier | Price | Features |
|---|---|---|
| Free | $0 | Basic trip/event creation, max 3 events per day, manual entry, manual In the Bag, AI options visible but greyed out |
| Premium Monthly | $6.99/month | All features — AI planning, Treasure Map, social postcards, URL extraction, unlimited events, AI In the Bag suggestions |
| Premium Lifetime | $44.99 once-off | All premium features, permanent |

**Free tier event cap enforcement:**
When a free user taps + to add an event and the selected day already has 3 events, the Add to Day sheet does not open. A standalone upgrade prompt sheet is presented directly (bypassing the sheet entirely). The prompt explains the 3-event-per-day limit.
- For authenticated free users: prompt offers Monthly / Lifetime upgrade options and a Maybe Later button (standard RevenueCat paywall)
- Demo mode users: all monetisation gates are bypassed entirely — upgrade prompts, RevenueCat paywalls, and event caps do not apply. The selected demo tier (free/premium) is enforced directly via the `demo_tier` MMKV flag (see Section 5).

**Greyed-out AI interactions:**
- Authenticated free users: tapping any greyed-out AI feature shows a full-screen upgrade prompt sheet containing the feature description, pricing options (Monthly / Lifetime), and Subscribe / Restore Purchase / Maybe Later buttons
- Demo mode — Premium tier: all AI features are fully active; nothing is greyed out
- Demo mode — Free tier: AI features are greyed out; tapping shows a simple sheet with "Switch to Premium (demo)" and "Maybe Later"; no RevenueCat paywall; tapping "Switch to Premium (demo)" sets `demo_tier = 'premium'` in MMKV and refreshes the screen

**Family Premium Sharing:**
- One active premium subscriber on a trip sets `is_premium_sponsor = true` for their participant record
- All other participants on that trip unlock premium features for that trip only
- Premium access for co-participants persists until the trip's end date even if the sponsor's subscription lapses mid-trip
- Checked at app launch and cached locally for the session
- Family group capped at 8 members (linked + guest) to prevent abuse

**Premium sponsor re-evaluation on new trip creation:**
When a user creates a new trip, the app checks the `subscriptions` table for any trip participant who holds an active premium subscription. If the previous sponsor's subscription has lapsed, `is_premium_sponsor` is set to false for them. If another participant now holds an active subscription, they become the new sponsor. This check runs at the moment the trip is saved, not at app launch.

**Payment infrastructure:** RevenueCat — StoreKit, subscription lifecycle, webhooks to Supabase

---

## 23. Notifications

All notifications via Expo Notifications (push):

| Trigger | Message | Dismissable |
|---|---|---|
| 30 days before departure | Prompt to arrange travel insurance | Yes |
| 14 days before departure | Confirm visa/immigration requirements | Yes |
| 7 days before departure | Organise e-SIM for destination | Yes |
| 7 days before departure | Save critical documents offline | Yes — notification payload: `{ "action": "save_offline_docs", "trip_id": "<uuid>" }`. Two action buttons: "Save Now" — app reads the payload on launch/foreground, navigates to the trip Summary tab, and immediately invokes the same offline save function as the in-app "Save Now" banner button (no additional user interaction required); "Later" — dismisses the notification; in-app banner still appears on next Summary tab visit |
| Day of departure | Connect to destination airport WiFi on arrival | Yes |
| Family invitation received | "[Name] has invited you to join their family on In the Bag" | Yes |
| Treasure Map ready | "Your Treasure Map for [trip] is ready" | Yes |
| Family member accepted invitation | "[Name] has joined your family on In the Bag" | Yes |

---

## 24. Offline & Data Resilience

**Selective offline save (user-triggered at 7-day milestone prompt):**
- Downloads to local device storage: visa/immigration documents (files in Documents tab of any Transport — Air event flagged as international), airport transport confirmations (all Transport-category events on the trip's first and last days), hotel confirmation (Accommodation event documents), and boarding passes scanned into the app (files in the Tickets tab of any Transport — Air event)
- Accessible without internet connection via a dedicated "Offline Documents" button on the Trip Summary tab (shown only after an offline save has been performed); opens a modal listing all saved documents, viewable without network access
- This button does not appear in the Screen Hierarchy navigation (Section 8) as it is a conditional element of the Summary tab, not a distinct screen

**General resilience:**
- Core trip data cached locally via MMKV for fast reads and offline fallback
- Read-only access to cached trip data if connection drops mid-trip
- Writes queued locally and synced when connection restored
- No full offline mode — app requires initial connection to sync

---

## 25. Social Media Integration (Premium)

**Postcard format:**
- Destination cover photo + trip/day name + dates + styled text overlay
- Rendered on-device via Skia; saved to camera roll as PNG

**Stats Card format:**
- Day or trip summary: event count, destination, participants, steps (if HealthKit connected), highlights
- Rendered on-device via Skia; saved to camera roll as PNG

No direct social media API integration — user saves to camera roll and uploads manually to any platform.

---

## 26. Cruise Mode

When a trip is flagged as a cruise:
- Collects: cruise company, ship name, departure port, destination port, stops (ordered list), package inclusions
- Day-level event categories available: Activity, Meal, Rest, Shore Excursion, Health, Free Time, and all Transport subcategories (Transport is not removed — passengers may still add ferry-to-shore legs, shuttle transfers, or flights to/from the embarkation port). The "simplified" planning refers to the pre-populated category suggestions, not a hard restriction on Transport.
- Pre-trip suggested tasks adapted: cruise insurance, port entry/visa requirements, onboard account setup, medical facility awareness
- Treasure Map available — nautical/pirate ocean theme for Imagen 3 generation

---

## 27. Out of Scope (v1)

- Android build (architecture is Android-ready; add after iOS launch)
- Passport number storage
- Direct social media API posting (user saves to camera roll manually)
- In-app messaging between family members
- Multi-language support (internationalisation-ready strings from day one)
- Web version

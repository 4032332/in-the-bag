# In the Bag — App Design Specification
**Date:** 2026-06-23  
**Version:** 1.0  
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
| AI — vision/scanning | Gemini Vision |
| Async job queue | Supabase Edge Functions + `async_jobs` table |
| Payments | RevenueCat (wraps Apple StoreKit) |
| Push notifications | Expo Notifications |
| Email delivery | Resend (or SendGrid) — branded sender |
| File storage | Supabase Storage |
| Apple Health | HealthKit (via Expo HealthKit or react-native-health) |

---

## 3. Architecture

**Pattern:** Expo app + Supabase + async Edge Functions (Approach C)

- Fast operations (CRUD for trips, events, tasks) → direct Supabase client calls with row-level security
- Heavy AI operations (Treasure Map generation, YouTube/TikTok extraction, flight data lookup, AI trip suggestions) → Supabase Edge Functions with async job queuing
- App polls or subscribes (Supabase Realtime) to `async_jobs` for job completion
- All AI calls routed through a single Edge Function service layer — swapping models or adding new AI features requires no changes to app code
- Feature flags stored in a `feature_flags` table — new features togglable without an app release
- Event categories and subcategories stored in the database — new types addable without a code change
- Internationalisation-ready string handling from day one
- No iOS-only APIs used unless unavoidable — Android can be added later with minimal rework

---

## 4. Scalability Principles

- Modular screen architecture — each feature area (trips, events, family, In the Bag, Treasure Map, Stats) is a self-contained module
- AI prompt layer abstracted into Edge Functions — model changes are transparent to the app
- Database-driven configuration (categories, subcategories, feature flags, suggested task rules)
- RevenueCat webhooks update Supabase subscription status — no polling required
- Supabase Realtime for family trip collaboration — changes by one participant appear for others without a refresh

---

## 5. Authentication & Branding

- Sign up / Log in via: Email + password, Sign in with Apple, Sign in with Google
- Email verification, family invitations, and password resets sent from branded address (e.g. `hello@inthebag.app`)
- All email templates fully designed in In the Bag brand — no Supabase branding visible
- Deep links route users from emails back into the app (Expo Linking)
- Custom auth domain (e.g. `auth.inthebag.app`) — Supabase not exposed in API calls
- **Guest / Demo Mode:** "Continue as Guest" button on onboarding bypasses account creation. Data stored locally only. User is prompted to save an account before exiting demo mode.

---

## 6. Data Model

### Users & Family

**`users`**  
id, email, full_name, date_of_birth, profile_photo_url, phone, address, country_of_residency, citizenship_countries[], passport_expiry, family_role (mother/father/grandmother/grandfather/other), disability_accessibility_needs, medical_conditions, medications, food_allergies, dietary_requirements, created_at

**`family_groups`**  
id, name, created_by_user_id, created_at

**`family_group_members`**  
id, family_group_id, user_id, role, joined_at

**`guest_profiles`**  
id, managed_by_user_id, full_name, date_of_birth, profile_photo_url, family_role, disability_accessibility_needs, medical_conditions, medications, food_allergies, dietary_requirements, created_at  
*(Same fields as users — managed by the primary user, no account required)*

**`family_invitations`**  
id, inviter_user_id, invitee_email, family_role, family_group_id, status (pending/accepted/declined), token, created_at, responded_at

### Trips

**`trips`**  
id, owner_user_id, name, cover_photo_url, is_cruise, cruise_details (jsonb), treasure_map_image_url, treasure_map_layout (jsonb — tile positions, path bezier data, seed), display_style (tiles/stacked/treasure_map), created_at, updated_at

**`trip_destinations`**  
id, trip_id, city, country, start_date, end_date, display_order

**`trip_participants`**  
id, trip_id, user_id (nullable), guest_profile_id (nullable), is_premium_sponsor (bool)  
*(premium_sponsor unlocks premium features for all participants on this trip)*

### Days & Events

**`trip_days`**  
id, trip_id, day_number, date

**`events`**  
id, trip_day_id, trip_id, category, subcategory, title, start_time, end_time, address, contact_name, contact_phone, contact_email, confirmation_number, reservation_details, notes, ai_generated (bool), display_order, created_at, updated_at

**`event_participants`**  
id, event_id, user_id (nullable), guest_profile_id (nullable)

**`event_documents`**  
id, event_id, label, type (photo/document/scan/qr), storage_url, created_at

### Planning & Packing

**`trip_tasks`**  
id, trip_id, title, category, is_completed, is_suggested (bool), is_dismissed (bool), source (user/ai), created_at

**`in_the_bag_items`**  
id, trip_id, trip_day_id (nullable), event_id (nullable), title, is_packed (bool), is_ai_suggested (bool), created_at  
*(scoped to event, day, or whole trip depending on which foreign keys are set)*

### System

**`subscriptions`**  
id, user_id, type (monthly/lifetime), status (active/expired/cancelled), expires_at, revenuecat_customer_id, updated_at

**`async_jobs`**  
id, type (treasure_map_generate/youtube_extract/tiktok_extract/flight_lookup/ai_trip_suggest/ai_day_suggest), status (pending/processing/completed/failed), input (jsonb), output (jsonb), trip_id (nullable), user_id, created_at, completed_at, error (nullable)

**`feature_flags`**  
id, key, enabled (bool), description, updated_at

**`event_categories`**  
id, name, display_order, icon_name, is_custom (bool)

**`event_subcategories`**  
id, category_id, name, display_order

### Row-Level Security
- Users can only read/write their own data
- Trip participants can read trip, day, and event data for trips they are on
- Guest profiles are only editable by their managing user
- Premium features gated by checking `subscriptions` table or `trip_participants.is_premium_sponsor`

---

## 7. Global UI Rules

- **No emojis anywhere in the UI** — not in labels, buttons, placeholders, or generated content
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

Settings accessible via gear icon on every screen (not in tab bar).

**Screen Hierarchy:**
```
Home
└── Trip Screen
    ├── Summary Tab
    │   └── Add to Whole Trip sheet
    ├── Day Tab (one per day, left-side tabs: Day N | DAY | DD/MM)
    │   ├── Add to Day (category → subcategory → detail sheet)
    │   └── Event Screen
    │       ├── Summary tab
    │       ├── Tickets tab
    │       ├── Transport tab
    │       └── Documents tab
    └── Treasure Map overlay (premium)

Explore
└── AI Assistant
    ├── Find a Holiday mode
    └── Enhance My Trip mode (URL extraction)

Stats
└── Travel Dashboard + Apple Health data

Profile
├── My Details
├── Family Members
│   ├── Linked accounts
│   └── Guest profiles
├── Trip History
└── Stats (mirrors Stats tab)

Settings
├── Preferences
│   ├── Date format
│   ├── Time format
│   ├── Colour scheme
│   └── Display style (Tiles / Stacked / Treasure Map)
└── Account
    ├── Subscription management
    ├── Change email / password
    ├── Sign out
    └── Delete account
```

---

## 9. Onboarding Flow

1. Splash screen with app logo
2. Options: Sign Up / Log In / Continue with Apple / Continue with Google / Continue as Guest (Demo Mode)
3. New users complete setup: full name, profile photo (optional), country of residency, citizenship countries
4. Medical section (optional, skippable): disability/accessibility needs, medical conditions, medications, food allergies, dietary requirements
5. Passport expiry (optional): date only, no passport number stored
6. Home screen — empty state prompts user to create first trip or explore via AI

**Demo Mode:**
- All features accessible locally
- Data not synced to server
- Persistent banner reminds user they are in demo mode
- Prompted to create account before adding a family member, enabling push notifications, or accessing premium trial

---

## 10. Home Screen

**Active / Upcoming Trips section:**
- Displayed in user's chosen style: Tiles, Stacked, or Treasure Map thumbnail
- Each trip card shows: destination photo, trip name, dates, participant avatars
- Centre + creates a new trip

**Past Trips — Memories section:**
- Toggle on Home screen cycles through memory display styles:
  - Postcards (landscape card, destination photo, handwritten-style caption)
  - Fridge Magnets (small rounded tile with destination illustration)
  - Polaroids (rotated white-bordered photo with caption)
  - Passport Stamps (stamp-style graphic in a passport layout)
  - Puzzle Pieces (each past trip is a puzzle piece; collection grows over time)
  - Monopoly Figures (isometric miniature metal figure themed to destination)
- Style preference saved per user

---

## 11. Create Trip Flow

1. Trip name (auto-suggested from destination)
2. Destination(s) + dates — multi-destination checkbox expands to add cities with individual date ranges
3. Family member selector — profile photo thumbnails + first name for each member; tap to include; + to add new family member inline
4. Cruise toggle:
   - **No:** standard trip creation continues
   - **Yes:** collects cruise company, ship name, departure port, destination port, stops, package inclusions; day-level planning simplified
5. Cover photo auto-fetched from Gemini based on destination; user can replace
6. Trip saved → opens Trip Summary tab
7. Treasure Map generation queued as async job; placeholder shown until complete

---

## 12. Trip Screen

### Summary Tab
- Cover photo header with trip name, destination, dates
- Participant avatars row
- **Pre-trip checklist:**
  - My Tasks (user-created or confirmed suggestions)
  - Suggested Tasks (AI-generated from citizenship + destination logic): visa requirements, travel insurance, international driving permit, medication import rules, banking/money, e-SIM, accessibility needs, vaccinations
  - Each suggested task: Confirm / Dismiss / Snooze
- **Milestone reminder banners:**
  - 30 days out: travel insurance prompt
  - 14 days out: visa/immigration confirmation prompt
  - 7 days out: e-SIM prompt; if unconfirmed → prompt to save critical documents offline (visa/immigration paperwork, airport transport confirmations, hotel confirmation)
  - Day of trip: reminder to connect to airport WiFi on arrival
- Social media post creator (share icon) — generates Postcard or Stats Card from trip data; saves to camera roll; premium only
- Centre + opens Add to Whole Trip sheet

### Day Tabs
- Left-side tabs displaying: Day N / weekday abbreviation / date (e.g. Day 3 WED 16/7)
- Active tab highlighted
- Events shown in chronological order in user's display style
- Social media post creator per day (share icon)
- Centre + opens Add to Day

### Add to Day / Add to Whole Trip
- Action sheet with category options + "Add with AI" at top
  - **Premium:** Add with AI fully active — user types natural language input; Gemini reviews trip context, location, and user medical/dietary profile; asks 1–2 clarifying questions; returns 3–5 suggestion cards; each card has a Quick Add button
  - **Free:** Add with AI visible but greyed out with "Premium" badge; tapping shows upgrade prompt
- Category picker → subcategory picker → detail sheet (fields adapt to subcategory)
- Family member selector on every event

### Event Detail Fields by Category

| Category | Subcategories | Key Fields |
|---|---|---|
| Transport — Air | (none) | Airline, flight number (auto-fetches details), boarding pass scan, visa/immigration prompt |
| Transport — Road | Car hire, taxi, shuttle, bus, self-drive | Provider, pickup/dropoff, confirmation |
| Transport — Rail | Train, tram, metro | Operator, route, departure/arrival, booking ref |
| Transport — Water | Ferry, cruise, water taxi | Operator, route, booking ref |
| Accommodation | Hotel, Airbnb, resort, hostel, other | Property name, address, check-in/out, confirmation, contact |
| Activity | Theme park, show, sightseeing, sporting event, exhibition, tour, other | Name, address, time, booking ref, subcategory |
| Meal | Restaurant, cafe, food tour | Name, address, time, reservation, dietary flags from profile |
| Rest | (free-form) | Notes only |
| Health | Appointment, pharmacy, medical | Provider, address, time, notes |
| Free Time | (free-form) | Notes |

---

## 13. Event Screen

Tabs: **Summary / Tickets / Transport / Documents**

- **Summary:** all core fields (address, contact name/phone/email, confirmation number, reservation details, notes, participants), edit button re-opens detail sheet pre-filled
- **Tickets:** upload, photograph, or scan tickets/QR codes; stored in Supabase Storage; displayed as tappable cards
- **Transport:** how to get to this event — links to an existing transport event or creates a new one
- **Documents:** additional files (maps, vouchers, itineraries, medical certificates) — upload or photograph

---

## 14. In the Bag

**Floating backpack icon:**
- Appears on every Day and Event screen
- Persistent soft glow (ambient light) + drop shadow so it floats visually above screen content
- Subtle sparkle animation on first appearance each session
- Implemented via React Native Reanimated for smooth, battery-efficient animation
- Position varies by screen to avoid obscuring key content

**Event-level In the Bag:**
- AI-suggested items (premium) based on event type, destination weather, and user medical/dietary/accessibility profile
- Manual items (free and premium)
- Items checked off as packed

**Day-level In the Bag:**
- Amalgamates all event-level lists for the day
- Deduplicates items that appear across multiple events
- Shows which event each item belongs to
- Manual add available at day level

**Free vs Premium:**
- Free: manual entry only
- Premium: AI suggestions pre-populated; sparkle animation plays when new AI suggestions arrive

---

## 15. Treasure Map (Premium)

**Rendering:** React Native Skia canvas

**Layout generation:**
- On trip creation, a randomised seed determines tile anchor positions and bezier path control points
- Tiles are placed as waypoints along a single continuous flowing path — not scattered independently
- Path is one cubic bezier curve per segment connecting tiles, with control points offset to create organic bowing curves
- No rigid left-right or spiral patterns — the path covers the whole canvas naturally
- Seed stored in `trips.treasure_map_layout` so the same layout renders consistently across devices

**Background:**
- Gemini Imagen 3 generates a hand-drawn illustrated map themed to the destination (e.g. pirate/tropical for Hawaii, samurai/feudal Japan for Tokyo)
- Generated async on trip creation; placeholder shown until complete
- Stored in Supabase Storage

**Tiles:**
- Light parchment-coloured with dark brown text and border
- Slight random rotation per tile (stored in layout seed)
- Small anchor dot where tile connects to path

**Progressive disclosure (zoom-dependent):**
- Full zoom: Day number + weekday + date + event summary
- Mid zoom: Day number + weekday + date
- Minimum zoom: Day label only (DAY 1, DAY 2, etc.)

**Canvas behaviour:**
- Pannable in all directions (up/down/left/right)
- For longer trips, path extends off-screen — user scrolls to follow
- Pinch-to-zoom supported
- Implemented via React Native Gesture Handler + Reanimated

**Day vs Event level:**
- Day level: one tile per day
- Event level (drill in by tapping a day tile): one tile per event, ordered chronologically by event start time

---

## 16. Explore Screen (AI Assistant — Premium)

**Find a Holiday mode:**
- Conversational Gemini 2.5 Pro interface
- User describes what they want ("10 days in October, two kids, beach, not too hot")
- AI suggests 3–5 destination options with reasons, best time to visit, and a rough itinerary outline
- Tapping a suggestion starts the Create Trip flow pre-filled with that destination

**Enhance My Trip mode:**
- User pastes a YouTube or TikTok URL
- Gemini extracts recommendations from video transcript/captions (timestamps noted where available)
- Presented as a tappable list with context
- User selects items to add → Quick Add routes them to a specific day/event
- YouTube: native Gemini URL understanding
- TikTok: transcript/caption extraction

**Free users:** Explore tab visible but locked with upgrade prompt

---

## 17. Stats Screen

Accessible from: bottom tab bar + Profile screen (same screen, two entry points)

**Travel Dashboard:**
- Total trips taken
- Total days away
- Countries visited (with map highlight)
- Cities visited
- Total flights
- Total cruises
- Total train journeys
- Total road trips
- Longest single trip
- Most visited country
- Most common travel companion
- Furthest distance from home

**Apple Health Integration (HealthKit):**
- Steps taken during travel dates
- Kilojoules burned during travel dates
- Floors/staircases climbed during travel dates
- Data filtered to trip date ranges only — not all-time health data
- Requires HealthKit permission request on first access
- Gracefully degrades if permission denied (Travel Dashboard still shown without health data)

---

## 18. Profile & Family

**My Details:** all user fields (name, DOB, profile photo, contact, address, residency, citizenship, passport expiry, medical info, food allergies, dietary requirements, family role)

**Family Members:**
- List of linked accounts (accepted invitations) — shown with profile photo and name
- List of guest profiles (unlinked) — shown with profile photo and name, editable
- Tap any member to view/edit their details
- Remove member option
- + button sends new invitation by email or creates new guest profile

**Trip History:** read-only list of all past trips; tapping opens the trip in read-only mode

**Stats:** mirrors Stats tab

---

## 19. Settings

**Preferences:**
- Date format: DD-MM-YYYY (default) / YYYY-MM-DD / MM-DD-YYYY / DD-Month (e.g. 05 Aug)
- Time format: 12hr / 24hr
- Colour scheme: Light / Dark / Auto
- Display style: Tiles / Stacked / Treasure Map

**Account:**
- Current subscription plan + expiry
- Manage subscription (opens App Store subscription management)
- Upgrade prompt (if free)
- Restore purchase
- Change email
- Change password
- Sign out
- Delete account (with confirmation — irreversible)

---

## 20. Monetisation

| Tier | Price | Features |
|---|---|---|
| Free | $0 | Basic trip/event creation, max 3 events per day, manual entry only, manual In the Bag, greyed-out AI options visible |
| Premium Monthly | $6.99/month | All features — AI planning, Treasure Map, social postcards, URL extraction, unlimited events, AI In the Bag suggestions |
| Premium Lifetime | $44.99 once-off | All premium features, permanent access |

**Family Premium Sharing:**
- If one trip participant holds an active premium subscription, all participants on that trip unlock premium features for that trip only
- Scoped to the trip — not account-wide
- Family group capped at 8 members to prevent abuse

**Payment infrastructure:** RevenueCat — handles StoreKit, subscription lifecycle, webhooks to Supabase

---

## 21. Notifications

All notifications via Expo Notifications (push):

| Trigger | Message |
|---|---|
| 30 days before departure | Prompt to arrange travel insurance |
| 14 days before departure | Confirm visa/immigration requirements |
| 7 days before departure | Organise e-SIM for destination |
| 7 days before departure (if no e-SIM confirmed) | Prompt to save critical documents offline |
| Day of departure (before leaving) | Reminder to connect to destination airport WiFi on arrival |
| Family invitation received | "X has invited you to join their family on In the Bag" |
| Treasure Map ready | "Your Treasure Map for [trip] is ready" |

---

## 22. Cruise Mode

When a trip is flagged as a cruise:
- Collects: cruise company, ship name, departure port, destination port, stops (list), package inclusions
- Day-level planning is simplified — fewer event categories presented (activities, meals, rest, shore excursions)
- Pre-trip suggested tasks adapted for cruise context (cruise insurance, port visa requirements, onboard account setup)
- Treasure Map still available — themed to ocean/nautical style

---

## 23. Offline & Data Resilience

**Selective offline save (triggered at 7-day milestone):**
- User prompted to save critical documents offline
- App downloads to local device storage: visa/immigration documents, airport transport confirmations, hotel confirmation, boarding passes
- Accessible without internet connection

**Day-of reminder:**
- Push notification before departure: connect to destination airport WiFi on arrival

**General:**
- Core trip data cached locally via Expo SQLite or MMKV for resilience
- Read-only access to cached trip data if connection drops mid-trip
- Writes queued and synced when connection restored

---

## 24. Social Media Integration (Premium)

**Postcard format:**
- Destination photo + trip/day name + styled text overlay
- Saved to camera roll as PNG

**Stats Card format:**
- Day or trip summary with event count, distance, steps (if Apple Health connected), highlights
- Saved to camera roll as PNG

Both formats generated on-device — no third-party sharing API required. User uploads manually to Instagram, TikTok, Facebook, or any platform.

---

## 25. Out of Scope (v1)

- Android build (architecture is Android-ready; add after iOS launch)
- Passport number storage
- Direct social media API posting (user saves to camera roll and uploads manually)
- In-app messaging between family members
- Multi-language support (internationalisation-ready strings from day one)
- Web version

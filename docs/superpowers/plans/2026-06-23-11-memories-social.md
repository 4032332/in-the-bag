# Memories & Social Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Memories section on the Home screen (six on-device Skia display styles for past trips) and the Social Media Post Creator (Postcard and Stats Card formats, saved to camera roll).

**Architecture:** All rendering is entirely on-device using React Native Skia — no Imagen 3 or server-side generation is involved. Each Memories style is a self-contained Skia renderer component; the Social Post Creator is a separate module that composes Skia canvases and writes PNGs to the camera roll via expo-media-library. The active Memories style is persisted to `users.pref_memories_style` in Supabase; the social post flow is gated behind the premium check and conditionally pulls step data from the HealthKit module introduced in Plan 8.

**Tech Stack:** React Native Skia, expo-media-library (camera roll save)

---

## File Structure

```
src/
  components/
    memories/
      MemoriesSection.tsx              # Container: fetches past trips, renders style toggle + list
      MemoriesStyleToggle.tsx          # Cycles through 6 styles; reads/writes pref_memories_style
      styles/
        PostcardRenderer.tsx           # Skia: landscape card, cover photo, handwritten-style caption
        FridgeMagnetRenderer.tsx       # Skia: small rounded tile, destination name, shadow
        PolaroidRenderer.tsx           # Skia: white border, random rotation, handwritten caption
        PassportStampRenderer.tsx      # Skia: circular stamp, destination + year, passport layout
        PuzzlePieceRenderer.tsx        # Skia: jigsaw piece per trip; interlocking grid logic
        MonopolyFigureRenderer.tsx     # Skia: isometric figure; composes destination SVG asset
    social/
      SocialPostCreatorSheet.tsx       # Bottom sheet entry point; Postcard / Stats Card tab picker
      PostcardCreator.tsx              # Skia composer for Postcard format
      StatsCardCreator.tsx             # Skia composer for Stats Card format (HealthKit-aware)
      SocialPostPremiumGate.tsx        # Greyed overlay + upgrade prompt for free users
  assets/
    monopoly-figures/
      beach.svg                        # Pre-designed isometric figure: beach/tropical destination
      mountain.svg                     # Pre-designed isometric figure: mountain/ski destination
      city.svg                         # Pre-designed isometric figure: city/urban destination
      desert.svg                       # Pre-designed isometric figure: desert/arid destination
      generic.svg                      # Fallback isometric figure for unclassified destinations
  hooks/
    useMemoriesStyle.ts                # Read/write pref_memories_style via Supabase + local cache
    useSocialPostCreator.ts            # Orchestrates Skia canvas → PNG → camera roll save
  utils/
    puzzlePieceGeometry.ts             # Interlocking jigsaw geometry: tab/slot positions per piece index
    destinationTheme.ts                # Maps destination city/country to monopoly figure asset key
    cameraRollPermission.ts            # expo-media-library permission request + denial handler
```

---

## Tasks

### Step 1 — Memories section scaffold and style toggle (2 min)

- [ ] Create `src/components/memories/MemoriesSection.tsx`
  - Queries Supabase for trips where end_date < today, ordered by end_date desc
  - Renders nothing if no past trips exist (section is hidden until at least one trip has ended)
  - Reads `pref_memories_style` from `useMemoriesStyle` hook; passes style + trip list to a renderer switcher
  - Renders `MemoriesStyleToggle` above the trip list
- [ ] Create `src/components/memories/MemoriesStyleToggle.tsx`
  - Displays current style label (Postcards / Fridge Magnets / Polaroids / Passport Stamps / Puzzle Pieces / Monopoly Figures)
  - Tap cycles to next style in the ordered list; wraps around
  - On change, calls `useMemoriesStyle` setter which writes to `users.pref_memories_style` via Supabase upsert and updates local MMKV cache immediately so the toggle feels instant
- [ ] Create `src/hooks/useMemoriesStyle.ts`
  - Reads from MMKV on mount; falls back to Supabase fetch if cache miss
  - Returns `[style, setStyle]`; `setStyle` writes to MMKV immediately then fires async Supabase upsert
  - Style enum: `postcards | fridge_magnets | polaroids | passport_stamps | puzzle_pieces | monopoly_figures`
- [ ] Add `MemoriesSection` to Home screen below the active/upcoming trips section
- [ ] Commit: `feat: memories section scaffold with style toggle and pref persistence`

---

### Step 2 — Postcards, Fridge Magnets, and Polaroids renderers (5 min)

- [ ] Create `src/components/memories/styles/PostcardRenderer.tsx`
  - Props: `trip` (name, coverPhotoUrl, startDate, endDate, primaryDestination)
  - Skia canvas: landscape card (e.g. 320×200 pt), rounded corners (8pt)
  - Layer 1: cover photo drawn via Skia `Image` (use `useImage` to load from URL; show placeholder rect while loading)
  - Layer 2: translucent dark gradient scrim at bottom third
  - Layer 3: handwritten-style text (use a bundled handwriting-style font loaded via `useFonts`; fall back to system italic if unavailable) — trip name on one line, "startDate – endDate" below in smaller size
  - Card has a subtle drop shadow (Skia `Paint` with blur mask filter)
  - Horizontal FlatList of cards in `MemoriesSection` when style = postcards

- [ ] Create `src/components/memories/styles/FridgeMagnetRenderer.tsx`
  - Props: same trip shape
  - Skia canvas: small square tile (96×96 pt), highly rounded corners (16pt)
  - Background: pastel colour derived deterministically from destination name hash (6 fixed pastel swatches; index = `hash(destination) % 6`)
  - Text: destination city in bold, capitalised, centred; country name below in smaller weight
  - Drop shadow slightly larger than postcard shadow to convey a "stuck on surface" feel
  - Horizontal FlatList in a wrapping grid layout (use `numColumns` on a FlatList or a simple flex-wrap View) when style = fridge_magnets

- [ ] Create `src/components/memories/styles/PolaroidRenderer.tsx`
  - Props: same trip shape; additionally a `rotation` value (deterministic from trip ID hash, range –6 to +6 degrees)
  - Skia canvas: portrait card (160×200 pt); white background
  - White border: 12pt on all sides, 24pt at bottom
  - Cover photo fills the inner photo area
  - Handwritten-style caption in the white bottom strip: trip name
  - Canvas rotated by `rotation` degrees using Skia `Canvas` transform
  - Slight drop shadow on card edges
  - Scattered/overlapping layout in `MemoriesSection` when style = polaroids — use absolute positioning with the same deterministic rotation + small x/y offsets derived from trip ID hash to create a "pile of photos" look; wrap in a ScrollView

- [ ] Commit: `feat: postcards, fridge magnets, and polaroids Skia renderers`

---

### Step 3 — Passport Stamps and Puzzle Pieces renderers (5 min)

- [ ] Create `src/components/memories/styles/PassportStampRenderer.tsx`
  - Props: same trip shape; `tripYear` (derived from startDate)
  - Skia canvas: circular stamp (120×120 pt)
  - Outer ring: thick stroke circle (colour: dark navy or burgundy, alternated by trip index)
  - Inner content: destination city name in caps, curved along the top arc (use Skia `TextPath` on a circular path); trip year in large bold numerals centred; country name curved along the bottom arc
  - Stamp has a slightly uneven/distressed appearance: apply a subtle noise texture layer (low-opacity Skia `ImageFilter` or hand-crafted SVG noise pattern drawn via Skia `Path`)
  - Layout: passport-page grid — a background rect styled as a cream/ivory passport page; stamps placed in a 2-column grid with slight random rotation per stamp (deterministic from trip ID)
  - Wrap the grid in a ScrollView when style = passport_stamps

- [ ] Create `src/utils/puzzlePieceGeometry.ts`
  - Exports `getPieceGeometry(index: number, totalPieces: number): PieceGeometry`
  - `PieceGeometry` defines: `boundingRect`, four edge tab/slot specs (top/right/bottom/left), each edge is `tab` | `slot` | `flat`
  - Interlocking rule: shared edges between adjacent pieces must be complementary (one tab, one slot). Adjacency is determined by a left-to-right, top-to-bottom grid layout. Edge assignment: right edge of piece N is `tab` → left edge of piece N+1 is `slot`. Bottom edge of piece N is `tab` → top edge of piece in same column on next row is `slot`. First row top edges and first column left edges are `flat`. Rightmost column right edges and bottom row bottom edges are `flat` (or `tab` for visual interest — consistent per column/row index).
  - Tab/slot curves are cubic bezier curves; control point offsets are fixed constants (not random) so pieces always fit regardless of total count.
  - Suggested tab geometry constants (export as named constants from `puzzlePieceGeometry.ts`):
    ```
    TAB_PROTRUSION = 10   // pt, how far the tab sticks out from the edge
    TAB_WIDTH_RATIO = 0.3 // tab base width as fraction of edge length
    Control points for cubic bezier:
        P1 = (edgeStart + edge*0.2, edgeY - TAB_PROTRUSION)
        P2 = (edgeStart + edge*0.8, edgeY - TAB_PROTRUSION)
      (For slots, flip the protrusion sign: + TAB_PROTRUSION)
    The TAB_PROTRUSION value (~10pt) is also used as the negative margin between adjacent
    pieces to create visual interlocking.
    ```
  - Grid column count: 2 for 1–4 pieces, 3 for 5–9 pieces, 4 for 10+ pieces.
  - Exports `getPieceGridPosition(index: number, totalPieces: number): { col: number, row: number }`

- [ ] Create `src/components/memories/styles/PuzzlePieceRenderer.tsx`
  - Props: same trip shape; `index` (piece index in collection); `totalPieces`
  - Uses `getPieceGeometry` to get the Skia `Path` for the piece outline (tab/slot bezier curves assembled into a closed path)
  - Fills the path with the cover photo clipped to the piece shape (Skia `clipPath`)
  - Destination name label centred on the piece in white bold text with a dark shadow
  - `MemoriesSection` when style = puzzle_pieces renders all pieces in a grid using `getPieceGridPosition`; pieces rendered at fixed size (120×120 pt bounding box) with slight spacing so tabs of adjacent pieces visually interlock (negative margin equal to tab protrusion depth, approximately 10pt)
  - ScrollView wraps the grid

- [ ] Commit: `feat: passport stamps and puzzle pieces Skia renderers`

---

### Step 4 — Monopoly Figures renderer and destination SVG assets (3 min)

- [ ] Create destination theme SVG assets in `src/assets/monopoly-figures/`:
  - `beach.svg` — isometric miniature figure: palm tree, sun hat, sandcastle; warm yellow/teal palette
  - `mountain.svg` — isometric figure: pine tree, snow-capped peak, ski poles; white/blue/green palette
  - `city.svg` — isometric figure: skyscraper silhouette, taxi cab, street lamp; grey/yellow/orange palette
  - `desert.svg` — isometric figure: cactus, camel, sand dune; orange/tan/red palette
  - `generic.svg` — isometric figure: suitcase, globe, compass; neutral navy/gold palette (fallback)
  - Each SVG is a self-contained 120×120 viewBox isometric scene; no external dependencies

- [ ] Create `src/utils/destinationTheme.ts`
  - Exports `getDestinationThemeKey(city: string, country: string): 'beach' | 'mountain' | 'city' | 'desert' | 'generic'`
  - Simple keyword matching (case-insensitive):
    - beach: countries/cities containing known island/coastal keywords (e.g. Bali, Maldives, Fiji, Hawaii, Cancun, Miami, Sydney, Barcelona coast cities)
    - mountain: cities/countries known for ski/alpine (e.g. Innsbruck, Whistler, Queenstown, Zermatt, Aspen, Nepal, Switzerland)
    - desert: Dubai, Abu Dhabi, Marrakech, Cairo, Phoenix, Las Vegas, Riyadh, Morocco, Egypt, UAE
    - city: capitals and major metros not matched by the above (London, Paris, Tokyo, New York, Singapore, etc.)
    - generic: anything unmatched
  - Keyword lists are arrays of lowercase strings; matching checks if `city.toLowerCase()` or `country.toLowerCase()` includes any keyword

- [ ] Create `src/components/memories/styles/MonopolyFigureRenderer.tsx`
  - Props: same trip shape
  - Calls `getDestinationThemeKey` to select the SVG asset
  - Renders the SVG using `react-native-svg` (already in the Expo managed workflow)
  - Below the SVG: destination city name in bold, trip year in smaller text
  - Card has a subtle drop shadow
  - Horizontal FlatList in `MemoriesSection` when style = monopoly_figures; each card is approx 130×180 pt
  - **Note:** this renderer uses `react-native-svg` for the SVG figure assets, while the surrounding card chrome (background, shadow, text) uses React Native View/Text primitives. This is intentional — SVG assets are best rendered via react-native-svg, not Skia. The architecture statement "all rendering via Skia" applies to the canvas-based Memories styles (Postcards, Polaroids, Stamps, Puzzle Pieces); Monopoly Figures intentionally uses react-native-svg for the SVG layer.

- [ ] Commit: `feat: monopoly figures renderer with destination-themed SVG assets`

---

### Step 5 — Camera roll permission utility and social post creator (5 min)

- [ ] Create `src/utils/cameraRollPermission.ts`
  - Exports `requestCameraRollPermission(): Promise<'granted' | 'denied' | 'blocked'>`
  - Uses `expo-media-library`: calls `MediaLibrary.requestPermissionsAsync()`
  - Returns `'granted'` if status is granted
  - Returns `'blocked'` if status is denied with `canAskAgain: false` (user has permanently denied)
  - Returns `'denied'` if status is denied but `canAskAgain: true`
  - Exports `showPermissionDeniedAlert(status: 'denied' | 'blocked')`: shows a React Native `Alert`
    - `'denied'`: "Camera Roll Access Required — Please allow In the Bag to save to your camera roll." with "OK" button
    - `'blocked'`: "Camera Roll Access Blocked — To save photos, enable camera roll access in Settings > Privacy > Photos." with "Open Settings" (calls `Linking.openSettings()`) and "Cancel" buttons

- [ ] Create `src/hooks/useSocialPostCreator.ts`
  - Exports `useSocialPostCreator()`
  - Returns `{ savePostcard, saveStatsCard, isSaving, error }`
  - `savePostcard(trip, day?, canvasRef: RefObject<SkiaView>)`: calls `canvasRef.current?.makeImageSnapshot()`, converts to base64 PNG, requests camera roll permission via `requestCameraRollPermission`, calls `MediaLibrary.saveToLibraryAsync` with the PNG URI; handles denial by calling `showPermissionDeniedAlert`; sets `isSaving` during the operation
  - **Note:** The Skia Canvas ref's `makeImageSnapshot()` operates at the canvas's pixel dimensions (1080×720 or 1080×1080), producing a full-resolution PNG.
  - `saveStatsCard(trip, day?, healthKitData?)`: same save pipeline; `healthKitData` is optional (typed as `{ steps?: number }`) — if null/undefined, steps are simply omitted from the card without error

- [ ] Create `src/components/social/PostcardCreator.tsx`
  - Skia canvas: 1080×720 px (full-res PNG for social sharing)
  - Layer 1: trip cover photo (full bleed, aspect-fill crop)
  - Layer 2: dark gradient scrim at bottom 40%
  - Layer 3 (bottom-left): trip/day name in large serif or handwriting font; dates below in smaller weight; destination city below dates
  - Layer 4 (bottom-right): small "In the Bag" wordmark (text only — no emojis)
  - Uses `useCanvasRef` + `makeImageSnapshot` for PNG export
  - Props: `trip`, `day` (optional — if provided, shows day name instead of trip name), `onSave(canvasRef: RefObject<SkiaView>)`
  - "Save to Camera Roll" button below the preview calls `onSave`, passing the canvas ref (from `useCanvasRef`) — not a surface object

- [ ] Create `src/components/social/StatsCardCreator.tsx`
  - Skia canvas: 1080×1080 px square
  - Background: solid brand colour with a subtle texture
  - Stats displayed as large bold numbers with smaller label below each:
    - Event count (all events on the trip or day)
    - Destination (primary destination city)
    - Participants (count of trip_participants)
    - Steps (only rendered if `healthKitSteps` prop is defined and non-null; label "Steps taken"; if undefined, this stat block is omitted entirely — no blank space, remaining stats reflow)
    - Highlights: top 3 event titles (Activity or Meal category events by start_time)
  - "In the Bag" wordmark at top of card
  - Props: `trip`, `day` (optional), `healthKitSteps?: number`, `onSave(canvasRef: RefObject<SkiaView>)`
  - "Save to Camera Roll" button calls `onSave`, passing the canvas ref (from `useCanvasRef`) — not a surface object
  - **Multi-destination display:** for multi-destination trips, display all destination city names joined with ' · ' (e.g. 'London · Paris · Rome'), not just the primary destination. Truncate with '...' if the string exceeds 3 destinations.

- [ ] Commit: `feat: camera roll permission handling and social post creator (Postcard + Stats Card)`

---

### Step 6 — Social Post Creator sheet, premium gate, and entry points (2 min)

- [ ] Create `src/components/social/SocialPostPremiumGate.tsx`
  - For free users: renders the share icon as a greyed-out (opacity 0.4) tappable element
  - On tap: shows a bottom sheet with upgrade prompt ("Social Media Posts are a Premium feature") + Monthly / Lifetime upgrade buttons (standard RevenueCat paywall trigger) + "Maybe Later" dismiss button
  - In demo mode with `demo_tier = 'free'`: shows simplified sheet with "Switch to Premium (demo)" and "Maybe Later"

- [ ] Create `src/components/social/SocialPostCreatorSheet.tsx`
  - Bottom sheet modal (react-native-reanimated bottom sheet)
  - Two tabs: "Postcard" and "Stats Card"
  - "Postcard" tab renders `PostcardCreator` with a live preview
  - "Stats Card" tab renders `StatsCardCreator`; fetches HealthKit steps for the trip/day date range if `stats_healthkit_enabled` feature flag is true AND HealthKit permission is already granted (does not re-request permission here — relies on Plan 8 HealthKit module's `useHealthKitData` hook; if hook returns null steps, `StatsCardCreator` receives `healthKitSteps={undefined}` and omits the steps stat block)
  - Uses `useSocialPostCreator` hook for save actions
  - Shows an `ActivityIndicator` over the preview while `isSaving` is true

- [ ] Wire entry points:
  - Trip Summary tab: share icon (top-right of Summary tab header) — premium users open `SocialPostCreatorSheet` with `trip` prop and no `day` prop; free users render `SocialPostPremiumGate`
  - Day tab header: share icon — premium users open `SocialPostCreatorSheet` with both `trip` and `day` props; free users render `SocialPostPremiumGate`

- [ ] Commit: `feat: social post creator sheet with premium gate and trip/day entry points`

---

## Self-Review Checklist

Before marking this plan complete, verify:

- [ ] All 6 Memories styles are covered: Postcards, Fridge Magnets, Polaroids, Passport Stamps, Puzzle Pieces, Monopoly Figures — each has its own renderer file
- [ ] All rendering is on-device via Skia — no calls to Imagen 3 or any Edge Function
- [ ] Puzzle Pieces interlocking logic is fully defined in `puzzlePieceGeometry.ts` (tab/slot adjacency rules, grid column count by total pieces)
- [ ] Monopoly Figures SVG assets are listed for at least 5 destination types: beach, mountain, city, desert, generic
- [ ] Camera roll permission request is present and both denial states (denied/blocked) are handled with appropriate user-facing messages
- [ ] Stats Card step count is conditional: omits steps if `healthKitSteps` is undefined, does not throw or show an error
- [ ] Social Post Creator is gated: free users see the premium gate (greyed icon + upgrade prompt); demo mode free tier shows the demo upgrade sheet
- [ ] Each step ends with a `git commit`

---

## Dependencies

- **Plan 1** (project setup, Supabase client, Expo Router navigation) — required
- **Plan 2** (trips data model, cover photo URLs, trip participants) — required for trip data props
- **Plan 8** (HealthKit integration, `useHealthKitData` hook) — required for Stats Card step count; Stats Card degrades gracefully if Plan 8 is not yet integrated

---

## Review Fixes Applied

The following targeted fixes were applied to this plan (2026-06-24):

- **Minor 3.1 — Puzzle piece bezier control point values:** Added explicit suggested constants (`TAB_PROTRUSION`, `TAB_WIDTH_RATIO`, bezier control point formulas for tab and slot) to the `puzzlePieceGeometry.ts` step, with a note to export them as named constants.

- **Minor 3.3 — MonopolyFigureRenderer uses react-native-svg:** Added an explicit architectural note to the `MonopolyFigureRenderer` step clarifying that the SVG figure layer uses `react-native-svg` (not Skia), and that the "all rendering via Skia" architecture statement applies only to the canvas-based styles (Postcards, Polaroids, Stamps, Puzzle Pieces).

- **Minor 3.4 — makeImageSnapshot API type mismatch:** Changed `onSave(surface)` to `onSave(canvasRef: RefObject<SkiaView>)` in both `PostcardCreator.tsx` and `StatsCardCreator.tsx`. Updated `useSocialPostCreator` to use `canvasRef.current?.makeImageSnapshot()` instead of a surface ref. Added a note about pixel dimensions (1080×720 or 1080×1080).

- **Minor 3.2 — Stats Card multi-destination display:** Added a note to `StatsCardCreator.tsx` specifying that multi-destination trips display all city names joined with ' · ', truncated with '...' beyond 3 destinations.

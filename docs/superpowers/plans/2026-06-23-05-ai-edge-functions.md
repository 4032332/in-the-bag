# AI & Edge Functions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all Supabase Edge Functions and Gemini integrations that power the app's async AI job pipeline — cover photo fetch, pre-trip checklist generation, Treasure Map image generation, In the Bag suggestions (trip-level and event-level), Add with AI conversational suggestions, flight lookup, and synchronous Gemini Vision document scanning.

**Architecture:** A dispatcher Edge Function routes incoming job payloads to per-job-type handler modules; each handler calls the appropriate Gemini API, writes results to Supabase, and updates the `async_jobs` row to `completed` or `failed`. The iOS app subscribes to `async_jobs` via Supabase Realtime and reacts to status changes with UI updates. Gemini Vision for document scanning is invoked synchronously from the app (not via the job queue) because it must return parsed field values inline during the user's document upload flow.

**Tech Stack:** Supabase Edge Functions (Deno), Gemini 2.5 Pro (REST), Gemini Imagen 3 (REST), Gemini Vision (REST), Supabase Realtime, Supabase Storage, Supabase JS client (Deno)

---

## File Structure

```
supabase/
  functions/
    _shared/
      gemini.ts          # Gemini REST client helpers (generateContent, generateImage, vision)
      supabase.ts        # Supabase admin client initialisation
      job-utils.ts       # markJobProcessing, markJobCompleted, markJobFailed helpers
      types.ts           # Shared TypeScript types for job payloads and Gemini responses
    dispatcher/
      index.ts           # Entry point — reads job id from request, routes to handler
    cover-photo-fetch/
      index.ts           # Handler: Gemini grounded search → download → Storage → trips update
    pre-trip-checklist-generate/
      index.ts           # Handler: Gemini 2.5 Pro → categorised task list → trip_tasks insert
    treasure-map-generate/
      index.ts           # Handler: Gemini Imagen 3 → illustrated background → Storage → trips update
    in-the-bag-suggest/
      index.ts           # Handler: Gemini 2.5 Pro → packing items → in_the_bag_items insert
    ai-trip-suggest/
      index.ts           # Handler: Gemini 2.5 Pro conversational trip suggestions
    ai-day-suggest/
      index.ts           # Handler: Gemini 2.5 Pro conversational day suggestions
    flight-lookup/
      index.ts           # Handler: Gemini grounded search → flight details → job output
    vision-scan/
      index.ts           # Synchronous endpoint: Gemini Vision → parsed document fields (not async job)

app/
  lib/
    jobs/
      queue.ts           # queueJob(type, input, tripId?, eventId?) helper
      realtime.ts        # useJobSubscription(jobId) hook — Supabase Realtime listener
      types.ts           # AsyncJob type, JobType enum
  hooks/
    useAsyncJob.ts       # UI hook: job status + result for a given jobId
```

---

## Tasks

### Step 1 — Shared infrastructure

- [ ] Create `supabase/functions/_shared/types.ts` defining:
  - `JobType` union: `'cover_photo_fetch' | 'pre_trip_checklist_generate' | 'treasure_map_generate' | 'in_the_bag_suggest' | 'ai_trip_suggest' | 'ai_day_suggest' | 'flight_lookup' | 'youtube_extract' | 'tiktok_extract'`
  - `AsyncJob` interface matching the `async_jobs` table schema (id, type, status, input, output, trip_id, event_id, user_id, created_at, completed_at, error)
  - Per-job input and output payload interfaces (e.g. `CoverPhotoFetchInput`, `InTheBagSuggestInput`)

- [ ] Create `supabase/functions/_shared/supabase.ts`:
  - Initialise Supabase admin client using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
  - Export `supabaseAdmin` singleton

- [ ] Create `supabase/functions/_shared/job-utils.ts`:
  - `markJobProcessing(jobId: string): Promise<void>` — sets status to `'processing'`
  - `markJobCompleted(jobId: string, output: Record<string, unknown>): Promise<void>` — sets status to `'completed'`, sets `completed_at`, writes `output`
  - `markJobFailed(jobId: string, error: string): Promise<void>` — sets status to `'failed'`, sets `completed_at`, writes `error`
  - All three use `supabaseAdmin` and throw if the Supabase call returns an error

- [ ] Create `supabase/functions/_shared/gemini.ts`:
  - `GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'`
  - `generateContent(model: string, contents: GeminiContent[], config?: GenerationConfig): Promise<string>` — calls `models/{model}:generateContent`, returns the first text part
  - `generateContentGrounded(model: string, contents: GeminiContent[]): Promise<{ text: string; groundingChunks: GroundingChunk[] }>` — same endpoint with `tools: [{ googleSearch: {} }]` enabled; returns text and grounding metadata
  - `generateImage(prompt: string): Promise<Uint8Array>` — calls Imagen 3 via `models/imagen-3.0-generate-001:predict`, returns raw image bytes
  - `visionExtract(imageBase64: string, mimeType: string, prompt: string): Promise<string>` — calls Gemini 2.5 Pro with inline image part; returns extracted text
  - All functions read `GEMINI_API_KEY` from env; throw descriptive errors on non-200 responses

- [ ] Commit: `feat: add Edge Function shared infrastructure (types, supabase client, job utils, gemini client)`

---

### Step 2 — Dispatcher Edge Function

- [ ] Create `supabase/functions/dispatcher/index.ts`:
  - Accept POST requests with body `{ jobId: string }`
  - **Authenticate the caller:** extract the `Authorization: Bearer <token>` header; verify it is either (a) a valid Supabase user JWT via `supabaseAdmin.auth.getUser(token)` (for app-initiated calls via `supabase.functions.invoke`) or (b) the `SUPABASE_SERVICE_ROLE_KEY` (for internal server-to-server calls); reject with 401 if neither check passes
  - Fetch the `async_jobs` row by `jobId` using `supabaseAdmin`
  - **Authorise the caller:** if the request used a user JWT (not service-role), verify that `job.user_id === authenticatedUser.id`; reject with 403 if they do not match
  - Reject if job status is not `'pending'` (return 409 with message `"Job already processed"`)
  - Route by `job.type` to the appropriate handler module via a `switch` statement; import handlers dynamically or statically as preferred by Deno; handled types: `cover_photo_fetch`, `pre_trip_checklist_generate`, `treasure_map_generate`, `in_the_bag_suggest`, `ai_trip_suggest`, `ai_day_suggest`, `flight_lookup`, `youtube_extract`, `tiktok_extract`
  - Return 200 `{ success: true }` after invoking the handler; handler is responsible for updating job status
  - Return 500 with error message if the job type is unrecognised
  - The dispatcher itself does NOT call `markJobProcessing`; each handler does that first

- [ ] Add `supabase/functions/dispatcher/deno.json` with import map pointing to `../_shared/*`

- [ ] Commit: `feat: add dispatcher Edge Function with job routing`

---

### Step 3 — cover_photo_fetch handler

**Job input:** `{ trip_id: string; destinations: Array<{ city: string; country: string }> }`
**Job output:** `{ cover_photo_url: string }`

- [ ] Create `supabase/functions/cover-photo-fetch/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build grounded search prompt:
    ```
    Find a high-quality, visually striking photograph of [city], [country] suitable for a travel app cover image.
    Return only the direct URL of the best image you find. The URL must be a direct link to a JPEG or PNG image file.
    ```
    (Use the first destination in the array; if multiple destinations, use the primary/first destination city)
  - Call `generateContentGrounded('gemini-2.5-pro', ...)` — extract the image URL from the response text (parse with a URL regex; validate it starts with `https://`)
  - Download the image via `fetch(imageUrl)` — validate `Content-Type` is `image/*`; throw if not
  - Upload to Supabase Storage bucket `trip-covers` at path `{trip_id}/cover.jpg` using `supabaseAdmin.storage`
  - Retrieve the public URL via `supabaseAdmin.storage.from('trip-covers').getPublicUrl(...)`
  - Update `trips` table: `SET cover_photo_url = publicUrl WHERE id = trip_id`
  - Call `markJobCompleted(jobId, { cover_photo_url: publicUrl })`
  - On any error: call `markJobFailed(jobId, error.message)` and return

- [ ] Commit: `feat: add cover_photo_fetch Edge Function handler`

---

### Step 4 — pre_trip_checklist_generate handler

**Job input:** `{ trip_id: string; user_id: string; destinations: Array<{ city: string; country: string }>; trip_start: string; trip_end: string; citizenship_countries: string[]; country_of_residency: string; medical_conditions: string | null; medications: string | null; food_allergies: string | null; dietary_requirements: string | null; disability_accessibility_needs: string | null; is_cruise: boolean }`
**Job output:** `{ task_count: number }`

- [ ] Create `supabase/functions/pre-trip-checklist-generate/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build prompt:
    ```
    You are a travel preparation assistant. Generate a pre-trip checklist for the following trip.

    Destination(s): [cities and countries]
    Travel dates: [start] to [end]
    Traveller's country of residency: [country_of_residency]
    Citizenship: [citizenship_countries joined by ', ']
    Is cruise: [yes/no]
    Medical conditions: [or 'none specified']
    Medications: [or 'none specified']
    Food allergies: [or 'none specified']
    Dietary requirements: [or 'none specified']
    Accessibility needs: [or 'none specified']

    Return a JSON array of task objects. Each object must have:
    - "title": string — concise task description (no emojis)
    - "category": one of "visa", "insurance", "medication", "banking", "driving", "esim", "vaccination", "accessibility", "documentation", "health", "general"

    Focus on: visa requirements, travel insurance, medication import rules, banking/currency, international driving permit, e-SIM/connectivity, vaccinations, accessibility preparation.
    For cruise trips, also include: cruise insurance, port entry/visa requirements, onboard account setup.
    Do not use emojis anywhere in your response.
    Return only the JSON array. No markdown fences, no explanation.
    ```
  - Call `generateContent('gemini-2.5-pro', ...)` — parse response as JSON array
  - Validate each item has `title` (string) and `category` (string); discard malformed items; log count of discarded items to job error field if any discarded (but continue)
  - Bulk insert into `trip_tasks`: `{ trip_id, title, category, is_completed: false, is_suggested: true, is_dismissed: false, source: 'ai' }` for each valid item
  - Call `markJobCompleted(jobId, { task_count: insertedCount })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Commit: `feat: add pre_trip_checklist_generate Edge Function handler`

---

### Step 5 — treasure_map_generate handler

**Job input:** `{ trip_id: string; destinations: Array<{ city: string; country: string }>; is_cruise: boolean }`
**Job output:** `{ treasure_map_image_url: string }`

- [ ] Create `supabase/functions/treasure-map-generate/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build Imagen 3 prompt:
    - Non-cruise: `"A hand-drawn illustrated travel map of [city], [country] in a vintage parchment style. Warm sepia and aged paper tones, decorative compass rose, illustrated landmarks and terrain features, no text labels. Square format."`
    - Cruise: `"A hand-drawn illustrated nautical map in a vintage pirate treasure map style. Ocean waves, sea monsters, compass rose, ship illustrations, aged parchment texture, warm sepia tones. No text labels. Square format."`
  - Call `generateImage(prompt)` — returns raw image bytes (PNG)
  - Upload to Supabase Storage bucket `treasure-maps` at path `{trip_id}/background.png`
  - Retrieve public URL
  - Update `trips` table: `SET treasure_map_image_url = publicUrl WHERE id = trip_id`
  - Call `markJobCompleted(jobId, { treasure_map_image_url: publicUrl })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Commit: `feat: add treasure_map_generate Edge Function handler`

---

### Step 6 — in_the_bag_suggest handler

**Job input (trip-level):** `{ trip_id: string; event_id: null; destinations: Array<{ city: string; country: string }>; trip_start: string; trip_end: string; medical_conditions: string | null; dietary_requirements: string | null; disability_accessibility_needs: string | null }`
**Job input (event-level):** `{ trip_id: string; event_id: string; event_category: string; event_subcategory: string | null; destination_city: string; destination_country: string; trip_start: string; trip_end: string; medical_conditions: string | null; dietary_requirements: string | null; disability_accessibility_needs: string | null }`
**Job output:** `{ item_count: number; discarded_count: number }`

- [ ] Create `supabase/functions/in-the-bag-suggest/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Determine scope from `input.event_id`:
    - **Trip-level** (`event_id` is null):
      - Build prompt:
        ```
        You are a packing list assistant. Suggest general packing items for a trip.

        Destination(s): [cities and countries]
        Trip duration: [start] to [end] ([N] days)
        Medical conditions: [or 'none']
        Dietary requirements: [or 'none']
        Accessibility needs: [or 'none']

        Return a JSON array of packing item titles. Each title must be a concise item name (e.g. "Travel adaptor", "Sunscreen SPF50"). No emojis. No quantities. No explanations.
        Focus on items applicable to the whole trip regardless of specific activities.
        Return only the JSON array of strings.
        ```
      - Resulting items will be trip-scoped: `trip_id` set, `trip_day_id` NULL, `event_id` NULL
    - **Event-level** (`event_id` is not null):
      - Build prompt:
        ```
        You are a packing list assistant. Suggest packing items for a specific event.

        Event type: [category] — [subcategory or 'general']
        Location: [destination_city], [destination_country]
        Trip dates: [start] to [end]
        Medical conditions: [or 'none']
        Dietary requirements: [or 'none']
        Accessibility needs: [or 'none']

        Return a JSON array of packing item titles specific to this event type (e.g. for a beach activity: "Sunscreen", "Towel", "Swimwear"). No emojis. No quantities. No explanations.
        Return only the JSON array of strings.
        ```
  - Parse response as JSON array of strings; validate each item is a non-empty string
  - **Scoping validation (required):** before inserting any row, assert that `trip_day_id` will be NULL:
    - Trip-level items: `trip_day_id` is never set (enforced in insert construction)
    - Event-level items: `trip_day_id` is never set (enforced in insert construction)
    - If any constructed row somehow has a non-null `trip_day_id` (defensive check), discard that row and append a warning to the job's `error` field; do not write it
  - Bulk insert into `in_the_bag_items`:
    - Trip-level: `{ trip_id, trip_day_id: null, event_id: null, title, is_packed: false, is_ai_suggested: true }`
    - Event-level: `{ trip_id, trip_day_id: null, event_id, title, is_packed: false, is_ai_suggested: true }`
  - Call `markJobCompleted(jobId, { item_count: insertedCount, discarded_count: discardedCount })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Commit: `feat: add in_the_bag_suggest Edge Function handler with scoping validation`

---

### Step 7 — ai_trip_suggest and ai_day_suggest handlers

**ai_trip_suggest job input:** `{ trip_id: string; user_message: string; conversation_history: Array<{ role: 'user' | 'model'; text: string }>; trip_context: { destinations: Array<{ city: string; country: string }>; trip_start: string; trip_end: string; existing_event_count: number }; user_profile: { medical_conditions: string | null; dietary_requirements: string | null; disability_accessibility_needs: string | null } }`
**ai_trip_suggest job output:** `{ suggestions: Array<{ title: string; category: string; subcategory: string | null; notes: string }> }`

**ai_day_suggest job input:** `{ trip_id: string; trip_day_id: string; day_date: string; user_message: string; conversation_history: Array<{ role: 'user' | 'model'; text: string }>; trip_context: { destinations: Array<{ city: string; country: string }>; trip_start: string; trip_end: string }; existing_day_events: Array<{ category: string; title: string; start_time: string | null }>; user_profile: { medical_conditions: string | null; dietary_requirements: string | null; disability_accessibility_needs: string | null } }`
**ai_day_suggest job output:** `{ reply: string; suggestions: Array<{ title: string; category: string; subcategory: string | null; start_time: string | null; notes: string }> }`

- [ ] Create `supabase/functions/ai-trip-suggest/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build system instruction:
    ```
    You are a travel planning assistant helping a user plan events for their trip to [destinations].
    The trip runs from [start] to [end].
    User medical/dietary/accessibility context: [profile summary or 'none specified'].
    Existing events on this trip: [count].
    Your role: understand what the user wants, ask at most 1–2 short clarifying questions if needed,
    then return 3–5 concrete event suggestions. Each suggestion must include title, category
    (TRANSPORT/ACCOMMODATION/ACTIVITY/MEAL/REST/HEALTH/FREE TIME), optional subcategory, and brief notes.
    Do not use emojis. Return suggestions as a JSON object with key "suggestions" containing an array.
    ```
  - Build `contents` array from `conversation_history` plus current `user_message`
  - Call `generateContent('gemini-2.5-pro', contents)` with system instruction
  - Parse response: extract `suggestions` array from JSON; validate each has `title` and `category`
  - Call `markJobCompleted(jobId, { suggestions: parsedSuggestions })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Create `supabase/functions/ai-day-suggest/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build system instruction:
    ```
    You are a travel planning assistant helping a user plan events for day [day_date] of their trip to [destinations].
    Events already on this day: [list of existing events with category and time, or 'none'].
    User medical/dietary/accessibility context: [profile summary or 'none specified'].
    Your role: understand what the user wants, ask at most 1–2 clarifying questions if needed, then return
    3–5 concrete event suggestions for this day. Each suggestion must include title, category, optional subcategory,
    optional start_time (HH:MM 24hr), and brief notes. Do not use emojis.
    Return a JSON object with keys "reply" (string — your conversational response) and "suggestions" (array).
    ```
  - Build `contents` array from `conversation_history` plus current `user_message`
  - Call `generateContent('gemini-2.5-pro', contents)` with system instruction
  - Parse response: extract `reply` and `suggestions`; validate structure
  - Call `markJobCompleted(jobId, { reply, suggestions: parsedSuggestions })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Commit: `feat: add ai_trip_suggest and ai_day_suggest Edge Function handlers`

---

### Step 8 — flight_lookup handler

**Job input:** `{ flight_number: string; flight_date: string }`
**Job output:** `{ airline: string; origin_airport: string; destination_airport: string; scheduled_departure: string; scheduled_arrival: string; terminal: string | null; gate: string | null }`

- [ ] Create `supabase/functions/flight-lookup/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Build grounded search prompt:
    ```
    Look up the details for flight [flight_number] on [flight_date].
    Return a JSON object with these fields (use null for any field you cannot confirm):
    airline, origin_airport (IATA code), destination_airport (IATA code),
    scheduled_departure (ISO 8601 datetime with timezone), scheduled_arrival (ISO 8601 datetime with timezone),
    terminal, gate.
    Return only the JSON object, no explanation.
    ```
  - Call `generateContentGrounded('gemini-2.5-pro', ...)` — parse response JSON
  - Validate required fields (`airline`, `origin_airport`, `destination_airport`, `scheduled_departure`, `scheduled_arrival`) are present and non-null; if validation fails, call `markJobFailed` with `"Insufficient flight data returned"`
  - Call `markJobCompleted(jobId, parsedFlightDetails)`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Commit: `feat: add flight_lookup Edge Function handler`

---

### Step 8b — youtube_extract and tiktok_extract handlers

**Job input (both types):** `{ trip_id: string; url: string; user_id: string }`
**Job output:** `{ items: Array<{ type: 'event' | 'task'; label: string; timestamp: string | null; classification: string }> }`

- [ ] Create `supabase/functions/youtube-extract/index.ts`:
  - Call `markJobProcessing(jobId)`
  - Fetch `input.url` from the `async_jobs` row
  - Call `generateContent('gemini-2.5-pro', ...)` with prompt:
    ```
    You are a travel content extraction assistant. Analyse the YouTube video at the following URL and extract all named places, activities, restaurants, hotels, and practical travel tips mentioned in the video transcript or description.

    URL: [input.url]

    Return a JSON array of items. Each item must have:
    - "type": "event" or "task"
    - "label": string — the place or action name (e.g. "Lunch at Nobu Malibu", "Book tickets to Colosseum in advance")
    - "timestamp": string or null — approximate video timestamp where mentioned (e.g. "02:34"), or null if unknown
    - "classification": string — category label (e.g. "restaurant", "attraction", "hotel", "tip", "activity")

    Do not use emojis anywhere in your response.
    Return only the JSON array. No markdown fences, no explanation.
    ```
  - Parse response as JSON array; validate each item has `type`, `label`, `timestamp`, `classification`; discard malformed items
  - Write validated array to `async_jobs.output` as `{ items: [...] }`
  - Call `markJobCompleted(jobId, { items: parsedItems })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] Create `supabase/functions/tiktok-extract/index.ts`:
  - Identical structure to `youtube-extract/index.ts` with the URL passed to Gemini as a TikTok URL; the prompt is the same but references "TikTok video" instead of "YouTube video"
  - Call `markJobProcessing(jobId)`
  - Call `generateContent('gemini-2.5-pro', ...)` with prompt:
    ```
    You are a travel content extraction assistant. Analyse the TikTok video at the following URL and extract all named places, activities, restaurants, hotels, and practical travel tips mentioned in the video or caption.

    URL: [input.url]

    Return a JSON array of items. Each item must have:
    - "type": "event" or "task"
    - "label": string — the place or action name
    - "timestamp": string or null — approximate video timestamp where mentioned, or null if unknown
    - "classification": string — category label (e.g. "restaurant", "attraction", "hotel", "tip", "activity")

    Do not use emojis anywhere in your response.
    Return only the JSON array. No markdown fences, no explanation.
    ```
  - Parse, validate, and write output identically to `youtube-extract`
  - Call `markJobCompleted(jobId, { items: parsedItems })`
  - On any error: call `markJobFailed(jobId, error.message)`

- [ ] App-side wiring:
  - In the Explore screen "Enhance My Trip" URL input submit handler: detect URL domain (`youtube.com`, `youtu.be` → `youtube_extract`; `tiktok.com` → `tiktok_extract`); call `queueJob({ type, input: { trip_id, url, user_id }, tripId: trip_id, userId })`
  - Subscribe to the returned `jobId` via `useAsyncJob(jobId)`; while `pending` or `processing`, show a loading indicator in the Explore screen: "Extracting travel ideas from video..."
  - When job `status === 'completed'`, read `job.output.items` and render as a checklist in the Explore screen so the user can select which items to add to their trip
  - If job fails, show inline error: "Could not extract ideas from this video — please try a different URL"

- [ ] Commit: `feat: add youtube_extract and tiktok_extract Edge Function handlers with app-side wiring`

---

### Step 9 — vision-scan synchronous endpoint

This is NOT an async job. It is called directly from the app during document upload and returns parsed fields immediately.

**Request body:** `{ image_base64: string; mime_type: string; document_type: 'boarding_pass' | 'qr_code' | 'general' }`
**Response:** `{ fields: Record<string, string | null> }`

- [ ] Create `supabase/functions/vision-scan/index.ts`:
  - **Authenticate the caller via user JWT:** extract the `Authorization: Bearer <token>` header; call `supabaseAdmin.auth.getUser(token)` to validate it is a signed Supabase user JWT; reject with 401 if absent or invalid — the anon key is public and does not establish user identity, so it must not be accepted as sole authentication
  - Build per-document-type prompt:
    - `boarding_pass`:
      ```
      Extract the following fields from this boarding pass image. Return a JSON object with keys:
      airline, flight_number, origin_airport, destination_airport, departure_date, departure_time,
      arrival_time, passenger_name, seat, booking_reference, terminal, gate.
      Use null for any field not visible. Return only the JSON object.
      ```
    - `qr_code`:
      ```
      Decode this QR code image and extract any structured information it contains.
      Return a JSON object with any identifiable fields (e.g. url, booking_reference, confirmation_number, etc.).
      Return only the JSON object.
      ```
    - `general`:
      ```
      Extract key information from this travel document image. Return a JSON object with any identifiable fields
      such as: confirmation_number, provider_name, address, check_in_time, check_out_time, booking_reference,
      contact_phone, contact_email. Use null for unavailable fields. Return only the JSON object.
      ```
  - Call `visionExtract('gemini-2.5-pro', image_base64, mime_type, prompt)`
  - Parse response as JSON; return `{ fields: parsedFields }`
  - On parse error: return `{ fields: {} }` with HTTP 200 (graceful degradation — caller shows empty auto-fill)
  - On Gemini API error: return HTTP 500 with `{ error: error.message }`
  - This function has no async_jobs interaction

- [ ] Commit: `feat: add vision-scan synchronous Edge Function endpoint`

---

### Step 10 — App-side job queue helper

- [ ] Create `app/lib/jobs/types.ts`:
  - `JobType` union type (matches Edge Function types)
  - `AsyncJob` interface with all `async_jobs` table columns

- [ ] Create `app/lib/jobs/queue.ts`:
  - `queueJob(params: { type: JobType; input: Record<string, unknown>; tripId?: string; eventId?: string; userId: string }): Promise<string>` (returns jobId)
  - Inserts a row into `async_jobs` with `status: 'pending'`
  - Invokes the `dispatcher` Edge Function via `supabase.functions.invoke('dispatcher', { body: { jobId } })`
  - Returns the new `jobId`
  - Does not throw on dispatcher invocation failure — the job row is still in `pending` state and can be retried

- [ ] Commit: `feat: add app-side job queue helper`

---

### Step 11 — App-side Realtime subscription

- [ ] Create `app/lib/jobs/realtime.ts`:
  - `subscribeToJob(jobId: string, onUpdate: (job: AsyncJob) => void): RealtimeChannel`
    - Subscribes to `async_jobs` table changes filtered on `id=eq.{jobId}`
    - Fires `onUpdate` on `UPDATE` events
    - Returns the channel so the caller can unsubscribe on cleanup
  - `unsubscribeFromJob(channel: RealtimeChannel): void`

- [ ] Create `app/hooks/useAsyncJob.ts`:
  - `useAsyncJob(jobId: string | null): { job: AsyncJob | null; isLoading: boolean; isComplete: boolean; isFailed: boolean }`
  - Fetches initial job state on mount
  - Sets up Realtime subscription; clears subscription on unmount or when `jobId` changes
  - Returns derived booleans for easy conditional rendering

- [ ] Commit: `feat: add app-side Realtime job subscription hook`

---

### Step 12 — Queue jobs on trip creation

- [ ] In the trip creation save handler (from Plan 2), after the `trips` insert succeeds:
  - Queue `cover_photo_fetch` for all users:
    ```ts
    await queueJob({ type: 'cover_photo_fetch', input: { trip_id, destinations }, tripId: trip_id, userId })
    ```
  - If user is premium (check `subscriptions` or `is_premium_sponsor`):
    - Queue `pre_trip_checklist_generate` with full user profile input
    - Queue `treasure_map_generate` with destination and cruise flag
    - Queue `in_the_bag_suggest` with `event_id: null` for trip-level items
  - Store returned jobIds in local state for Realtime tracking

- [ ] On Trip Summary tab:
  - Show a subtle loading placeholder in the cover photo header while `cover_photo_fetch` job is `pending` or `processing`
  - Show a loading state in Suggested Tasks section while `pre_trip_checklist_generate` is in progress
  - Show a "Generating your Treasure Map..." overlay on the Treasure Map button while `treasure_map_generate` is in progress
  - Show a sparkle loading indicator in the trip-level In the Bag sheet while `in_the_bag_suggest` is in progress
  - Use `useAsyncJob(jobId)` for each job; jobIds stored in MMKV keyed by `trip_id`

- [ ] Commit: `feat: queue async jobs on trip creation and wire loading states`

---

### Step 13 — Queue in_the_bag_suggest on event creation

- [ ] In the event save handler (from Plan 2), after the `events` insert succeeds, if user is premium:
  - Queue `in_the_bag_suggest` with `event_id` set and `trip_id` set; `input.event_id` must be non-null
  - Store returned jobId in MMKV keyed by `event_id`

- [ ] On the Event Screen In the Bag sheet:
  - While `in_the_bag_suggest` job is `pending` or `processing`, show loading state in the sheet: spinner with label "Preparing your packing suggestions"
  - When job completes (`status = 'completed'`), re-query `in_the_bag_items` for the event and update the list; play sparkle animation
  - If job fails, show subtle error state: "Could not generate suggestions — you can add items manually"

- [ ] Commit: `feat: queue in_the_bag_suggest on event creation and wire event-level loading states`

---

### Step 14 — Flight lookup integration

- [ ] On the Transport — Air event detail screen:
  - When user enters a flight number and date, queue `flight_lookup` job
  - Show inline loading indicator next to the flight number field: "Looking up flight details..."
  - When job completes, auto-fill: airline, start_time (from `scheduled_departure`), end_time (from `scheduled_arrival`)
  - If job fails, show inline error: "Could not retrieve flight details — please enter manually"
  - Use `useAsyncJob(jobId)` to track; jobId stored in component state (not persisted — only relevant during active edit session)

- [ ] Commit: `feat: integrate flight_lookup job with Transport Air event form`

---

### Step 15 — Gemini Vision document scan integration

- [ ] In the Event Screen Documents and Tickets tabs:
  - On scan/QR capture (after user selects camera or scan option), before saving the document row:
    - Convert captured image to base64
    - Call `supabase.functions.invoke('vision-scan', { body: { image_base64, mime_type, document_type } })`
    - Show inline loading state: "Scanning document..."
    - On success: pre-fill any matching event fields with returned values; show a brief toast: "Fields auto-filled — please review"
    - On empty result or error: proceed silently (document is still saved; no auto-fill attempted)
  - User reviews and edits auto-filled fields before saving the event

- [ ] Commit: `feat: integrate vision-scan endpoint with document scanning in Event Screen`

---

### Step 16 — Local testing setup

- [ ] Add `.env.local` template at `supabase/functions/.env.local.example`:
  ```
  SUPABASE_URL=http://localhost:54321
  SUPABASE_SERVICE_ROLE_KEY=<local service role key from supabase start>
  GEMINI_API_KEY=<your Gemini API key>
  ```

- [ ] Add `supabase/functions/README.md` with local testing commands:
  ```bash
  # Start local Supabase
  supabase start

  # Serve all functions locally
  supabase functions serve --env-file supabase/functions/.env.local

  # Test dispatcher with a pending job (replace JOB_ID)
  curl -i --location --request POST 'http://localhost:54321/functions/v1/dispatcher' \
    --header 'Authorization: Bearer <anon key>' \
    --header 'Content-Type: application/json' \
    --data '{"jobId":"<JOB_ID>"}'

  # Test vision-scan directly
  curl -i --location --request POST 'http://localhost:54321/functions/v1/vision-scan' \
    --header 'Authorization: Bearer <anon key>' \
    --header 'Content-Type: application/json' \
    --data '{"image_base64":"<base64 string>","mime_type":"image/jpeg","document_type":"boarding_pass"}'
  ```

- [ ] Commit: `docs: add Edge Function local testing setup and README`

---

## Self-review checklist

- [x] All 9 async job types covered: `cover_photo_fetch`, `pre_trip_checklist_generate`, `treasure_map_generate`, `in_the_bag_suggest` (handles both trip-level and event-level in one handler), `ai_trip_suggest`, `ai_day_suggest`, `flight_lookup`, `youtube_extract`, `tiktok_extract`
- [x] `vision-scan` is a separate synchronous endpoint — not in the async job queue (Steps 9 and 15)
- [x] Scoping validation for `in_the_bag_suggest` is enforced in the Edge Function (Step 6): `trip_day_id` NULL assertion before every insert; non-compliant rows discarded and logged
- [x] Error handling in every handler: `markJobFailed` called on any thrown error; job never left in `processing` state without resolution
- [x] Job status lifecycle `pending → processing → completed/failed` is consistent: each handler calls `markJobProcessing` first, then either `markJobCompleted` or `markJobFailed`
- [x] Gemini prompt templates are explicit and include no-emoji instruction in all prompts that produce user-visible text
- [x] App-side loading states wired for each async feature (Steps 12, 13, 14)
- [x] Plans 1 (database) and 2 (trip/event creation) are assumed complete; this plan hooks into their save handlers without recreating them
- [x] Dispatcher authenticates callers via user JWT or service-role key, and authorises that `job.user_id` matches the authenticated user (Step 2)
- [x] vision-scan validates a user JWT via `supabaseAdmin.auth.getUser(token)` before processing any image — anon key alone is not accepted (Step 9)

---

## Review Fixes Applied

The following targeted fixes were applied to this plan after initial review:

**C1 — youtube_extract and tiktok_extract handlers added**
- Added `'youtube_extract'` and `'tiktok_extract'` to the `JobType` union in Step 1 (shared types).
- Added both types to the dispatcher switch statement description in Step 2.
- Added new **Step 8b** with full handler specs for both functions: Gemini 2.5 Pro prompt to extract named places/activities/restaurants/hotels/tips with timestamps; output written to `async_jobs.output` as `{ items: [...] }`; app-side wiring via `queueJob` on URL submit in the Explore screen "Enhance My Trip" input; Realtime listener drives checklist rendering.
- Updated self-review checklist from "7 async job types" to "9 async job types" with all 9 listed.

**M3 — vision-scan JWT validation**
- Step 9 auth check updated from "verify anon key is present" to "validate a signed Supabase user JWT via `supabaseAdmin.auth.getUser(token)`"; includes explanation that the anon key is public and must not be accepted as sole authentication.

**M5 — Dispatcher authenticates and authorises callers**
- Step 2 dispatcher spec updated to: (a) verify the Authorization header token is a valid user JWT or the service-role key; (b) after fetching the job row, verify `job.user_id === authenticatedUser.id` when called with a user JWT; reject with 401/403 respectively on failure.

**M8 — pre_trip_checklist_generate prompt no-emoji instruction**
- Added explicit sentence "Do not use emojis anywhere in your response." to the Gemini prompt body in Step 4, immediately before the closing "Return only the JSON array" instruction.

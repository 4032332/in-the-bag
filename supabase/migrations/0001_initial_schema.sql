-- Enable UUID generation
create extension if not exists "pgcrypto";

create type subscription_type as enum ('monthly', 'lifetime');
create type subscription_status as enum ('active', 'expired', 'cancelled');
create type invitation_status as enum ('pending', 'accepted', 'declined', 'expired');
create type async_job_type as enum (
  'treasure_map_generate',
  'cover_photo_fetch',
  'youtube_extract',
  'tiktok_extract',
  'flight_lookup',
  'ai_trip_suggest',
  'ai_day_suggest',
  'pre_trip_checklist_generate',
  'in_the_bag_suggest'
);
create type async_job_status as enum ('pending', 'processing', 'completed', 'failed');
create type document_type as enum ('photo', 'document', 'scan', 'qr');
create type tab_source as enum ('tickets', 'documents');
create type task_source as enum ('user', 'ai');
create type milestone_banner_key as enum (
  'insurance_30d',
  'visa_14d',
  'esim_7d',
  'offline_docs_7d',
  'wifi_day_of'
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  date_of_birth date,
  profile_photo_url text,
  phone text,
  address text,
  country_of_residency text,
  citizenship_countries text[],
  passport_expiry date,
  family_role text,
  disability_accessibility_needs text,
  medical_conditions text,
  medications text,
  food_allergies text,
  dietary_requirements text,
  pref_date_format text default 'DD-MM-YYYY',
  pref_time_format text default 'device',
  pref_colour_scheme text default 'auto',
  pref_trip_display_style text default 'tiles' check (pref_trip_display_style in ('tiles','stacked','treasure_map')),
  pref_memories_style text default 'postcards' check (pref_memories_style in ('postcards','fridge_magnets','polaroids','passport_stamps','puzzle_pieces','monopoly_figures')),
  created_at timestamptz not null default now()
);

create table family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  max_members integer not null default 8
);

create table family_group_members (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references family_groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  unique(family_group_id, user_id)
);

create table guest_profiles (
  id uuid primary key default gen_random_uuid(),
  managed_by_user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  date_of_birth date,
  profile_photo_url text,
  family_role text,
  disability_accessibility_needs text,
  medical_conditions text,
  medications text,
  food_allergies text,
  dietary_requirements text,
  created_at timestamptz not null default now()
);

create table family_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references users(id) on delete cascade,
  invitee_email text not null,
  family_role text,
  family_group_id uuid not null references family_groups(id) on delete cascade,
  status invitation_status not null default 'pending',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  responded_at timestamptz
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  cover_photo_url text,
  is_cruise boolean not null default false,
  cruise_details jsonb,
  treasure_map_image_url text,
  treasure_map_layout jsonb,
  display_style text default 'tiles' check (display_style in ('tiles','stacked','treasure_map')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trip_destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  city text not null,
  country text not null,
  start_date date not null,
  end_date date not null,
  display_order integer not null default 0
);

create table trip_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  guest_profile_id uuid references guest_profiles(id) on delete cascade,
  is_premium_sponsor boolean not null default false,
  check (
    (user_id is not null and guest_profile_id is null) or
    (user_id is null and guest_profile_id is not null)
  )
);

create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_number integer not null,
  date date not null,
  unique(trip_id, day_number)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  category text not null,
  subcategory text,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  confirmation_number text,
  reservation_details text,
  notes text,
  ai_generated boolean not null default false,
  linked_transport_event_id uuid references events(id) on delete set null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  guest_profile_id uuid references guest_profiles(id) on delete cascade,
  check (
    (user_id is not null and guest_profile_id is null) or
    (user_id is null and guest_profile_id is not null)
  )
);

create table event_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  label text,
  type document_type not null,
  tab_source tab_source not null default 'documents',
  storage_url text not null,
  created_at timestamptz not null default now()
);

create table trip_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  category text,
  is_completed boolean not null default false,
  is_suggested boolean not null default false,
  is_dismissed boolean not null default false,
  snoozed_until timestamptz,
  source task_source not null default 'user',
  created_at timestamptz not null default now()
);

create table in_the_bag_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  trip_day_id uuid references trip_days(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  title text not null,
  is_packed boolean not null default false,
  is_ai_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  check (not (trip_day_id is not null and event_id is not null))
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type subscription_type not null,
  status subscription_status not null default 'active',
  expires_at timestamptz,
  revenuecat_customer_id text,
  updated_at timestamptz not null default now()
);

create table async_jobs (
  id uuid primary key default gen_random_uuid(),
  type async_job_type not null,
  status async_job_status not null default 'pending',
  input jsonb,
  output jsonb,
  trip_id uuid references trips(id) on delete cascade,
  event_id uuid references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);

create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

create table event_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  icon_name text,
  is_custom boolean not null default false,
  is_cruise_only boolean not null default false
);

create table event_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references event_categories(id) on delete cascade,
  name text not null,
  display_order integer not null default 0
);

create table milestone_banner_states (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  banner_key milestone_banner_key not null,
  dismissed_at timestamptz,
  resurface_at timestamptz,
  action_taken text check (action_taken in ('confirm','dismiss','save_now')),
  unique(trip_id, user_id, banner_key)
);

-- Indexes
create index on trips (owner_user_id);
create index on trip_participants (trip_id);
create index on trip_participants (user_id);
create index on trip_days (trip_id);
create index on events (trip_day_id);
create index on events (trip_id);
create index on trip_tasks (trip_id);
create index on in_the_bag_items (trip_id);
create index on in_the_bag_items (event_id);
create index on in_the_bag_items (trip_day_id);
create index on async_jobs (user_id, status);
create index on async_jobs (trip_id);
create index on milestone_banner_states (trip_id, user_id);
create index on family_group_members (user_id);
create index on family_invitations (token);

-- Partial unique constraints
create unique index on trip_participants (trip_id, user_id) where user_id is not null;
create unique index on trip_participants (trip_id, guest_profile_id) where guest_profile_id is not null;
create unique index on event_participants (event_id, user_id) where user_id is not null;
create unique index on subscriptions (user_id);

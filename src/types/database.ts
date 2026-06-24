export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          date_of_birth: string | null;
          profile_photo_url: string | null;
          phone: string | null;
          address: string | null;
          country_of_residency: string | null;
          citizenship_countries: string[] | null;
          passport_expiry: string | null;
          family_role: string | null;
          disability_accessibility_needs: string | null;
          medical_conditions: string | null;
          medications: string | null;
          food_allergies: string | null;
          dietary_requirements: string | null;
          pref_date_format: string | null;
          pref_time_format: string | null;
          pref_colour_scheme: string | null;
          pref_trip_display_style: string | null;
          pref_memories_style: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      family_groups: {
        Row: {
          id: string;
          name: string;
          created_by_user_id: string;
          created_at: string;
          max_members: number;
        };
        Insert: Omit<Database['public']['Tables']['family_groups']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['family_groups']['Row']>;
      };
      family_group_members: {
        Row: {
          id: string;
          family_group_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['family_group_members']['Row'], 'id' | 'joined_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['family_group_members']['Row']>;
      };
      trips: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          cover_photo_url: string | null;
          is_cruise: boolean;
          cruise_details: Json | null;
          treasure_map_image_url: string | null;
          treasure_map_layout: Json | null;
          display_style: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trips']['Row']>;
      };
      trip_destinations: {
        Row: {
          id: string;
          trip_id: string;
          city: string;
          country: string;
          start_date: string;
          end_date: string;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['trip_destinations']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trip_destinations']['Row']>;
      };
      trip_participants: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string | null;
          guest_profile_id: string | null;
          is_premium_sponsor: boolean;
        };
        Insert: Omit<Database['public']['Tables']['trip_participants']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trip_participants']['Row']>;
      };
      trip_days: {
        Row: {
          id: string;
          trip_id: string;
          day_number: number;
          date: string;
        };
        Insert: Omit<Database['public']['Tables']['trip_days']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trip_days']['Row']>;
      };
      events: {
        Row: {
          id: string;
          trip_day_id: string;
          trip_id: string;
          category: string;
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
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['events']['Row']>;
      };
      event_documents: {
        Row: {
          id: string;
          event_id: string;
          label: string | null;
          type: 'photo' | 'document' | 'scan' | 'qr';
          tab_source: 'tickets' | 'documents';
          storage_url: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['event_documents']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['event_documents']['Row']>;
      };
      trip_tasks: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['trip_tasks']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trip_tasks']['Row']>;
      };
      in_the_bag_items: {
        Row: {
          id: string;
          trip_id: string;
          trip_day_id: string | null;
          event_id: string | null;
          title: string;
          is_packed: boolean;
          is_ai_suggested: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['in_the_bag_items']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['in_the_bag_items']['Row']>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          type: 'monthly' | 'lifetime';
          status: 'active' | 'expired' | 'cancelled';
          expires_at: string | null;
          revenuecat_customer_id: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>;
      };
      async_jobs: {
        Row: {
          id: string;
          type: 'treasure_map_generate' | 'cover_photo_fetch' | 'youtube_extract' | 'tiktok_extract' | 'flight_lookup' | 'ai_trip_suggest' | 'ai_day_suggest' | 'pre_trip_checklist_generate' | 'in_the_bag_suggest';
          status: 'pending' | 'processing' | 'completed' | 'failed';
          input: Json | null;
          output: Json | null;
          trip_id: string | null;
          event_id: string | null;
          user_id: string;
          created_at: string;
          completed_at: string | null;
          error: string | null;
        };
        Insert: Omit<Database['public']['Tables']['async_jobs']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['async_jobs']['Row']>;
      };
      feature_flags: {
        Row: {
          id: string;
          key: string;
          enabled: boolean;
          description: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feature_flags']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['feature_flags']['Row']>;
      };
      milestone_banner_states: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          banner_key: 'insurance_30d' | 'visa_14d' | 'esim_7d' | 'offline_docs_7d' | 'wifi_day_of';
          dismissed_at: string | null;
          resurface_at: string | null;
          action_taken: 'confirm' | 'dismiss' | 'save_now' | null;
        };
        Insert: Omit<Database['public']['Tables']['milestone_banner_states']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['milestone_banner_states']['Row']>;
      };
      event_categories: {
        Row: {
          id: string;
          name: string;
          display_order: number;
          icon_name: string | null;
          is_custom: boolean;
          is_cruise_only: boolean;
        };
        Insert: Omit<Database['public']['Tables']['event_categories']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['event_categories']['Row']>;
      };
      event_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          display_order: number;
        };
        Insert: Omit<Database['public']['Tables']['event_subcategories']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['event_subcategories']['Row']>;
      };
      guest_profiles: {
        Row: {
          id: string;
          managed_by_user_id: string;
          full_name: string;
          date_of_birth: string | null;
          profile_photo_url: string | null;
          family_role: string | null;
          disability_accessibility_needs: string | null;
          medical_conditions: string | null;
          medications: string | null;
          food_allergies: string | null;
          dietary_requirements: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['guest_profiles']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['guest_profiles']['Row']>;
      };
      family_invitations: {
        Row: {
          id: string;
          inviter_user_id: string;
          invitee_email: string;
          family_role: string | null;
          family_group_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'expired';
          token: string;
          created_at: string;
          expires_at: string;
          responded_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['family_invitations']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['family_invitations']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

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
  start_date: string;
  end_date: string;
  display_order: number;
}

export interface TripDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
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

export interface InTheBagItem {
  id: string;
  trip_id: string;
  trip_day_id: string | null;
  event_id: string | null;
  title: string;
  is_packed: boolean;
  is_ai_suggested: boolean;
  created_at: string;
}

export type InTheBagScope =
  | { kind: 'trip'; trip_id: string }
  | { kind: 'day'; trip_id: string; trip_day_id: string }
  | { kind: 'event'; trip_id: string; event_id: string };

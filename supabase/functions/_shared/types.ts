export type JobType = 
  | 'cover_photo_fetch' 
  | 'pre_trip_checklist_generate' 
  | 'treasure_map_generate' 
  | 'in_the_bag_suggest' 
  | 'ai_trip_suggest' 
  | 'ai_day_suggest' 
  | 'flight_lookup' 
  | 'youtube_extract' 
  | 'tiktok_extract';

export interface AsyncJob {
  id: string;
  type: JobType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: Record<string, any>;
  output: Record<string, any> | null;
  trip_id: string | null;
  event_id: string | null;
  user_id: string;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface CoverPhotoFetchInput {
  trip_id: string;
  destinations: Array<{ city: string; country: string }>;
}

export interface PreTripChecklistGenerateInput {
  trip_id: string;
  user_id: string;
  destinations: Array<{ city: string; country: string }>;
  trip_start: string;
  trip_end: string;
  citizenship_countries: string[];
  country_of_residency: string;
  medical_conditions: string | null;
  medications: string | null;
  food_allergies: string | null;
  dietary_requirements: string | null;
  disability_accessibility_needs: string | null;
  is_cruise: boolean;
}

export interface TreasureMapGenerateInput {
  trip_id: string;
  destinations: Array<{ city: string; country: string }>;
  is_cruise: boolean;
}

export interface InTheBagSuggestInput {
  trip_id: string;
  event_id: string | null;
  event_category?: string;
  event_subcategory?: string | null;
  destination_city?: string;
  destination_country?: string;
  destinations?: Array<{ city: string; country: string }>;
  trip_start: string;
  trip_end: string;
  medical_conditions: string | null;
  dietary_requirements: string | null;
  disability_accessibility_needs: string | null;
}

export interface AiTripSuggestInput {
  trip_id: string;
  user_message: string;
  conversation_history: Array<{ role: 'user' | 'model'; text: string }>;
  trip_context: { 
    destinations: Array<{ city: string; country: string }>; 
    trip_start: string; 
    trip_end: string; 
    existing_event_count: number;
  };
  user_profile: { 
    medical_conditions: string | null; 
    dietary_requirements: string | null; 
    disability_accessibility_needs: string | null;
  };
}

export interface AiDaySuggestInput {
  trip_id: string;
  trip_day_id: string;
  day_date: string;
  user_message: string;
  conversation_history: Array<{ role: 'user' | 'model'; text: string }>;
  trip_context: { 
    destinations: Array<{ city: string; country: string }>; 
    trip_start: string; 
    trip_end: string; 
  };
  existing_day_events: Array<{ category: string; title: string; start_time: string | null }>;
  user_profile: { 
    medical_conditions: string | null; 
    dietary_requirements: string | null; 
    disability_accessibility_needs: string | null;
  };
}

export interface FlightLookupInput {
  flight_number: string;
  flight_date: string;
}

export interface VideoExtractInput {
  trip_id: string;
  url: string;
  user_id: string;
}

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

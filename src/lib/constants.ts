import Constants from 'expo-constants';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const DEMO_MODE_ENABLED: boolean =
  Constants.expoConfig?.extra?.demoModeEnabled === true;

export const DEMO_TIER_KEY = 'demo_tier' as const;
export type DemoTier = 'free' | 'premium';

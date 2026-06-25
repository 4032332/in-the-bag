import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'In the Bag',
  slug: 'in-the-bag',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'inthebag',
  ios: {
    bundleIdentifier: 'app.inthebag',
    supportsTablet: false,
    infoPlist: {
      NSHealthShareUsageDescription: 'In the Bag reads your step count, active energy, and floors climbed during travel dates to show your travel health stats.',
      NSHealthUpdateUsageDescription: 'In the Bag does not write any health data.',
    },
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    eas: {
      projectId: '4cdd5915-bc44-482a-ad51-2cc6b3e8a4a7',
    },
    isTestFlight: process.env.IS_TESTFLIGHT === 'true',
    REVENUECAT_API_KEY_IOS: process.env.REVENUECAT_API_KEY_IOS,
  },
});

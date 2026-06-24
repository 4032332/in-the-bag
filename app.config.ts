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
  },
  android: {
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'inthebag', host: 'invite' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    demoModeEnabled: process.env.DEMO_MODE_ENABLED === 'true',
  },
});

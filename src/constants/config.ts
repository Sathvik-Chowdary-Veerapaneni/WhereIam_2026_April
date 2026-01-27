export const Config = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  analytics: {
    enabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '',
  },
  plaid: {
    clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || '',
    env: process.env.EXPO_PUBLIC_PLAID_ENV || 'sandbox',
  },
  revenueCat: {
    apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '',
  },
};

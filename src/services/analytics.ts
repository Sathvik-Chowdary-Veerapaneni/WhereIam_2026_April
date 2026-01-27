import { Config } from '../constants/config';

/**
 * Analytics service - placeholder for integration with Mixpanel, Amplitude, or similar
 * Currently uses console logging for development
 */
export const analyticsService = {
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    console.log(`[Analytics] Event: ${eventName}`, properties);

    // TODO: Integrate with analytics provider
    // Example: mixpanel.track(eventName, properties);
  },

  trackScreen(screenName: string, properties?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    console.log(`[Analytics] Screen: ${screenName}`, properties);

    // TODO: Integrate with analytics provider
    // Example: mixpanel.trackPageView(screenName, properties);
  },

  setUserProperties(userId: string, properties: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    console.log(`[Analytics] Set user properties for ${userId}:`, properties);

    // TODO: Integrate with analytics provider
    // Example: mixpanel.people.set(userId, properties);
  },

  trackError(error: Error, context?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    console.error(`[Analytics] Error: ${error.message}`, context);

    // TODO: Integrate with error tracking (Sentry, etc.)
  },
};

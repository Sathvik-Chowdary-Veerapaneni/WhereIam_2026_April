import { Mixpanel } from 'mixpanel-react-native';
import { Config } from '../constants/config';

// Initialize Mixpanel (lazy initialization)
let mixpanel: Mixpanel | null = null;

const getMixpanelInstance = async (): Promise<Mixpanel | null> => {
  if (!Config.analytics.enabled) return null;
  if (mixpanel) return mixpanel;

  try {
    const token = Config.analytics.mixpanelToken;
    if (!token) {
      console.warn('[Analytics] Mixpanel token not configured, using console logging only');
      return null;
    }

    mixpanel = new Mixpanel(token);
    await mixpanel?.init();
    return mixpanel;
  } catch (error) {
    console.error('[Analytics] Mixpanel initialization error:', error);
    return null;
  }
};

/**
 * Analytics service - Mixpanel integration with fallback to console logging
 * Can be disabled via Config.analytics.enabled
 */
export const analyticsService = {
  async trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.track(eventName, properties || {});
      }
    } catch (error) {
      console.error(`[Analytics] Event tracking error for ${eventName}:`, error);
    }

    // Fallback: log to console
    console.log(`[Analytics] Event: ${eventName}`, properties);
  },

  async trackScreen(screenName: string, properties?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.trackWithProperties(`screen_${screenName}`, properties || {});
      }
    } catch (error) {
      console.error(`[Analytics] Screen tracking error for ${screenName}:`, error);
    }

    // Fallback: log to console
    console.log(`[Analytics] Screen: ${screenName}`, properties);
  },

  async setUserProperties(userId: string, properties: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.identify(userId);
        instance.getPeople().set(properties);
      }
    } catch (error) {
      console.error(`[Analytics] User property error for ${userId}:`, error);
    }

    // Fallback: log to console
    console.log(`[Analytics] Set user properties for ${userId}:`, properties);
  },

  async trackError(error: Error, context?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    const errorData = {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    };

    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.trackWithProperties('app_error', errorData);
      }
    } catch (err) {
      console.error('[Analytics] Error tracking failed:', err);
    }

    // Always log errors to console
    console.error(`[Analytics] Error: ${error.message}`, errorData);
  },

  /**
   * Reset analytics for logged-out state
   */
  async reset() {
    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.reset();
      }
    } catch (error) {
      console.error('[Analytics] Reset error:', error);
    }
  },
};

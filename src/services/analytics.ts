import { Mixpanel } from 'mixpanel-react-native';
import { Config } from '../constants/config';
import { logger } from '../utils';

// Initialize Mixpanel (lazy initialization)
let mixpanel: Mixpanel | null = null;

const getMixpanelInstance = async (): Promise<Mixpanel | null> => {
  if (!Config.analytics.enabled) return null;
  if (mixpanel) return mixpanel;

  try {
    const token = Config.analytics.mixpanelToken;
    if (!token) {
      logger.warn('Mixpanel token not configured, using console logging only');
      return null;
    }

    mixpanel = new Mixpanel(token, false);
    await mixpanel?.init();
    return mixpanel;
  } catch (error) {
    logger.error('Mixpanel initialization error:', error);
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
      logger.error(`Event tracking error for ${eventName}:`, error);
    }

    // Fallback: log to console in dev
    if (__DEV__) {
      logger.debug(`[Analytics] Event: ${eventName}`, properties);
    }
  },

  async trackScreen(screenName: string, properties?: Record<string, any>) {
    if (!Config.analytics.enabled) return;

    try {
      const instance = await getMixpanelInstance();
      if (instance) {
        instance.track(`screen_${screenName}`, properties || {});
      }
    } catch (error) {
      logger.error(`Screen tracking error for ${screenName}:`, error);
    }

    // Fallback: log to console in dev
    if (__DEV__) {
      logger.debug(`[Analytics] Screen: ${screenName}`, properties);
    }
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
      logger.error(`User property error for ${userId}:`, error);
    }

    // Fallback: log to console in dev
    if (__DEV__) {
      logger.debug(`[Analytics] Set user properties for ${userId}:`, properties);
    }
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
        instance.track('app_error', errorData);
      }
    } catch (err) {
      logger.error('Error tracking failed:', err);
    }

    // Always log errors
    logger.error(`App error: ${error.message}`, errorData);
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
      logger.error('Analytics reset error:', error);
    }
  },
};

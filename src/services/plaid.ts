import { Config } from '../constants/config';
import { logger } from '../utils';

/**
 * Plaid service - placeholder for MVP
 * TODO: Implement actual Plaid SDK integration in v2
 * Requires: Backend endpoint for token exchange (security requirement)
 */
export const plaidService = {
  async createLinkToken(userId: string) {
    try {
      logger.debug('[Plaid] Creating link token for user:', userId);

      // MVP: Return placeholder - implement backend in v2
      // Backend should use Plaid secret key (never expose in client)
      return {
        success: true,
        linkToken: null,
        message: 'Plaid integration coming in v2',
      };
    } catch (error) {
      logger.error('[Plaid] Error creating link token:', error);
      return { success: false, error };
    }
  },

  async exchangePublicToken(publicToken: string) {
    try {
      logger.debug('[Plaid] Exchanging public token');

      // MVP: Return placeholder - implement backend in v2
      return {
        success: true,
        accessToken: null,
        message: 'Plaid integration coming in v2',
      };
    } catch (error) {
      logger.error('[Plaid] Error exchanging token:', error);
      return { success: false, error };
    }
  },

  async getAccounts(_accessToken: string) {
    try {
      logger.debug('[Plaid] Fetching accounts');

      // MVP: Return empty - implement backend in v2
      return {
        success: true,
        accounts: [],
        message: 'Plaid integration coming in v2',
      };
    } catch (error) {
      logger.error('[Plaid] Error fetching accounts:', error);
      return { success: false, error };
    }
  },
};


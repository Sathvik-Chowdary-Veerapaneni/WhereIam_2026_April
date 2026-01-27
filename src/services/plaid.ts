import { Config } from '../constants/config';

/**
 * Plaid service - placeholder for MVP
 * Actual implementation requires Plaid SDK and native module setup
 */
export const plaidService = {
  async createLinkToken(userId: string) {
    try {
      console.log('[Plaid] Creating link token for user:', userId);

      // TODO: Call Plaid API to create link token
      // In production: call backend endpoint that creates link token
      // Backend should use Plaid secrets key (never expose public client ID in production)

      // Placeholder response
      return {
        success: true,
        linkToken: 'link-sandbox-mock-token',
      };
    } catch (error) {
      console.error('[Plaid] Error creating link token:', error);
      return { success: false, error };
    }
  },

  async exchangePublicToken(publicToken: string) {
    try {
      console.log('[Plaid] Exchanging public token');

      // TODO: Call backend to exchange publicToken for accessToken
      // Backend should handle this with Plaid secrets key

      return {
        success: true,
        accessToken: 'access-token-mock',
      };
    } catch (error) {
      console.error('[Plaid] Error exchanging token:', error);
      return { success: false, error };
    }
  },

  async getAccounts(accessToken: string) {
    try {
      console.log('[Plaid] Fetching accounts');

      // TODO: Call backend to fetch accounts using accessToken

      return {
        success: true,
        accounts: [],
      };
    } catch (error) {
      console.error('[Plaid] Error fetching accounts:', error);
      return { success: false, error };
    }
  },
};

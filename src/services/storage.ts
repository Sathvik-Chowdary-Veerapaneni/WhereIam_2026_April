import * as SecureStore from 'expo-secure-store';

/**
 * Secure storage service using expo-secure-store
 * Encrypts data and stores it securely on device
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving ${key}:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      // Note: expo-secure-store doesn't have a batch delete
      // Clear specific keys manually as needed
      console.warn('Manual clearing of specific keys recommended');
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },
};

// Common storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'debt_mirror_auth_token',
  USER_ID: 'debt_mirror_user_id',
  PLAID_TOKEN: 'debt_mirror_plaid_token',
  APP_PREFERENCES: 'debt_mirror_preferences',
};

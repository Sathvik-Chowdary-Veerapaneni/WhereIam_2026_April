import React, { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider, ThemeProvider } from './src/context';
import { revenueCatService, analyticsService, authService, supabase } from './src/services';
import { logger } from './src/utils';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('Initializing Debt Mirror...');

        // Initialize RevenueCat
        const { success: rcSuccess } = await revenueCatService.initialize();
        if (rcSuccess) {
          logger.info('RevenueCat initialized');
        }

        // Track app launch
        analyticsService.trackEvent('app_launched');

        logger.info('App initialization complete');
      } catch (error) {
        logger.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  // Handle deep links for OAuth authentication
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      logger.info('Deep link received:', url);

      try {
        const parsedUrl = new URL(url);

        // Check for auth callback paths
        if (parsedUrl.pathname.includes('/auth/callback') ||
            parsedUrl.host === 'auth') {

          const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
          const queryParams = new URLSearchParams(parsedUrl.search);

          // Check for access token in hash (OAuth callback)
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          // Check for auth code in query (PKCE flow)
          const code = queryParams.get('code');

          if (accessToken) {
            logger.info('Setting session from deep link tokens');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              logger.error('Error setting session:', error);
              Alert.alert('Error', 'Failed to sign in. Please try again.');
            } else {
              logger.info('Successfully signed in via OAuth');
            }
          } else if (code) {
            logger.info('Exchanging code for session');
            const { success, error } = await authService.exchangeCodeForSession(code);

            if (!success) {
              logger.error('Error exchanging code:', error);
              Alert.alert('Error', 'Failed to verify. Please try again.');
            } else {
              logger.info('Successfully verified via code exchange');
            }
          }
        }
      } catch (error) {
        logger.error('Error handling deep link:', error);
      }
    };

    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    getInitialURL();

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

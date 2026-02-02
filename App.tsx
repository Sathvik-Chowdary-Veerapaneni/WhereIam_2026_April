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

  // Handle deep links for magic link authentication
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      logger.info('Deep link received:', url);

      try {
        // Parse the URL to extract auth parameters
        const parsedUrl = new URL(url);

        // Check for auth callback paths
        if (parsedUrl.pathname.includes('/auth/callback') ||
            parsedUrl.host === 'auth' ||
            parsedUrl.pathname.includes('/verify')) {

          // Extract hash parameters (Supabase uses hash for tokens)
          const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
          const queryParams = new URLSearchParams(parsedUrl.search);

          // Check for access token in hash (OAuth/magic link callback)
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          // Check for verification code in query
          const code = queryParams.get('code');
          const tokenHash = queryParams.get('token_hash');
          const tokenType = queryParams.get('type');

          if (accessToken) {
            // Set session directly with tokens
            logger.info('Setting session from deep link tokens');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              logger.error('Error setting session:', error);
              Alert.alert('Error', 'Failed to sign in. Please try again.');
            } else {
              logger.info('Successfully signed in via magic link');
            }
          } else if (code) {
            // Exchange code for session (PKCE flow)
            logger.info('Exchanging code for session');
            const { success, error } = await authService.exchangeCodeForSession(code);

            if (!success) {
              logger.error('Error exchanging code:', error);
              Alert.alert('Error', 'Failed to verify. Please try again.');
            } else {
              logger.info('Successfully verified via code exchange');
            }
          } else if (tokenHash) {
            // Verify OTP token
            logger.info('Verifying magic link token');
            const { success, error } = await authService.verifyMagicLink(
              tokenHash,
              (tokenType as 'magiclink' | 'signup' | 'recovery') || 'magiclink'
            );

            if (!success) {
              logger.error('Error verifying token:', error);
              Alert.alert('Error', 'Verification link is invalid or expired. Please request a new one.');
            } else {
              logger.info('Successfully verified via magic link');
            }
          }
        }
      } catch (error) {
        logger.error('Error handling deep link:', error);
      }
    };

    // Handle initial URL (app opened via link)
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    getInitialURL();

    // Handle URLs when app is already open
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

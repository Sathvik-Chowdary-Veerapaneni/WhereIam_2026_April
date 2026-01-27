import React, { useEffect } from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { revenueCatService, analyticsService } from './src/services';
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

  return <RootNavigator />;
}

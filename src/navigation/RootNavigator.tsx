import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { authService } from '../services';
import { RootStackParamList } from './types';
import { logger } from '../utils';
import { HomeScreen, LoginScreen, NotFoundScreen, TestScreen } from '../screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { success, user } = await authService.getCurrentUser();
        setIsSignedIn(success && !!user);
      } catch (error) {
        logger.error('Auth check failed:', error);
        setIsSignedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return null; // TODO: Replace with splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
        }}
      >
        {isSignedIn ? (
          // App Stack
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{ title: 'Debt Mirror' }}
            />
            <Stack.Screen 
              name="Test" 
              component={TestScreen}
              options={{ title: 'Test' }}
            />
          </>
        ) : (
          // Auth Stack
          <>
            <Stack.Screen
              name="Auth"
              component={LoginScreen}
              options={{
                animationEnabled: false,
                title: 'Sign In',
              }}
            />
            <Stack.Screen 
              name="Test" 
              component={TestScreen}
              options={{ title: 'Test Connection' }}
            />
          </>
        )}

        {/* Common error screen */}
        <Stack.Screen
          name="NotFound"
          component={NotFoundScreen}
          options={{
            title: 'Not Found',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

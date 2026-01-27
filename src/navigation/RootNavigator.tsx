import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { authService } from '../services';
import { RootStackParamList } from './types';
import { logger } from '../utils';
import { HomeScreen, LoginScreen, NotFoundScreen } from '../screens';

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
          headerShown: false,
        }}
      >
        {isSignedIn ? (
          // App Stack
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // Auth Stack
          <Stack.Screen
            name="Auth"
            component={LoginScreen}
            options={{
              animationEnabled: false,
            }}
          />
        )}

        {/* Common error screen */}
        <Stack.Screen
          name="NotFound"
          component={NotFoundScreen}
          options={{
            title: 'Oops!',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

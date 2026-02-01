import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../context';
import {
  AuthScreen,
  OnboardingScreen,
  DashboardScreen,
  SettingsScreen,
  AddDebtScreen,
  DebtLedgerScreen,
  IncomeLedgerScreen,
  HomeScreen,
  NotFoundScreen,
  TestScreen,
  EditProfileScreen,
} from '../screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Loading screen while checking auth state
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Guest banner component
const GuestBanner: React.FC<{ daysRemaining: number }> = ({ daysRemaining }) => (
  <View style={styles.guestBanner}>
    <Text style={styles.guestBannerText}>
      Guest Mode • {daysRemaining} days remaining
    </Text>
  </View>
);

export const RootNavigator: React.FC = () => {
  const { session, isLoading, isOnboarded, isGuest, guestDaysRemaining } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // User is authenticated (has session) OR is in guest mode
  const isAuthenticated = session !== null || isGuest;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerStyle: {
            backgroundColor: '#0A0A0F',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#0A0A0F',
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - User not signed in and not in guest mode
          <>
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                headerShown: false,
                animationTypeForReplace: 'pop',
              }}
            />
          </>
        ) : !isOnboarded ? (
          // Onboarding Stack - User signed in/guest but not onboarded
          <>
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </>
        ) : (
          // App Stack - User signed in/guest and onboarded
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Settings',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="AddDebt"
              component={AddDebtScreen}
              options={({ route }) => ({
                title: route.params?.debtId ? 'Edit Debt' : 'Add Debt',
                presentation: 'card',
              })}
            />
            <Stack.Screen
              name="DebtLedger"
              component={DebtLedgerScreen}
              options={({ route }) => ({
                title: route.params?.currencyCode
                  ? `${route.params.currencyCode} Debts`
                  : 'Debts List',
                presentation: 'card',
              })}
            />
            <Stack.Screen
              name="IncomeLedger"
              component={IncomeLedgerScreen}
              options={{
                title: 'Income Sources',
                presentation: 'card',
              }}
            />
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
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{
                title: 'Income & Profession',
                presentation: 'card',
              }}
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  guestBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  guestBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

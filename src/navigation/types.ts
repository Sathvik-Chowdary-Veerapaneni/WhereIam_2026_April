/**
 * Navigation type definitions
 * Define all navigation parameters here
 */

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
  NotFound: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Dashboard: undefined;
  Settings: undefined;
};

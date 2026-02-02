import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Config } from '../constants/config';
import { logger } from '../utils';

// Get the redirect URL for auth - works with both Expo Go and standalone apps
const getAuthRedirectUrl = () => {
  // This creates the correct URL for the current environment
  // - Expo Go: exp://192.168.x.x:8081/--/auth/callback
  // - Standalone: debtmirror://auth/callback
  return Linking.createURL('auth/callback');
};

// Initialize Supabase client
export const supabase = createClient(Config.supabase.url, Config.supabase.anonKey);

// Auth service
export const authService = {
  async signUp(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error };
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error };
    }
  },

  // Magic link (email OTP) authentication
  async sendMagicLink(email: string) {
    try {
      const redirectUrl = getAuthRedirectUrl();
      logger.info('Magic link redirect URL:', redirectUrl);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      logger.info('Magic link sent to:', email);
      return { success: true };
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, error };
    }
  },

  // Verify magic link token (called when deep link is opened)
  async verifyMagicLink(token: string, type: 'magiclink' | 'signup' | 'recovery' = 'magiclink') {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (error) throw error;
      logger.info('Magic link verified successfully');
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error('Verify magic link error:', error);
      return { success: false, error };
    }
  },

  // Exchange auth code from URL for session
  async exchangeCodeForSession(code: string) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      logger.info('Code exchanged for session successfully');
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error('Exchange code error:', error);
      return { success: false, error };
    }
  },

  async signInWithOAuth(provider: 'google' | 'apple') {
    try {
      // Note: This requires deep linking setup and specific platform configuration
      const redirectUrl = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('OAuth error:', error);
      return { success: false, error };
    }
  },

  // Verify email OTP (6-digit code)
  async verifyEmailOtp(email: string, token: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      logger.info('Email OTP verified successfully');
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error };
    }
  },

  // Resend OTP for signup verification
  async resendOtp(email: string) {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      logger.info('OTP resent to:', email);
      return { success: true };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { success: false, error };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, error };
    }
  },
};

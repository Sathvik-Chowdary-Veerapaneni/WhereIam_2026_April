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

  // Send OTP code to email for sign-in
  async sendOtp(email: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      logger.info('OTP sent to:', email);
      return { success: true };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, error };
    }
  },

  // Send OTP code to email for signup (creates user if not exists)
  async sendSignUpOtp(email: string) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      logger.info('Sign-up OTP sent to:', email);
      return { success: true };
    } catch (error) {
      console.error('Send sign-up OTP error:', error);
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
  async verifyEmailOtp(email: string, token: string, otpType: 'signup' | 'email' = 'email') {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: otpType,
      });
      if (error) throw error;
      logger.info('Email OTP verified successfully');
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error };
    }
  },

  // Resend OTP for email verification
  async resendOtp(email: string, otpType: 'signup' | 'email' = 'email') {
    try {
      const { error } = await supabase.auth.resend({
        type: otpType,
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

  // Update user display name
  async updateDisplayName(name: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: name },
      });
      if (error) throw error;
      logger.info('Display name updated:', name);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Update display name error:', error);
      return { success: false, error };
    }
  },

  // Save display name to profiles table
  async saveProfileName(userId: string, displayName: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      logger.info('Profile name saved');
      return { success: true };
    } catch (error) {
      console.error('Save profile name error:', error);
      return { success: false, error };
    }
  },

  // Get profile display name
  async getProfileName(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return { success: true, displayName: data?.display_name || null };
    } catch (error) {
      console.error('Get profile name error:', error);
      return { success: false, error, displayName: null };
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

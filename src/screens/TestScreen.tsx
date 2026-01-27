import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { authService, supabase } from '../services';
import { logger } from '../utils';

export const TestScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [testEmail] = useState(`test${Date.now()}@example.com`);
  const [testPassword] = useState('TestPassword123!');

  const testSupabaseConnection = async () => {
    setLoading(true);
    setStatus('Testing Supabase connection...');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      setStatus('✅ Supabase connected successfully!');
      logger.info('Supabase connection verified');
    } catch (error) {
      setStatus('❌ Connection failed: ' + (error as Error).message);
      logger.error('Supabase connection error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSignUp = async () => {
    setLoading(true);
    setStatus('Creating test account...');
    try {
      const { success, user, error } = await authService.signUp(testEmail, testPassword);
      if (!success) throw error || new Error('Sign up failed');
      
      setStatus(`✅ Account created: ${user?.email}`);
      logger.info('Test account created:', user?.email);
      
      // Auto logout after test
      setTimeout(() => authService.signOut(), 2000);
    } catch (error) {
      setStatus('❌ Sign up failed: ' + (error as Error).message);
      logger.error('Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    setStatus('Testing sign in...');
    try {
      const { success, user, error } = await authService.signIn(testEmail, testPassword);
      if (!success) throw error || new Error('Sign in failed');
      
      setStatus(`✅ Signed in: ${user?.email}`);
      logger.info('Test sign in successful:', user?.email);
      
      // Auto logout after test
      setTimeout(() => authService.signOut(), 2000);
    } catch (error) {
      setStatus('❌ Sign in failed: ' + (error as Error).message);
      logger.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseTables = async () => {
    setLoading(true);
    setStatus('Checking database tables...');
    try {
      // Try to query profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      
      setStatus('✅ Database tables ready!');
      logger.info('Database check passed');
    } catch (error) {
      const errorMsg = (error as any)?.message || String(error);
      if (errorMsg.includes('relation "public.profiles" does not exist')) {
        setStatus('⚠️  Database schema not created yet. Run DATABASE_SCHEMA.sql in Supabase');
      } else {
        setStatus('❌ Database check failed: ' + errorMsg);
      }
      logger.error('Database check error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Supabase Test Panel</Text>
        <Text style={styles.subtitle}>Verify all connections are working</Text>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{status || 'Ready to test'}</Text>
        </View>

        {loading && <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />}

        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary]} 
          onPress={testSupabaseConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={checkDatabaseTables}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Database</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={testSignUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonSecondary]} 
          onPress={testSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Sign In</Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoText}>Test Email: {testEmail}</Text>
          <Text style={styles.infoText}>Test Password: {testPassword}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  statusBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0066CC',
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Courier',
  },
  loader: {
    marginVertical: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0066CC',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  info: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
    fontFamily: 'Courier',
  },
});

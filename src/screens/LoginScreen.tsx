import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { authService } from '../services';
import { logger } from '../utils';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { success, user, error } = isSignUp 
        ? await authService.signUp(email, password)
        : await authService.signIn(email, password);

      if (!success) {
        throw error || new Error('Authentication failed');
      }

      logger.info(`${isSignUp ? 'Sign up' : 'Sign in'} successful:`, user?.email);
      Alert.alert('Success', `Welcome ${user?.email}`);
    } catch (error) {
      const message = (error as Error).message || 'Authentication failed';
      logger.error('Auth error:', error);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Debt Mirror</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            editable={!loading}
            value={password}
            onChangeText={setPassword}
          />

          {loading && <ActivityIndicator size="large" color="#0066CC" style={styles.loader} />}

          <TouchableOpacity 
            style={[styles.button, styles.buttonPrimary]} 
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
            }}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have account? Sign In' : "Don't have account? Sign Up"}
            </Text>
          </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  loader: {
    marginVertical: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPrimary: {
    backgroundColor: '#0066CC',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    paddingVertical: 12,
  },
  toggleText: {
    color: '#0066CC',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

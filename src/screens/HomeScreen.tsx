import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { authService } from '../services';
import { logger } from '../utils';

export const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { success, error } = await authService.signOut();
      if (!success) throw error;
      logger.info('Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Debt Mirror</Text>
        <Text style={styles.subtitle}>Your Personal Debt Tracker</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dashboard</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Debts</Text>
            <Text style={styles.cardValue}>0</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Balance</Text>
            <Text style={styles.cardValue}>$0.00</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Interest Rate (Avg)</Text>
            <Text style={styles.cardValue}>0%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>+ Add Debt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Link Bank Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Analytics</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleLogout}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  actionButton: {
    backgroundColor: '#e8f0ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
  },
  actionButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
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
});

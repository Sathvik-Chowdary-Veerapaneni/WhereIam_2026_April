import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export const NotFoundScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>Screen not found</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
});

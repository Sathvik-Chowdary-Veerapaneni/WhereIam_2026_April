import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { user } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.userName}>
                            {user?.email?.split('@')[0] || 'User'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.settingsButton}
                        onPress={() => navigation.navigate('Settings')}
                    >
                        <Text style={styles.settingsIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* Character State Placeholder */}
                <View style={styles.characterCard}>
                    <View style={styles.characterPlaceholder}>
                        <Text style={styles.characterEmoji}>🧙‍♂️</Text>
                    </View>
                    <Text style={styles.characterTitle}>Your Financial Avatar</Text>
                    <Text style={styles.characterSubtitle}>
                        Coming soon: Watch your character evolve as you pay off debt!
                    </Text>
                </View>

                {/* Totals Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Debts</Text>
                        <Text style={styles.statValue}>0</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Balance</Text>
                        <Text style={styles.statValueLarge}>$0.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Monthly Payment</Text>
                        <Text style={styles.statValue}>$0.00</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Interest</Text>
                        <Text style={styles.statValue}>0%</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionIcon}>➕</Text>
                        <Text style={styles.actionText}>Add Debt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionIcon}>🏦</Text>
                        <Text style={styles.actionText}>Link Bank</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionIcon}>📊</Text>
                        <Text style={styles.actionText}>Analytics</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        color: '#8E8E93',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    settingsButton: {
        width: 44,
        height: 44,
        backgroundColor: '#1C1C1E',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsIcon: {
        fontSize: 20,
    },
    characterCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    characterPlaceholder: {
        width: 100,
        height: 100,
        backgroundColor: '#2C2C2E',
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    characterEmoji: {
        fontSize: 48,
    },
    characterTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    characterSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        width: '48%',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    statLabel: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statValueLarge: {
        fontSize: 24,
        fontWeight: '700',
        color: '#34C759',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    actionText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '500',
    },
});

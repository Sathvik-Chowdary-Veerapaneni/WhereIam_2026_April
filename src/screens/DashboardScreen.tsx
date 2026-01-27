import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context';
import { debtsService, Debt } from '../services/debts';
import { logger } from '../utils';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const DEBT_TYPE_ICONS: Record<string, string> = {
    credit_card: '💳',
    loan: '🏦',
    student_loan: '🎓',
    mortgage: '🏠',
    auto_loan: '🚗',
    medical: '🏥',
    other: '📋',
};

export const DashboardScreen: React.FC = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { user } = useAuth();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totals, setTotals] = useState({
        totalBalance: 0,
        totalDebts: 0,
        avgInterestRate: 0,
        totalMinPayment: 0,
    });

    const fetchData = useCallback(async () => {
        try {
            const [debtsResult, totalsResult] = await Promise.all([
                debtsService.listDebts(),
                debtsService.getDebtTotals(),
            ]);

            if (debtsResult.success && debtsResult.debts) {
                setDebts(debtsResult.debts);
            }

            if (totalsResult.success) {
                setTotals({
                    totalBalance: totalsResult.totalBalance || 0,
                    totalDebts: totalsResult.totalDebts || 0,
                    avgInterestRate: totalsResult.avgInterestRate || 0,
                    totalMinPayment: totalsResult.totalMinPayment || 0,
                });
            }
        } catch (error) {
            logger.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh on screen focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                    />
                }
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
                        {totals.totalDebts > 0
                            ? `Fighting ${totals.totalDebts} debt${totals.totalDebts > 1 ? 's' : ''}!`
                            : 'Add your first debt to begin the journey!'}
                    </Text>
                </View>

                {/* Totals Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Debts</Text>
                        <Text style={styles.statValue}>{totals.totalDebts}</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardLarge]}>
                        <Text style={styles.statLabel}>Total Balance</Text>
                        <Text style={[styles.statValueLarge, totals.totalBalance > 0 && styles.statValueRed]}>
                            {formatCurrency(totals.totalBalance)}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Monthly Payment</Text>
                        <Text style={styles.statValue}>{formatCurrency(totals.totalMinPayment)}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Interest</Text>
                        <Text style={styles.statValue}>{totals.avgInterestRate.toFixed(1)}%</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('AddDebt')}
                    >
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

                {/* Debts List */}
                {debts.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Your Debts</Text>
                        <View style={styles.debtsList}>
                            {debts.map((debt) => (
                                <TouchableOpacity
                                    key={debt.id}
                                    style={styles.debtCard}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.debtIcon}>
                                        <Text style={styles.debtIconText}>
                                            {DEBT_TYPE_ICONS[debt.debt_type] || '📋'}
                                        </Text>
                                    </View>
                                    <View style={styles.debtInfo}>
                                        <Text style={styles.debtName}>{debt.name}</Text>
                                        <Text style={styles.debtType}>
                                            {debt.creditor_name || debt.debt_type.replace('_', ' ')}
                                        </Text>
                                    </View>
                                    <View style={styles.debtAmount}>
                                        <Text style={styles.debtBalance}>
                                            {formatCurrency(debt.current_balance)}
                                        </Text>
                                        {debt.interest_rate != null && (
                                            <Text style={styles.debtRate}>{debt.interest_rate}% APR</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {/* Empty State */}
                {debts.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💸</Text>
                        <Text style={styles.emptyTitle}>No debts yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Add your first debt to start tracking your journey to financial freedom!
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('AddDebt')}
                        >
                            <Text style={styles.emptyButtonText}>Add Your First Debt</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    statCardLarge: {
        width: '48%',
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
        fontSize: 22,
        fontWeight: '700',
        color: '#34C759',
    },
    statValueRed: {
        color: '#FF3B30',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
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
    debtsList: {
        gap: 12,
    },
    debtCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    debtIcon: {
        width: 44,
        height: 44,
        backgroundColor: '#2C2C2E',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    debtIconText: {
        fontSize: 20,
    },
    debtInfo: {
        flex: 1,
    },
    debtName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    debtType: {
        fontSize: 13,
        color: '#8E8E93',
        textTransform: 'capitalize',
    },
    debtAmount: {
        alignItems: 'flex-end',
    },
    debtBalance: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF3B30',
    },
    debtRate: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    emptyButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

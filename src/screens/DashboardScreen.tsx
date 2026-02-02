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
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { debtsService, Debt } from '../services/debts';
import { incomeService, IncomeSource } from '../services/incomeService';
import { localStorageService, LocalDebt, LocalIncome } from '../services';
import { logger } from '../utils';
import { formatCurrencyAmount, getCurrencyByCode } from '../constants/currencies';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface CurrencyTotal {
    totalBalance: number;
    totalMinPayment: number;
    debtCount: number;
}

export const DashboardScreen: React.FC = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { user, isGuest, guestDaysRemaining } = useAuth();
    const { colors } = useTheme();

    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalsByCurrency, setTotalsByCurrency] = useState<{ [currencyCode: string]: CurrencyTotal }>({});
    const [totalDebts, setTotalDebts] = useState(0);
    const [avgInterestRate, setAvgInterestRate] = useState(0);
    const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
    const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);
    const [showGuestBanner, setShowGuestBanner] = useState(true);

    const styles = createStyles(colors);

    const fetchData = useCallback(async () => {
        try {
            if (isGuest) {
                // Fetch data from local storage for guest users
                const localDebts = await localStorageService.getLocalDebts();
                const localIncome = await localStorageService.getLocalIncome();

                // Convert local debts to Debt format for display
                const formattedDebts: Debt[] = localDebts.map(d => ({
                    ...d,
                    user_id: 'guest',
                }));
                setDebts(formattedDebts);

                // Calculate totals by currency from local debts
                const activeDebts = localDebts.filter(d => d.status === 'active');
                const totals: { [currencyCode: string]: CurrencyTotal } = {};

                for (const debt of activeDebts) {
                    const currencyCode = debt.currency_code || 'USD';
                    if (!totals[currencyCode]) {
                        totals[currencyCode] = { totalBalance: 0, totalMinPayment: 0, debtCount: 0 };
                    }
                    totals[currencyCode].totalBalance += debt.current_balance || 0;
                    totals[currencyCode].totalMinPayment += debt.minimum_payment || 0;
                    totals[currencyCode].debtCount += 1;
                }

                setTotalsByCurrency(totals);
                setTotalDebts(activeDebts.length);

                // Calculate avg interest rate
                const debtsWithRate = activeDebts.filter(d => d.interest_rate != null);
                const avgRate = debtsWithRate.length > 0
                    ? debtsWithRate.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debtsWithRate.length
                    : 0;
                setAvgInterestRate(avgRate);

                // Set income from local storage
                const total = localIncome.reduce((sum, s) => sum + s.amount, 0);
                setTotalMonthlyIncome(total);
                setIncomeSources(localIncome.map(i => ({
                    id: i.id,
                    user_id: 'guest',
                    profession: i.source_name,
                    income_type: i.is_primary ? 'primary' : 'other',
                    amount: i.amount,
                    currency_code: i.currency_code,
                    frequency: i.frequency,
                    monthly_amount: i.amount,
                    description: '',
                    created_at: i.created_at,
                    updated_at: i.updated_at,
                })));
            } else {
                // Fetch data from Supabase for authenticated users
                const [debtsResult, totalsResult] = await Promise.all([
                    debtsService.listDebts(),
                    debtsService.getDebtTotalsByCurrency(),
                ]);

                if (debtsResult.success && debtsResult.debts) {
                    setDebts(debtsResult.debts);
                }

                if (totalsResult.success) {
                    setTotalsByCurrency(totalsResult.totalsByCurrency || {});
                    setTotalDebts(totalsResult.totalDebts || 0);
                    setAvgInterestRate(totalsResult.avgInterestRate || 0);
                }

                // Fetch income sources
                if (user) {
                    try {
                        const sources = await incomeService.getAll(user.id);
                        setIncomeSources(sources);
                        const total = sources.reduce((sum, s) => sum + s.monthly_amount, 0);
                        setTotalMonthlyIncome(total);
                    } catch (incomeError) {
                        logger.error('Income fetch error:', incomeError);
                    }
                }
            }
        } catch (error) {
            logger.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, isGuest]);

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

    // Get sorted currency codes for display
    const sortedCurrencyCodes = Object.keys(totalsByCurrency).sort();

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
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
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Guest Mode Banner - Dismissible */}
                {isGuest && showGuestBanner && (
                    <View style={styles.guestBanner}>
                        <TouchableOpacity
                            style={styles.guestBannerContent}
                            onPress={() => navigation.navigate('Settings')}
                        >
                            <Text style={styles.guestBannerText}>
                                Guest Mode • {guestDaysRemaining} days remaining
                            </Text>
                            <Text style={styles.guestBannerSubtext}>
                                Tap to create an account and save your data
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.guestBannerClose}
                            onPress={() => setShowGuestBanner(false)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={styles.guestBannerCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.userName}>
                            {isGuest ? 'Guest' : (user?.email?.split('@')[0] || 'User')}
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
                        {totalDebts > 0
                            ? `Fighting ${totalDebts} debt${totalDebts > 1 ? 's' : ''}!`
                            : 'Add your first debt to begin the journey!'}
                    </Text>
                </View>

                {/* Totals Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                    <TouchableOpacity
                        style={[styles.statCard, styles.statCardClickable]}
                        onPress={() => navigation.navigate('DebtLedger')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.statLabel}>Debts List</Text>
                        <View style={styles.statValueRow}>
                            <Text style={styles.statValue}>{totalDebts}</Text>
                            <Text style={styles.chevron}>›</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Interest</Text>
                        <Text style={styles.statValue}>{avgInterestRate.toFixed(1)}%</Text>
                    </View>
                </View>

                {/* Totals By Currency */}
                {sortedCurrencyCodes.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Total Debt by Currency</Text>
                        <View style={styles.currencyTotalsContainer}>
                            {sortedCurrencyCodes.map((code) => {
                                const currency = getCurrencyByCode(code);
                                const totals = totalsByCurrency[code];
                                return (
                                    <TouchableOpacity
                                        key={code}
                                        style={styles.currencyTotalCard}
                                        onPress={() => navigation.navigate('DebtLedger', { currencyCode: code })}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.currencyTotalHeader}>
                                            <Text style={styles.currencyFlag}>{currency.flag}</Text>
                                            <Text style={styles.currencyCode}>{code}</Text>
                                            <View style={styles.currencyEditBadge}>
                                                <Text style={styles.currencyEditText}>View All ›</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.currencyTotalBalance}>
                                            {formatCurrencyAmount(totals.totalBalance, code)}
                                        </Text>
                                        <Text style={styles.currencyTotalSubtext}>
                                            {totals.debtCount} debt{totals.debtCount > 1 ? 's' : ''} • Min: {formatCurrencyAmount(totals.totalMinPayment, code)}/mo
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Income Section */}
                <Text style={styles.sectionTitle}>Monthly Income</Text>
                <TouchableOpacity
                    style={styles.incomeTotalCard}
                    onPress={() => navigation.navigate('IncomeLedger')}
                    activeOpacity={0.7}
                >
                    <View style={styles.incomeTotalHeader}>
                        <Text style={styles.incomeTypeIcon}>💰</Text>
                        <Text style={styles.incomeTypeLabel}>Total Income</Text>
                        <View style={styles.incomeEditBadge}>
                            <Text style={styles.incomeEditBadgeText}>View All ›</Text>
                        </View>
                    </View>
                    <Text style={styles.incomeTotalAmount}>
                        ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.incomeTotalSubtext}>
                        {incomeSources.length} income source{incomeSources.length !== 1 ? 's' : ''} • Tap to view details
                    </Text>
                </TouchableOpacity>

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

                {/* Empty State / Call to Action */}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestBanner: {
        backgroundColor: colors.warning,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    guestBannerContent: {
        flex: 1,
    },
    guestBannerText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    guestBannerSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        marginTop: 2,
    },
    guestBannerClose: {
        padding: 4,
        marginLeft: 8,
    },
    guestBannerCloseText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 18,
        fontWeight: '500',
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
        color: colors.textTertiary,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    settingsButton: {
        width: 44,
        height: 44,
        backgroundColor: colors.card,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsIcon: {
        fontSize: 20,
    },
    characterCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    characterPlaceholder: {
        width: 100,
        height: 100,
        backgroundColor: colors.cardSecondary,
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
        color: colors.text,
        marginBottom: 4,
    },
    characterSubtitle: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        width: '48%',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    statCardClickable: {
        borderColor: colors.border,
    },
    statCardLarge: {
        width: '48%',
    },
    statLabel: {
        fontSize: 13,
        color: colors.textTertiary,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chevron: {
        fontSize: 20,
        color: colors.textTertiary,
        marginLeft: 8,
    },
    statValueLarge: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.success,
    },
    statValueRed: {
        color: colors.error,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    actionText: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
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
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    // Currency totals styles
    currencyTotalsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    currencyTotalCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.errorBackground,
    },
    currencyTotalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    currencyEditBadge: {
        marginLeft: 'auto',
    },
    currencyEditText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '500',
    },
    currencyFlag: {
        fontSize: 24,
    },
    currencyCode: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    currencyTotalBalance: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.error,
        marginBottom: 4,
    },
    currencyTotalSubtext: {
        fontSize: 13,
        color: colors.textTertiary,
    },

    // Income section styles - matching debt by currency design
    incomeTotalCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.successBackground,
    },
    incomeTotalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    incomeTypeIcon: {
        fontSize: 24,
    },
    incomeTypeLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    incomeEditBadge: {
        marginLeft: 'auto',
    },
    incomeEditBadgeText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '500',
    },
    incomeTotalAmount: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.success,
        marginBottom: 4,
    },
    incomeTotalSubtext: {
        fontSize: 13,
        color: colors.textTertiary,
    },
});

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { debtsService, Debt } from '../services/debts';
import { logger } from '../utils';
import { formatCurrencyAmount, getCurrencyByCode } from '../constants/currencies';

const DEBT_TYPE_ICONS: Record<string, string> = {
    credit_card: '💳',
    loan: '🏦',
    student_loan: '🎓',
    mortgage: '🏠',
    auto_loan: '🚗',
    medical: '🏥',
    other: '📋',
};

const DEBT_TYPE_LABELS: Record<string, string> = {
    credit_card: 'Credit Card',
    loan: 'Personal Loan',
    student_loan: 'Student Loan',
    mortgage: 'Mortgage',
    auto_loan: 'Auto Loan',
    medical: 'Medical',
    other: 'Other',
};

interface CurrencyTotal {
    totalBalance: number;
    totalMinPayment: number;
    debtCount: number;
}

export const DebtLedgerScreen: React.FC = () => {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalsByCurrency, setTotalsByCurrency] = useState<{ [currencyCode: string]: CurrencyTotal }>({});
    const [totalDebts, setTotalDebts] = useState(0);

    const fetchData = useCallback(async () => {
        try {
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
            }
        } catch (error) {
            logger.error('Debt ledger fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    // Ref to track open swipeable items
    const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

    const closeSwipeable = useCallback((debtId: string) => {
        const swipeable = swipeableRefs.current.get(debtId);
        swipeable?.close();
    }, []);

    const closeOtherSwipeables = useCallback((currentId: string) => {
        swipeableRefs.current.forEach((swipeable, id) => {
            if (id !== currentId) {
                swipeable?.close();
            }
        });
    }, []);

    // Handle delete debt with confirmation and optimistic update
    const handleDeleteDebt = useCallback((debt: Debt) => {
        Alert.alert(
            'Delete Debt',
            `Are you sure you want to delete "${debt.name}"? This action cannot be undone.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => closeSwipeable(debt.id),
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        closeSwipeable(debt.id);

                        const previousDebts = debts;
                        const previousTotals = totalsByCurrency;
                        const previousTotalDebts = totalDebts;
                        const shouldAdjustTotals = debt.status === 'active';

                        setDebts((prevDebts) => prevDebts.filter((d) => d.id !== debt.id));

                        if (shouldAdjustTotals) {
                            setTotalsByCurrency((prevTotals) => {
                                const currencyCode = debt.currency_code || 'USD';
                                const currencyTotals = prevTotals[currencyCode];
                                if (!currencyTotals) {
                                    return prevTotals;
                                }

                                const updatedTotals = { ...prevTotals };
                                const updatedCurrencyTotals = {
                                    totalBalance: Math.max(0, currencyTotals.totalBalance - (debt.current_balance || 0)),
                                    totalMinPayment: Math.max(0, currencyTotals.totalMinPayment - (debt.minimum_payment || 0)),
                                    debtCount: Math.max(0, currencyTotals.debtCount - 1),
                                };

                                if (updatedCurrencyTotals.debtCount <= 0) {
                                    delete updatedTotals[currencyCode];
                                } else {
                                    updatedTotals[currencyCode] = updatedCurrencyTotals;
                                }

                                return updatedTotals;
                            });

                            setTotalDebts((prevCount) => Math.max(0, prevCount - 1));
                        }

                        try {
                            const { success, error } = await debtsService.deleteDebt(debt.id);
                            if (!success) {
                                throw error || new Error('Failed to delete debt');
                            }

                            logger.info(`Debt deleted: ${debt.name}`);
                            await fetchData();
                        } catch (error) {
                            logger.error('Delete debt error:', error);
                            setDebts(previousDebts);
                            if (shouldAdjustTotals) {
                                setTotalsByCurrency(previousTotals);
                                setTotalDebts(previousTotalDebts);
                            }
                            Alert.alert('Error', 'Failed to delete debt. Please try again.');
                        }
                    },
                },
            ]
        );
    }, [closeSwipeable, debts, totalsByCurrency, totalDebts, fetchData]);

    // Render the delete action for swipe
    const renderRightActions = useCallback((
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        debt: Debt
    ) => {
        const translateX = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [0, 100],
            extrapolate: 'clamp',
        });

        const opacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        return (
            <Animated.View
                style={[
                    styles.deleteAction,
                    {
                        transform: [{ translateX }],
                        opacity,
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteDebt(debt)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [handleDeleteDebt]);

    // Get sorted currency codes for display
    const sortedCurrencyCodes = Object.keys(totalsByCurrency).sort();

    const formatDate = (dateString?: string): string => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
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
        <GestureHandlerRootView style={styles.container}>
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
                    {/* Summary Header - Totals by Currency */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Debts</Text>
                                <Text style={styles.summaryValue}>{totalDebts}</Text>
                            </View>
                            {sortedCurrencyCodes.map((code, index) => {
                                const totals = totalsByCurrency[code];
                                const currency = getCurrencyByCode(code);
                                return (
                                    <React.Fragment key={code}>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryItem}>
                                            <Text style={styles.summaryLabel}>{currency.flag} {code}</Text>
                                            <Text style={[styles.summaryValue, styles.summaryValueRed]}>
                                                {formatCurrencyAmount(totals.totalBalance, code)}
                                            </Text>
                                        </View>
                                    </React.Fragment>
                                );
                            })}
                        </View>
                    </View>

                    {/* Ledger Header */}
                    <View style={styles.ledgerHeader}>
                        <Text style={styles.ledgerHeaderText}>Debt</Text>
                        <Text style={styles.ledgerHeaderText}>APR</Text>
                        <Text style={[styles.ledgerHeaderText, styles.ledgerHeaderRight]}>Balance</Text>
                    </View>

                    {/* Ledger Entries */}
                    {debts.length > 0 ? (
                        <View style={styles.ledgerContainer}>
                            {debts.map((debt, index) => {
                                const debtCurrency = getCurrencyByCode(debt.currency_code || 'USD');
                                return (
                                    <Swipeable
                                        key={debt.id}
                                        ref={(ref) => {
                                            if (ref) {
                                                swipeableRefs.current.set(debt.id, ref);
                                            } else {
                                                swipeableRefs.current.delete(debt.id);
                                            }
                                        }}
                                        onSwipeableWillOpen={() => closeOtherSwipeables(debt.id)}
                                        renderRightActions={(progress, dragX) =>
                                            renderRightActions(progress, dragX, debt)
                                        }
                                        rightThreshold={40}
                                        overshootRight={false}
                                        friction={2}
                                    >
                                        <View
                                            style={[
                                                styles.ledgerRow,
                                                index === debts.length - 1 && styles.ledgerRowLast,
                                            ]}
                                        >
                                            <View style={styles.ledgerDebtInfo}>
                                                <View style={styles.ledgerIcon}>
                                                    <Text style={styles.ledgerIconText}>
                                                        {DEBT_TYPE_ICONS[debt.debt_type] || '📋'}
                                                    </Text>
                                                </View>
                                                <View style={styles.ledgerDebtDetails}>
                                                    <Text style={styles.ledgerDebtName} numberOfLines={1}>
                                                        {debt.name}
                                                    </Text>
                                                    <Text style={styles.ledgerDebtType}>
                                                        {debtCurrency.flag} {debt.creditor_name || DEBT_TYPE_LABELS[debt.debt_type] || 'Other'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.ledgerApr}>
                                                <Text style={styles.ledgerAprValue}>
                                                    {debt.interest_rate != null ? `${debt.interest_rate}%` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.ledgerBalance}>
                                                <Text style={styles.ledgerBalanceValue}>
                                                    {formatCurrencyAmount(debt.current_balance, debt.currency_code || 'USD')}
                                                </Text>
                                                {debt.minimum_payment != null && debt.minimum_payment > 0 && (
                                                    <Text style={styles.ledgerMinPayment}>
                                                        Min: {formatCurrencyAmount(debt.minimum_payment, debt.currency_code || 'USD')}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    </Swipeable>
                                );
                            })}

                            {/* Ledger Footer / Totals by Currency */}
                            {sortedCurrencyCodes.map((code) => {
                                const totals = totalsByCurrency[code];
                                const currency = getCurrencyByCode(code);
                                return (
                                    <View key={code} style={styles.ledgerFooter}>
                                        <Text style={styles.ledgerFooterLabel}>
                                            {currency.flag} Total {code}
                                        </Text>
                                        <Text style={styles.ledgerFooterValue}>
                                            {formatCurrencyAmount(totals.totalBalance, code)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyTitle}>No debts recorded</Text>
                            <Text style={styles.emptySubtitle}>
                                Add your first debt from the Dashboard to see it here
                            </Text>
                        </View>
                    )}

                    {/* Footer Info */}
                    {debts.length > 0 && (
                        <Text style={styles.footerNote}>
                            Swipe left on a debt to delete it
                        </Text>
                    )}
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
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
        padding: 16,
        paddingBottom: 40,
    },
    summaryCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#3A3A3C',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#8E8E93',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    summaryValueRed: {
        color: '#FF3B30',
    },
    ledgerHeader: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    ledgerHeaderText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        flex: 1,
    },
    ledgerHeaderRight: {
        textAlign: 'right',
    },
    ledgerContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    ledgerRowLast: {
        borderBottomWidth: 0,
    },
    ledgerDebtInfo: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ledgerIcon: {
        width: 36,
        height: 36,
        backgroundColor: '#2C2C2E',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    ledgerIconText: {
        fontSize: 16,
    },
    ledgerDebtDetails: {
        flex: 1,
    },
    ledgerDebtName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    ledgerDebtType: {
        fontSize: 12,
        color: '#8E8E93',
    },
    ledgerApr: {
        flex: 0.7,
        alignItems: 'center',
    },
    ledgerAprValue: {
        fontSize: 13,
        color: '#8E8E93',
    },
    ledgerBalance: {
        flex: 1,
        alignItems: 'flex-end',
    },
    ledgerBalanceValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FF3B30',
    },
    ledgerMinPayment: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 2,
    },
    ledgerFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#252528',
        borderTopWidth: 1,
        borderTopColor: '#3A3A3C',
    },
    ledgerFooterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    ledgerFooterValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FF3B30',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    footerNote: {
        fontSize: 12,
        color: '#636366',
        textAlign: 'center',
        marginTop: 16,
    },
    // Swipe to delete styles
    deleteAction: {
        height: '100%',
        width: 96,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

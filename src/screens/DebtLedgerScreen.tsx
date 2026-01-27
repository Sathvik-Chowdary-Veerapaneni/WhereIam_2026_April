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
import { useFocusEffect } from '@react-navigation/native';
import { debtsService, Debt } from '../services/debts';
import { logger } from '../utils';

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

export const DebtLedgerScreen: React.FC = () => {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totals, setTotals] = useState({
        totalBalance: 0,
        totalDebts: 0,
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
                    totalMinPayment: totalsResult.totalMinPayment || 0,
                });
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

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(amount);
    };

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
                {/* Summary Header */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Debts</Text>
                            <Text style={styles.summaryValue}>{totals.totalDebts}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Balance</Text>
                            <Text style={[styles.summaryValue, styles.summaryValueRed]}>
                                {formatCurrency(totals.totalBalance)}
                            </Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Monthly</Text>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(totals.totalMinPayment)}
                            </Text>
                        </View>
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
                        {debts.map((debt, index) => (
                            <TouchableOpacity
                                key={debt.id}
                                style={[
                                    styles.ledgerRow,
                                    index === debts.length - 1 && styles.ledgerRowLast,
                                ]}
                                activeOpacity={0.7}
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
                                            {debt.creditor_name || DEBT_TYPE_LABELS[debt.debt_type] || 'Other'}
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
                                        {formatCurrency(debt.current_balance)}
                                    </Text>
                                    {debt.minimum_payment != null && debt.minimum_payment > 0 && (
                                        <Text style={styles.ledgerMinPayment}>
                                            Min: {formatCurrency(debt.minimum_payment)}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Ledger Footer / Totals */}
                        <View style={styles.ledgerFooter}>
                            <Text style={styles.ledgerFooterLabel}>Total Outstanding</Text>
                            <Text style={styles.ledgerFooterValue}>
                                {formatCurrency(totals.totalBalance)}
                            </Text>
                        </View>
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
                        Tap on a debt to view details and payment history
                    </Text>
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
});

import React, { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
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
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { debtsService, Debt } from '../services/debts';
import { debtTransactionsService, DebtTransaction } from '../services/debtTransactions';
import { localStorageService } from '../services';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { logger } from '../utils';
import { formatCurrencyAmount, getCurrencyByCode } from '../constants/currencies';

type DebtLedgerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DebtLedger'>;
type DebtLedgerRouteProp = RouteProp<RootStackParamList, 'DebtLedger'>;

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
    const navigation = useNavigation<DebtLedgerNavigationProp>();
    const route = useRoute<DebtLedgerRouteProp>();
    const { isGuest } = useAuth();
    const { colors } = useTheme();
    const filterCurrency = route.params?.currencyCode;

    // Create dynamic styles based on theme
    const styles = createStyles(colors);

    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalsByCurrency, setTotalsByCurrency] = useState<{ [currencyCode: string]: CurrencyTotal }>({});
    const [totalDebts, setTotalDebts] = useState(0);

    // Transaction history state
    const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<{ [debtId: string]: DebtTransaction[] }>({});
    const [loadingTransactions, setLoadingTransactions] = useState<string | null>(null);

    // Add transaction modal state
    const [transactionModalVisible, setTransactionModalVisible] = useState(false);
    const [transactionDebt, setTransactionDebt] = useState<Debt | null>(null);
    const [transactionType, setTransactionType] = useState<'payment' | 'borrow'>('payment');
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionNotes, setTransactionNotes] = useState('');
    const [savingTransaction, setSavingTransaction] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            if (isGuest) {
                // Fetch from local storage for guest users
                const localDebts = await localStorageService.getLocalDebts();
                const formattedDebts: Debt[] = localDebts.map(d => ({
                    ...d,
                    user_id: 'guest',
                }));

                const filteredDebts = filterCurrency
                    ? formattedDebts.filter(d => (d.currency_code || 'USD') === filterCurrency)
                    : formattedDebts;
                setDebts(filteredDebts);

                // Calculate totals by currency
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
            } else {
                // Fetch from Supabase for authenticated users
                const [debtsResult, totalsResult] = await Promise.all([
                    debtsService.listDebts(),
                    debtsService.getDebtTotalsByCurrency(),
                ]);

                if (debtsResult.success && debtsResult.debts) {
                    const filteredDebts = filterCurrency
                        ? debtsResult.debts.filter(d => (d.currency_code || 'USD') === filterCurrency)
                        : debtsResult.debts;
                    setDebts(filteredDebts);
                }

                if (totalsResult.success) {
                    setTotalsByCurrency(totalsResult.totalsByCurrency || {});
                    setTotalDebts(totalsResult.totalDebts || 0);
                }
            }
        } catch (error) {
            logger.error('Debt ledger fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterCurrency, isGuest]);

    const fetchTransactions = useCallback(async (debtId: string) => {
        setLoadingTransactions(debtId);
        try {
            if (isGuest) {
                // Fetch from local storage for guest users
                const localTxns = await localStorageService.getLocalTransactionsForDebt(debtId);
                const formattedTxns: DebtTransaction[] = localTxns.map(t => ({
                    ...t,
                    user_id: 'guest',
                    type: t.type as 'payment' | 'borrow' | 'initial',
                }));
                setTransactions(prev => ({ ...prev, [debtId]: formattedTxns }));
            } else {
                // Fetch from Supabase for authenticated users
                const result = await debtTransactionsService.getTransactionsByDebt(debtId);
                if (result.success && result.transactions) {
                    setTransactions(prev => ({ ...prev, [debtId]: result.transactions! }));
                }
            }
        } catch (error) {
            logger.error('Fetch transactions error:', error);
        } finally {
            setLoadingTransactions(null);
        }
    }, [isGuest]);

    const handleToggleExpand = useCallback((debt: Debt) => {
        if (expandedDebtId === debt.id) {
            setExpandedDebtId(null);
        } else {
            setExpandedDebtId(debt.id);
            if (!transactions[debt.id]) {
                fetchTransactions(debt.id);
            }
        }
    }, [expandedDebtId, transactions, fetchTransactions]);

    const handleEditDebt = useCallback((debt: Debt) => {
        navigation.navigate('AddDebt', { debtId: debt.id });
    }, [navigation]);

    const openTransactionModal = useCallback((debt: Debt, type: 'payment' | 'borrow') => {
        setTransactionDebt(debt);
        setTransactionType(type);
        setTransactionAmount('');
        setTransactionNotes('');
        setTransactionModalVisible(true);
    }, []);

    const handleSaveTransaction = useCallback(async () => {
        if (!transactionDebt) return;

        const amount = parseFloat(transactionAmount);
        if (!transactionAmount || isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setSavingTransaction(true);
        try {
            if (isGuest) {
                // Save to local storage for guest users
                const currentBalance = transactionDebt.current_balance || 0;
                const newBalance = transactionType === 'payment'
                    ? currentBalance - amount
                    : currentBalance + amount;

                // Save transaction
                await localStorageService.saveLocalTransaction({
                    debt_id: transactionDebt.id,
                    type: transactionType,
                    amount,
                    interest_amount: 0,
                    new_balance: Math.max(0, newBalance),
                    notes: transactionNotes || undefined,
                });

                // Update debt balance
                await localStorageService.updateLocalDebt(transactionDebt.id, {
                    current_balance: Math.max(0, newBalance),
                });

                setTransactionModalVisible(false);
                await fetchData();
                await fetchTransactions(transactionDebt.id);
                logger.info('Local transaction saved');
            } else {
                // Save to Supabase for authenticated users
                const result = await debtTransactionsService.createTransaction({
                    debt_id: transactionDebt.id,
                    type: transactionType,
                    amount,
                    notes: transactionNotes || undefined,
                });

                if (result.success) {
                    setTransactionModalVisible(false);
                    await fetchData();
                    await fetchTransactions(transactionDebt.id);
                } else {
                    throw result.error || new Error('Failed to save transaction');
                }
            }
        } catch (error) {
            logger.error('Save transaction error:', error);
            Alert.alert('Error', 'Failed to save transaction. Please try again.');
        } finally {
            setSavingTransaction(false);
        }
    }, [transactionDebt, transactionType, transactionAmount, transactionNotes, fetchData, fetchTransactions, isGuest]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

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
                        // Trigger medium haptic feedback for delete confirmation
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                            if (isGuest) {
                                // Delete from local storage for guest users
                                const success = await localStorageService.deleteLocalDebt(debt.id);
                                if (!success) {
                                    throw new Error('Failed to delete debt');
                                }
                                logger.info(`Local debt deleted: ${debt.name}`);
                            } else {
                                // Delete from Supabase for authenticated users
                                const { success, error } = await debtsService.deleteDebt(debt.id);
                                if (!success) {
                                    throw error || new Error('Failed to delete debt');
                                }
                                logger.info(`Debt deleted: ${debt.name}`);
                            }
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
    }, [closeSwipeable, debts, totalsByCurrency, totalDebts, fetchData, isGuest]);

    // Render swipe actions: Edit (blue) + Delete (red)
    const renderRightActions = useCallback((
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        debt: Debt
    ) => {
        const translateX = dragX.interpolate({
            inputRange: [-180, 0],
            outputRange: [0, 180],
            extrapolate: 'clamp',
        });

        const opacity = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
        });

        return (
            <Animated.View
                style={[
                    styles.swipeActionsContainer,
                    {
                        transform: [{ translateX }],
                        opacity,
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.editAction}
                    onPress={() => {
                        closeSwipeable(debt.id);
                        handleEditDebt(debt);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={() => handleDeleteDebt(debt)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [closeSwipeable, handleEditDebt, handleDeleteDebt]);

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

    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
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
                    {/* Summary Header */}
                    <View style={styles.summaryCard}>
                        {filterCurrency ? (
                            <View style={styles.filteredSummary}>
                                <View style={styles.filteredHeader}>
                                    <Text style={styles.filteredCurrencyFlag}>
                                        {getCurrencyByCode(filterCurrency).flag}
                                    </Text>
                                    <Text style={styles.filteredCurrencyCode}>{filterCurrency} Debts</Text>
                                </View>
                                <Text style={styles.filteredTotal}>
                                    {totalsByCurrency[filterCurrency]
                                        ? formatCurrencyAmount(totalsByCurrency[filterCurrency].totalBalance, filterCurrency)
                                        : formatCurrencyAmount(0, filterCurrency)}
                                </Text>
                                <Text style={styles.filteredCount}>
                                    {debts.length} debt{debts.length !== 1 ? 's' : ''} • Tap to view history
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Total Debts</Text>
                                    <Text style={styles.summaryValue}>{totalDebts}</Text>
                                </View>
                                {sortedCurrencyCodes.map((code) => {
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
                        )}
                    </View>

                    {/* Ledger Header */}
                    <View style={styles.ledgerHeader}>
                        <Text style={[styles.ledgerHeaderText, styles.ledgerHeaderDebt]}>Debt</Text>
                        <Text style={[styles.ledgerHeaderText, styles.ledgerHeaderApr]}>APR</Text>
                        <Text style={[styles.ledgerHeaderText, styles.ledgerHeaderBalance]}>Balance</Text>
                    </View>

                    {/* Ledger Entries */}
                    {debts.length > 0 ? (
                        <View style={styles.ledgerContainer}>
                            {debts.map((debt, index) => {
                                const debtCurrency = getCurrencyByCode(debt.currency_code || 'USD');
                                const isExpanded = expandedDebtId === debt.id;
                                const debtTransactions = transactions[debt.id] || [];

                                return (
                                    <View key={debt.id}>
                                        <Swipeable
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
                                            <TouchableOpacity
                                                style={[
                                                    styles.ledgerRow,
                                                    isExpanded && styles.ledgerRowExpanded,
                                                ]}
                                                onPress={() => handleToggleExpand(debt)}
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
                                                    <Text style={styles.expandIndicator}>
                                                        {isExpanded ? '▲' : '▼'}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        </Swipeable>

                                        {/* Expanded Transaction History */}
                                        {isExpanded && (
                                            <View style={styles.transactionContainer}>
                                                {/* Action Buttons */}
                                                <View style={styles.transactionActions}>
                                                    <TouchableOpacity
                                                        style={styles.paymentButton}
                                                        onPress={() => openTransactionModal(debt, 'payment')}
                                                    >
                                                        <Text style={styles.paymentButtonText}>+ Pay Off</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.borrowButton}
                                                        onPress={() => openTransactionModal(debt, 'borrow')}
                                                    >
                                                        <Text style={styles.borrowButtonText}>+ Borrow</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {/* Transaction History */}
                                                <Text style={styles.transactionTitle}>Transaction History</Text>

                                                {loadingTransactions === debt.id ? (
                                                    <ActivityIndicator size="small" color="#007AFF" style={styles.transactionLoading} />
                                                ) : debtTransactions.length > 0 ? (
                                                    debtTransactions.map((txn) => (
                                                        <View key={txn.id} style={styles.transactionItem}>
                                                            <View style={styles.transactionLeft}>
                                                                <Text style={[
                                                                    styles.transactionType,
                                                                    txn.type === 'payment' ? styles.transactionPayment :
                                                                        txn.type === 'borrow' ? styles.transactionBorrow : styles.transactionInitial
                                                                ]}>
                                                                    {txn.type === 'payment' ? '−' : txn.type === 'borrow' ? '+' : '🏁'}
                                                                </Text>
                                                                <View>
                                                                    <Text style={styles.transactionDate}>
                                                                        {formatDate(txn.created_at)} • {formatTime(txn.created_at)}
                                                                    </Text>
                                                                    {txn.notes && (
                                                                        <Text style={styles.transactionNotes}>{txn.notes}</Text>
                                                                    )}
                                                                    {txn.type === 'borrow' && txn.interest_amount > 0 && (
                                                                        <Text style={styles.transactionInterest}>
                                                                            Interest: {formatCurrencyAmount(txn.interest_amount, debt.currency_code || 'USD')}
                                                                        </Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                            <View style={styles.transactionRight}>
                                                                <Text style={[
                                                                    styles.transactionAmount,
                                                                    txn.type === 'payment' ? styles.transactionPayment :
                                                                        txn.type === 'borrow' ? styles.transactionBorrow : styles.transactionInitial
                                                                ]}>
                                                                    {txn.type === 'payment' ? '−' : '+'}
                                                                    {formatCurrencyAmount(txn.amount, debt.currency_code || 'USD')}
                                                                </Text>
                                                                {txn.new_balance !== undefined && txn.new_balance !== null && (
                                                                    <Text style={styles.transactionRunningBalance}>
                                                                        Bal: {formatCurrencyAmount(txn.new_balance, debt.currency_code || 'USD')}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <Text style={styles.noTransactions}>No transactions yet</Text>
                                                )}
                                            </View>
                                        )}

                                        {/* Divider between debts */}
                                        {index < debts.length - 1 && <View style={styles.debtDivider} />}
                                    </View>
                                );
                            })}

                            {/* Ledger Footer */}
                            {filterCurrency ? (
                                totalsByCurrency[filterCurrency] && (
                                    <View style={styles.ledgerFooter}>
                                        <Text style={styles.ledgerFooterLabel}>
                                            {getCurrencyByCode(filterCurrency).flag} Total {filterCurrency}
                                        </Text>
                                        <Text style={styles.ledgerFooterValue}>
                                            {formatCurrencyAmount(totalsByCurrency[filterCurrency].totalBalance, filterCurrency)}
                                        </Text>
                                    </View>
                                )
                            ) : (
                                sortedCurrencyCodes.map((code) => {
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
                                })
                            )}
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
                            Tap to view history • Swipe left to edit/delete
                        </Text>
                    )}
                </ScrollView>

                {/* Add Transaction Modal */}
                <Modal
                    visible={transactionModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setTransactionModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <SafeAreaView style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => setTransactionModalVisible(false)}
                                    style={styles.modalCloseButton}
                                >
                                    <Text style={styles.modalCloseText}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {transactionType === 'payment' ? 'Add Payment' : 'Add Borrowed'}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleSaveTransaction}
                                    style={styles.modalSaveButton}
                                    disabled={savingTransaction}
                                >
                                    {savingTransaction ? (
                                        <ActivityIndicator size="small" color="#007AFF" />
                                    ) : (
                                        <Text style={styles.modalSaveText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScrollView}>
                                {transactionDebt && (
                                    <View style={styles.modalDebtInfo}>
                                        <Text style={styles.modalDebtName}>{transactionDebt.name}</Text>
                                        <Text style={styles.modalDebtBalance}>
                                            Current Balance: {formatCurrencyAmount(transactionDebt.current_balance, transactionDebt.currency_code || 'USD')}
                                        </Text>
                                        {transactionDebt.interest_rate && transactionDebt.interest_rate > 0 && transactionType === 'borrow' && (
                                            <Text style={styles.modalInterestNote}>
                                                APR: {transactionDebt.interest_rate}% (interest will be calculated)
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Transaction Type Toggle */}
                                <View style={styles.formSection}>
                                    <Text style={styles.formLabel}>Transaction Type</Text>
                                    <View style={styles.typeToggle}>
                                        <TouchableOpacity
                                            style={[
                                                styles.typeButton,
                                                transactionType === 'payment' && styles.typeButtonPayment
                                            ]}
                                            onPress={() => setTransactionType('payment')}
                                        >
                                            <Text style={[
                                                styles.typeButtonText,
                                                transactionType === 'payment' && styles.typeButtonTextActive
                                            ]}>
                                                💵 Pay Off
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.typeButton,
                                                transactionType === 'borrow' && styles.typeButtonBorrow
                                            ]}
                                            onPress={() => setTransactionType('borrow')}
                                        >
                                            <Text style={[
                                                styles.typeButtonText,
                                                transactionType === 'borrow' && styles.typeButtonTextActive
                                            ]}>
                                                💳 Borrow
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Amount Input */}
                                <View style={styles.formSection}>
                                    <Text style={styles.formLabel}>Amount</Text>
                                    <View style={styles.amountInputContainer}>
                                        <Text style={styles.currencySymbol}>
                                            {getCurrencyByCode(transactionDebt?.currency_code || 'USD').symbol}
                                        </Text>
                                        <TextInput
                                            style={styles.amountInput}
                                            placeholder="0.00"
                                            placeholderTextColor="#666"
                                            keyboardType="decimal-pad"
                                            value={transactionAmount}
                                            onChangeText={setTransactionAmount}
                                            autoFocus
                                        />
                                    </View>
                                </View>

                                {/* Notes Input */}
                                <View style={styles.formSection}>
                                    <Text style={styles.formLabel}>Notes (Optional)</Text>
                                    <TextInput
                                        style={styles.notesInput}
                                        placeholder="e.g., Monthly payment, Extra borrowed for..."
                                        placeholderTextColor="#666"
                                        value={transactionNotes}
                                        onChangeText={setTransactionNotes}
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>
                            </ScrollView>
                        </SafeAreaView>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    summaryCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.borderLight,
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
        backgroundColor: colors.handle,
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    summaryValueRed: {
        color: colors.error,
    },
    filteredSummary: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    filteredHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    filteredCurrencyFlag: {
        fontSize: 28,
    },
    filteredCurrencyCode: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    filteredTotal: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.error,
        marginBottom: 4,
    },
    filteredCount: {
        fontSize: 14,
        color: colors.textTertiary,
    },
    ledgerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 8,
    },
    ledgerHeaderText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ledgerHeaderDebt: {
        flex: 2.2,
    },
    ledgerHeaderApr: {
        flex: 0.6,
        textAlign: 'center',
    },
    ledgerHeaderBalance: {
        flex: 1.2,
        textAlign: 'right',
    },
    ledgerContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    ledgerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: colors.card,
    },
    ledgerRowExpanded: {
        backgroundColor: colors.cardSecondary,
    },
    ledgerDebtInfo: {
        flex: 2.2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ledgerIcon: {
        width: 32,
        height: 32,
        backgroundColor: colors.borderLight,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
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
        color: colors.text,
        marginBottom: 2,
    },
    ledgerDebtType: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    ledgerApr: {
        flex: 0.6,
        alignItems: 'center',
    },
    ledgerAprValue: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    ledgerBalance: {
        flex: 1.2,
        alignItems: 'flex-end',
    },
    ledgerBalanceValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.error,
    },
    expandIndicator: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    debtDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
    },
    ledgerFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.cardSecondary,
        borderTopWidth: 1,
        borderTopColor: colors.handle,
    },
    ledgerFooterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    ledgerFooterValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.error,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    footerNote: {
        fontSize: 12,
        color: colors.placeholder,
        textAlign: 'center',
        marginTop: 16,
    },
    // Swipe actions
    swipeActionsContainer: {
        flexDirection: 'row',
        height: '100%',
    },
    editAction: {
        width: 80,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteAction: {
        width: 80,
        backgroundColor: colors.error,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonText: {
        color: colors.textInverse,
        fontSize: 15,
        fontWeight: '600',
    },
    // Transaction history styles
    transactionContainer: {
        backgroundColor: colors.backgroundSecondary,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    transactionActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    paymentButton: {
        flex: 1,
        backgroundColor: colors.successBackground,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.success,
    },
    paymentButtonText: {
        color: colors.success,
        fontSize: 14,
        fontWeight: '600',
    },
    borrowButton: {
        flex: 1,
        backgroundColor: colors.errorBackground,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.error,
    },
    borrowButtonText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    transactionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textTertiary,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    transactionLoading: {
        paddingVertical: 20,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
    },
    transactionType: {
        fontSize: 18,
        fontWeight: '700',
        marginRight: 8,
        width: 25,
    },
    transactionDate: {
        fontSize: 13,
        color: colors.text,
    },
    transactionNotes: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 2,
    },
    transactionInterest: {
        fontSize: 11,
        color: colors.error,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    transactionRunningBalance: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 4,
        textAlign: 'right',
    },
    transactionPayment: {
        color: colors.success,
    },
    transactionBorrow: {
        color: colors.error,
    },
    transactionInitial: {
        color: colors.text, // White for initial balance
    },
    noTransactions: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        paddingVertical: 16,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalCloseButton: {
        minWidth: 60,
    },
    modalCloseText: {
        color: colors.textTertiary,
        fontSize: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    modalSaveButton: {
        minWidth: 60,
        alignItems: 'flex-end',
    },
    modalSaveText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalScrollView: {
        flex: 1,
        padding: 20,
    },
    modalDebtInfo: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    modalDebtName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    modalDebtBalance: {
        fontSize: 14,
        color: colors.error,
    },
    modalInterestNote: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 4,
    },
    formSection: {
        marginBottom: 24,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textTertiary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    typeToggle: {
        flexDirection: 'row',
        gap: 10,
    },
    typeButton: {
        flex: 1,
        backgroundColor: colors.card,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    typeButtonPayment: {
        backgroundColor: colors.successBackground,
        borderColor: colors.success,
    },
    typeButtonBorrow: {
        backgroundColor: colors.errorBackground,
        borderColor: colors.error,
    },
    typeButtonText: {
        fontSize: 14,
        color: colors.text,
    },
    typeButtonTextActive: {
        fontWeight: '600',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingHorizontal: 16,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.textTertiary,
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
        paddingVertical: 16,
    },
    notesInput: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        minHeight: 80,
        textAlignVertical: 'top',
    },
});

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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { incomeService, IncomeSource } from '../services/incomeService';
import { localStorageService } from '../services';
import { logger } from '../utils';

type IncomeLedgerNavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncomeLedger'>;

const INCOME_TYPE_ICONS: Record<string, string> = {
    primary: '💼',
    side_gig: '🌙',
    cash_earnings: '💵',
    other: '📊',
};

const INCOME_TYPE_LABELS: Record<string, string> = {
    primary: 'Primary Job',
    side_gig: 'Side Gig',
    cash_earnings: 'Cash Earnings',
    other: 'Other Income',
};

const PROFESSIONS: Record<string, string> = {
    rideshare: '🚗 Rideshare Driver',
    delivery: '📦 Delivery Driver',
    freelance: '💻 Freelancer',
    retail: '🛍️ Retail Worker',
    healthcare: '🏥 Healthcare',
    food_service: '🍽️ Food Service',
    construction: '🔨 Construction',
    other: '💼 Other',
};

const getProfessionLabel = (value: string): string => {
    return PROFESSIONS[value] || value;
};

export const IncomeLedgerScreen: React.FC = () => {
    const navigation = useNavigation<IncomeLedgerNavigationProp>();
    const { user, isGuest } = useAuth();
    const { colors } = useTheme();

    // Create dynamic styles based on theme
    const styles = createStyles(colors);

    const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            if (isGuest) {
                // Fetch from local storage for guest users
                const localIncome = await localStorageService.getLocalIncome();
                const formattedIncome: IncomeSource[] = localIncome.map(i => ({
                    id: i.id,
                    user_id: 'guest',
                    profession: i.source_name,
                    income_type: i.is_primary ? 'primary' : 'other',
                    amount: i.amount,
                    currency_code: i.currency_code,
                    frequency: i.frequency,
                    monthly_amount: i.amount, // Assuming amount is already monthly
                    description: '',
                    created_at: i.created_at,
                    updated_at: i.updated_at,
                }));
                setIncomeSources(formattedIncome);
                const total = formattedIncome.reduce((sum, s) => sum + s.monthly_amount, 0);
                setTotalMonthlyIncome(total);
            } else if (user) {
                // Fetch from Supabase for authenticated users
                const sources = await incomeService.getAll(user.id);
                setIncomeSources(sources);
                const total = sources.reduce((sum, s) => sum + s.monthly_amount, 0);
                setTotalMonthlyIncome(total);
            }
        } catch (error) {
            logger.error('Income ledger fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, isGuest]);

    const handleEditIncome = useCallback((source: IncomeSource) => {
        navigation.navigate('EditProfile');
    }, [navigation]);

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

    const closeSwipeable = useCallback((sourceId: string) => {
        const swipeable = swipeableRefs.current.get(sourceId);
        swipeable?.close();
    }, []);

    const closeOtherSwipeables = useCallback((currentId: string) => {
        swipeableRefs.current.forEach((swipeable, id) => {
            if (id !== currentId) {
                swipeable?.close();
            }
        });
    }, []);

    // Handle delete income with confirmation
    const handleDeleteIncome = useCallback((source: IncomeSource) => {
        if (incomeSources.length <= 1) {
            Alert.alert('Cannot Delete', 'You must have at least one income source.');
            closeSwipeable(source.id);
            return;
        }

        Alert.alert(
            'Delete Income',
            `Are you sure you want to delete this ${INCOME_TYPE_LABELS[source.income_type] || 'income'}? This action cannot be undone.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => closeSwipeable(source.id),
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        closeSwipeable(source.id);

                        const previousSources = incomeSources;
                        const previousTotal = totalMonthlyIncome;

                        setIncomeSources((prev) => prev.filter((s) => s.id !== source.id));
                        setTotalMonthlyIncome((prev) => Math.max(0, prev - source.monthly_amount));

                        try {
                            if (isGuest) {
                                // Delete from local storage for guest users
                                await localStorageService.deleteLocalIncome(source.id);
                                logger.info(`Local income deleted: ${source.profession}`);
                            } else {
                                // Delete from Supabase for authenticated users
                                await incomeService.delete(source.id);
                                logger.info(`Income deleted: ${source.profession}`);
                            }
                            await fetchData();
                        } catch (error) {
                            logger.error('Delete income error:', error);
                            setIncomeSources(previousSources);
                            setTotalMonthlyIncome(previousTotal);
                            Alert.alert('Error', 'Failed to delete income. Please try again.');
                        }
                    },
                },
            ]
        );
    }, [closeSwipeable, incomeSources, totalMonthlyIncome, fetchData, isGuest]);

    // Render the delete action for swipe
    const renderRightActions = useCallback((
        progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>,
        source: IncomeSource
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
                    onPress={() => handleDeleteIncome(source)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [handleDeleteIncome]);

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
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryIcon}>💰</Text>
                            <Text style={styles.summaryLabel}>Total Monthly Income</Text>
                            <Text style={styles.summaryTotal}>
                                ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text style={styles.summaryCount}>
                                {incomeSources.length} income source{incomeSources.length !== 1 ? 's' : ''} • Tap to edit
                            </Text>
                        </View>
                    </View>

                    {/* Ledger Header */}
                    <View style={styles.ledgerHeader}>
                        <Text style={styles.ledgerHeaderText}>Source</Text>
                        <Text style={styles.ledgerHeaderText}>Type</Text>
                        <Text style={[styles.ledgerHeaderText, styles.ledgerHeaderRight]}>Amount</Text>
                    </View>

                    {/* Ledger Entries */}
                    {incomeSources.length > 0 ? (
                        <View style={styles.ledgerContainer}>
                            {incomeSources.map((source, index) => (
                                <Swipeable
                                    key={source.id}
                                    ref={(ref) => {
                                        if (ref) {
                                            swipeableRefs.current.set(source.id, ref);
                                        } else {
                                            swipeableRefs.current.delete(source.id);
                                        }
                                    }}
                                    onSwipeableWillOpen={() => closeOtherSwipeables(source.id)}
                                    renderRightActions={(progress, dragX) =>
                                        renderRightActions(progress, dragX, source)
                                    }
                                    rightThreshold={40}
                                    overshootRight={false}
                                    friction={2}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.ledgerRow,
                                            index === incomeSources.length - 1 && styles.ledgerRowLast,
                                        ]}
                                        onPress={() => handleEditIncome(source)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.ledgerIncomeInfo}>
                                            <View style={styles.ledgerIcon}>
                                                <Text style={styles.ledgerIconText}>
                                                    {INCOME_TYPE_ICONS[source.income_type] || '📊'}
                                                </Text>
                                            </View>
                                            <View style={styles.ledgerIncomeDetails}>
                                                <Text style={styles.ledgerIncomeName} numberOfLines={1}>
                                                    {getProfessionLabel(source.profession)}
                                                </Text>
                                                {source.description && (
                                                    <Text style={styles.ledgerIncomeDescription} numberOfLines={1}>
                                                        {source.description}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.ledgerType}>
                                            <Text style={styles.ledgerTypeValue}>
                                                {INCOME_TYPE_LABELS[source.income_type] || 'Other'}
                                            </Text>
                                        </View>
                                        <View style={styles.ledgerAmount}>
                                            <Text style={styles.ledgerAmountValue}>
                                                ${source.monthly_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </Text>
                                            <Text style={styles.ledgerPerMonth}>/month</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Swipeable>
                            ))}

                            {/* Ledger Footer / Total */}
                            <View style={styles.ledgerFooter}>
                                <Text style={styles.ledgerFooterLabel}>💰 Total Monthly</Text>
                                <Text style={styles.ledgerFooterValue}>
                                    ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>💰</Text>
                            <Text style={styles.emptyTitle}>No income sources</Text>
                            <Text style={styles.emptySubtitle}>
                                Add your first income source to see it here
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => navigation.navigate('EditProfile')}
                            >
                                <Text style={styles.emptyButtonText}>+ Add Income</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Footer Info */}
                    {incomeSources.length > 0 && (
                        <Text style={styles.footerNote}>
                            Tap to edit • Swipe left to delete
                        </Text>
                    )}
                </ScrollView>
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
        borderColor: colors.success,
    },
    summaryContent: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    summaryIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: colors.textTertiary,
        marginBottom: 8,
    },
    summaryTotal: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.success,
        marginBottom: 4,
    },
    summaryCount: {
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
        flex: 1,
    },
    ledgerHeaderRight: {
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
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.card,
    },
    ledgerRowLast: {
        borderBottomWidth: 0,
    },
    ledgerIncomeInfo: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ledgerIcon: {
        width: 32,
        height: 32,
        backgroundColor: colors.successBackground,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    ledgerIconText: {
        fontSize: 16,
    },
    ledgerIncomeDetails: {
        flex: 1,
    },
    ledgerIncomeName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    ledgerIncomeDescription: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    ledgerType: {
        flex: 0.8,
        alignItems: 'center',
    },
    ledgerTypeValue: {
        fontSize: 11,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    ledgerAmount: {
        flex: 1,
        alignItems: 'flex-end',
    },
    ledgerAmountValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.success,
    },
    ledgerPerMonth: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
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
        color: colors.success,
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
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: colors.successBackground,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.success,
    },
    emptyButtonText: {
        color: colors.success,
        fontSize: 14,
        fontWeight: '600',
    },
    footerNote: {
        fontSize: 12,
        color: colors.placeholder,
        textAlign: 'center',
        marginTop: 16,
    },
    // Swipe to delete styles
    deleteAction: {
        height: '100%',
        width: 96,
        backgroundColor: colors.error,
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
        color: colors.textInverse,
        fontSize: 15,
        fontWeight: '600',
    },
});

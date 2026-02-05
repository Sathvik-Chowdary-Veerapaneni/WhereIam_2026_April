import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { debtsService, CreateDebtInput } from '../services/debts';
import { localStorageService } from '../services';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { logger } from '../utils';
import { CurrencySelector, CurrencyPickerButton } from '../components';
import { Currency, getCurrencyByCode } from '../constants/currencies';

type AddDebtNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddDebt'>;
type AddDebtRouteProp = RouteProp<RootStackParamList, 'AddDebt'>;

const DEBT_TYPES = [
    { id: 'credit_card', label: '💳 Credit Card' },
    { id: 'loan', label: '🏦 Personal Loan' },
    { id: 'student_loan', label: '🎓 Student Loan' },
    { id: 'mortgage', label: '🏠 Mortgage' },
    { id: 'auto_loan', label: '🚗 Auto Loan' },
    { id: 'medical', label: '🏥 Medical' },
    { id: 'other', label: '📋 Other' },
];

export const AddDebtScreen: React.FC = () => {
    const navigation = useNavigation<AddDebtNavigationProp>();
    const route = useRoute<AddDebtRouteProp>();
    const { isGuest } = useAuth();
    const { colors } = useTheme();
    const editDebtId = route.params?.debtId;
    const isEditMode = !!editDebtId;

    // Create dynamic styles based on theme
    const styles = createStyles(colors);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [showCurrencySelector, setShowCurrencySelector] = useState(false);
    const [showDebtTypeSelector, setShowDebtTypeSelector] = useState(false);
    const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('USD');

    // Form state - store raw numeric values as strings
    const [name, setName] = useState('');
    const [debtType, setDebtType] = useState<string | null>(null);
    const [creditorName, setCreditorName] = useState('');
    const [currentBalance, setCurrentBalance] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [minimumPayment, setMinimumPayment] = useState('');
    const [isMinPaymentManual, setIsMinPaymentManual] = useState(false);
    const [calculatedPayment, setCalculatedPayment] = useState<number | null>(null);

    const selectedCurrency = getCurrencyByCode(selectedCurrencyCode);

    // Calculate monthly payment based on balance and APR
    const calculateMinimumPayment = (balance: number, apr: number): number => {
        if (balance <= 0 || apr <= 0) return 0;
        // Monthly interest payment = Balance * (APR / 12 / 100)
        const monthlyPayment = balance * (apr / 100 / 12);
        return monthlyPayment;
    };

    // Auto-calculate when balance or interest rate changes
    useEffect(() => {
        const balance = parseFormattedValue(currentBalance);
        const apr = interestRate ? parseFloat(formatNumber(interestRate)) : 0;

        if (balance > 0 && apr > 0) {
            const calculated = calculateMinimumPayment(balance, apr);
            setCalculatedPayment(Math.round(calculated * 100) / 100);

            // Auto-fill if user hasn't manually edited
            if (!isMinPaymentManual && !isEditMode) {
                setMinimumPayment(formatWithThousandSeparator(calculated.toFixed(2)));
            }
        } else {
            setCalculatedPayment(null);
        }
    }, [currentBalance, interestRate, isMinPaymentManual, isEditMode]);

    // Load existing debt data when editing
    useEffect(() => {
        if (editDebtId) {
            loadDebtData();
        }
    }, [editDebtId]);

    const loadDebtData = async () => {
        try {
            setInitialLoading(true);

            if (isGuest) {
                // Load from local storage for guest users
                const debt = await localStorageService.getLocalDebt(editDebtId!);
                if (debt) {
                    setName(debt.name);
                    setDebtType(debt.debt_type);
                    setCreditorName(debt.creditor_name || '');
                    setSelectedCurrencyCode(debt.currency_code || 'USD');
                    setCurrentBalance(debt.current_balance?.toString() || '');
                    setInterestRate(debt.interest_rate?.toString() || '');
                    setMinimumPayment(debt.minimum_payment?.toString() || '');
                } else {
                    Alert.alert('Error', 'Failed to load debt data');
                    navigation.goBack();
                }
            } else {
                // Load from Supabase for authenticated users
                const { success, debt, error } = await debtsService.getDebt(editDebtId!);
                if (success && debt) {
                    setName(debt.name);
                    setDebtType(debt.debt_type);
                    setCreditorName(debt.creditor_name || '');
                    setSelectedCurrencyCode(debt.currency_code || 'USD');
                    setCurrentBalance(debt.current_balance?.toString() || '');
                    setInterestRate(debt.interest_rate?.toString() || '');
                    setMinimumPayment(debt.minimum_payment?.toString() || '');
                } else {
                    Alert.alert('Error', 'Failed to load debt data');
                    navigation.goBack();
                }
            }
        } catch (error) {
            logger.error('Load debt error:', error);
            Alert.alert('Error', 'Failed to load debt data');
            navigation.goBack();
        } finally {
            setInitialLoading(false);
        }
    };

    // Extract raw numeric value from formatted string
    const extractNumber = (value: string): string => {
        // Remove all non-numeric characters except decimal point
        return value.replace(/[^0-9.]/g, '').replace(/(\..*)\.*/g, '$1');
    };

    // Format number with thousand separators based on currency locale
    const formatWithThousandSeparator = (value: string): string => {
        if (!value) return '';

        const rawValue = extractNumber(value);
        if (!rawValue) return '';

        // Split into integer and decimal parts
        const parts = rawValue.split('.');
        const integerPart = parts[0];
        const decimalPart = parts.length > 1 ? parts[1] : null;

        if (!integerPart) return decimalPart !== null ? '.' + decimalPart : '';

        // Format the integer part with thousand separators
        const numericValue = parseInt(integerPart, 10);
        if (isNaN(numericValue)) return rawValue;

        // Use locale-aware formatting
        const locale = selectedCurrency.locale;
        let formatted: string;

        try {
            formatted = new Intl.NumberFormat(locale, {
                maximumFractionDigits: 0,
                useGrouping: true,
            }).format(numericValue);
        } catch {
            // Fallback to US formatting
            formatted = numericValue.toLocaleString('en-US');
        }

        // Re-add decimal part if it exists (preserve user's typing)
        if (decimalPart !== null) {
            // Get the decimal separator for this locale
            const decimalSeparator = locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || locale.startsWith('pt') ? ',' : '.';
            formatted += decimalSeparator + decimalPart;
        } else if (value.endsWith('.') || value.endsWith(',')) {
            // User just typed a decimal point
            const decimalSeparator = locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || locale.startsWith('pt') ? ',' : '.';
            formatted += decimalSeparator;
        }

        return formatted;
    };

    // Handle currency input change with formatting
    const handleCurrencyInput = (
        text: string,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        const formatted = formatWithThousandSeparator(text);
        setter(formatted);
    };

    // Parse formatted value back to number for submission
    const parseFormattedValue = (formatted: string): number => {
        if (!formatted) return 0;
        // Remove all thousand separators (commas, periods, spaces, apostrophes)
        // But keep the decimal separator
        const locale = selectedCurrency.locale;
        let cleaned = formatted;

        if (locale.startsWith('de') || locale.startsWith('fr') || locale.startsWith('es') || locale.startsWith('pt')) {
            // European format: periods are thousand sep, comma is decimal
            cleaned = formatted.replace(/\./g, '').replace(',', '.');
        } else if (locale === 'en-IN') {
            // Indian format: commas are thousand sep, period is decimal  
            cleaned = formatted.replace(/,/g, '');
        } else if (locale === 'de-CH') {
            // Swiss format: apostrophes are thousand sep
            cleaned = formatted.replace(/'/g, '');
        } else {
            // US/UK format: commas are thousand sep, period is decimal
            cleaned = formatted.replace(/,/g, '');
        }

        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const formatNumber = (value: string): string => {
        return value.replace(/[^0-9.]/g, '').replace(/(\..*)\.*/g, '$1');
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a debt name');
            return false;
        }
        if (!debtType) {
            Alert.alert('Error', 'Please select a debt type');
            return false;
        }
        const balance = parseFormattedValue(currentBalance);
        if (!currentBalance || balance <= 0) {
            Alert.alert('Error', 'Please enter a valid balance amount');
            return false;
        }
        return true;
    };

    const handleCurrencySelect = (currency: Currency) => {
        setSelectedCurrencyCode(currency.code);
        // Re-format existing values with new locale
        if (currentBalance) {
            setCurrentBalance(prev => formatWithThousandSeparator(extractNumber(prev)));
        }
        if (minimumPayment) {
            setMinimumPayment(prev => formatWithThousandSeparator(extractNumber(prev)));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const balance = parseFormattedValue(currentBalance);
            const rate = interestRate ? parseFloat(formatNumber(interestRate)) : undefined;
            const minPay = minimumPayment ? parseFormattedValue(minimumPayment) : undefined;

            if (isGuest) {
                // Use local storage for guest users
                if (isEditMode) {
                    const success = await localStorageService.updateLocalDebt(editDebtId!, {
                        name: name.trim(),
                        debt_type: debtType!,
                        creditor_name: creditorName.trim() || undefined,
                        currency_code: selectedCurrencyCode,
                        principal: balance,
                        current_balance: balance,
                        interest_rate: rate,
                        minimum_payment: minPay,
                    });
                    if (!success) {
                        throw new Error('Failed to update debt');
                    }
                    logger.info('Local debt updated successfully');
                } else {
                    await localStorageService.saveLocalDebt({
                        name: name.trim(),
                        debt_type: debtType!,
                        creditor_name: creditorName.trim() || undefined,
                        currency_code: selectedCurrencyCode,
                        principal: balance,
                        current_balance: balance,
                        interest_rate: rate,
                        minimum_payment: minPay,
                        status: 'active',
                        priority: 0,
                    });
                    logger.info('Local debt added successfully');
                    // Trigger light haptic feedback for successful add
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            } else {
                // Use Supabase for authenticated users
                const input: CreateDebtInput = {
                    name: name.trim(),
                    debt_type: debtType!,
                    creditor_name: creditorName.trim() || undefined,
                    currency_code: selectedCurrencyCode,
                    principal: balance,
                    current_balance: balance,
                    interest_rate: rate,
                    minimum_payment: minPay,
                };

                if (isEditMode) {
                    const { success, error } = await debtsService.updateDebt(editDebtId!, input);
                    if (!success) {
                        throw error || new Error('Failed to update debt');
                    }
                    logger.info('Debt updated successfully');
                } else {
                    const { success, error } = await debtsService.createDebt(input);
                    if (!success) {
                        throw error || new Error('Failed to create debt');
                    }
                    logger.info('Debt added successfully');
                    // Trigger light haptic feedback for successful add
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }

            navigation.goBack();
        } catch (error) {
            const message = (error as Error).message || `Failed to ${isEditMode ? 'update' : 'add'} debt`;
            logger.error(`${isEditMode ? 'Update' : 'Add'} debt error:`, error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Debt Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Debt Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Chase Visa Card"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                        />
                    </View>

                    {/* Debt Type */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Debt Type *</Text>
                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowDebtTypeSelector(true)}
                            disabled={loading}
                        >
                            <Text style={debtType ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
                                {debtType
                                    ? DEBT_TYPES.find(t => t.id === debtType)?.label
                                    : 'Select debt type...'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Creditor Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Creditor / Lender</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Chase Bank"
                            placeholderTextColor="#666"
                            value={creditorName}
                            onChangeText={setCreditorName}
                            editable={!loading}
                        />
                    </View>

                    {/* Current Balance */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Balance *</Text>
                        <View style={styles.currencyInput}>
                            <CurrencyPickerButton
                                currencyCode={selectedCurrencyCode}
                                onPress={() => setShowCurrencySelector(true)}
                            />
                            <TextInput
                                style={styles.currencyField}
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                keyboardType="decimal-pad"
                                value={currentBalance}
                                onChangeText={(text) => handleCurrencyInput(text, setCurrentBalance)}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {/* Interest Rate */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Interest Rate (APR)</Text>
                        <View style={styles.currencyInput}>
                            <TextInput
                                style={[styles.currencyField, { paddingLeft: 16 }]}
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                keyboardType="decimal-pad"
                                value={interestRate}
                                onChangeText={(text) => setInterestRate(formatNumber(text))}
                                editable={!loading}
                            />
                            <Text style={styles.percentSymbol}>%</Text>
                        </View>
                    </View>

                    {/* Minimum Payment */}
                    <View style={styles.inputGroup}>
                        <View style={styles.labelRow}>
                            <Text style={styles.labelInRow}>Minimum Monthly Payment</Text>
                            {calculatedPayment !== null && calculatedPayment > 0 && (
                                <Text style={styles.calculatedHint}>
                                    {isMinPaymentManual ? 'Custom' : 'Auto-calculated'}
                                </Text>
                            )}
                        </View>
                        <View style={styles.currencyInput}>
                            <CurrencyPickerButton
                                currencyCode={selectedCurrencyCode}
                                onPress={() => setShowCurrencySelector(true)}
                            />
                            <TextInput
                                style={styles.currencyField}
                                placeholder="0.00"
                                placeholderTextColor="#666"
                                keyboardType="decimal-pad"
                                value={minimumPayment}
                                onChangeText={(text) => {
                                    setIsMinPaymentManual(true);
                                    handleCurrencyInput(text, setMinimumPayment);
                                }}
                                editable={!loading}
                            />
                        </View>
                        {/* Show calculated suggestion if user has manual value */}
                        {isMinPaymentManual && calculatedPayment !== null && calculatedPayment > 0 && (
                            <TouchableOpacity
                                style={styles.useCalculatedButton}
                                onPress={() => {
                                    setMinimumPayment(formatWithThousandSeparator(calculatedPayment.toFixed(2)));
                                    setIsMinPaymentManual(false);
                                }}
                            >
                                <Text style={styles.useCalculatedText}>
                                    Use calculated: {selectedCurrency.symbol}{calculatedPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {/* EMI calculation info */}
                        {calculatedPayment !== null && calculatedPayment > 0 && !isMinPaymentManual && (
                            <Text style={styles.emiInfo}>
                                Monthly interest based on {interestRate}% APR
                            </Text>
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditMode ? 'Update Debt' : 'Add Debt'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Currency Selector Modal */}
            <CurrencySelector
                visible={showCurrencySelector}
                onClose={() => setShowCurrencySelector(false)}
                onSelect={handleCurrencySelect}
                selectedCurrencyCode={selectedCurrencyCode}
            />

            {/* Debt Type Selector Modal */}
            <Modal
                visible={showDebtTypeSelector}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowDebtTypeSelector(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setShowDebtTypeSelector(false)}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Debt Type</Text>
                        <View style={styles.modalCloseButton} />
                    </View>
                    <FlatList
                        data={DEBT_TYPES}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.debtTypeList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.debtTypeOption,
                                    debtType === item.id && styles.debtTypeOptionSelected,
                                ]}
                                onPress={() => {
                                    setDebtType(item.id);
                                    setShowDebtTypeSelector(false);
                                }}
                            >
                                <Text style={[
                                    styles.debtTypeOptionText,
                                    debtType === item.id && styles.debtTypeOptionTextSelected,
                                ]}>
                                    {item.label}
                                </Text>
                                {debtType === item.id && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
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
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    inputGroup: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    labelInRow: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 0,
    },
    calculatedHint: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '500',
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
    },
    // Dropdown button styles
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    dropdownButtonText: {
        fontSize: 16,
        color: colors.text,
    },
    dropdownPlaceholder: {
        fontSize: 16,
        color: colors.placeholder,
    },
    dropdownIcon: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalCloseButton: {
        width: 60,
    },
    modalCloseText: {
        fontSize: 16,
        color: colors.primary,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    debtTypeList: {
        padding: 16,
    },
    debtTypeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.card,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    debtTypeOptionSelected: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    debtTypeOptionText: {
        fontSize: 16,
        color: colors.text,
    },
    debtTypeOptionTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 18,
        color: colors.primary,
        fontWeight: '600',
    },
    currencyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    currencySymbolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: colors.borderLight,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
    },
    currencyDropdown: {
        fontSize: 10,
        color: colors.textTertiary,
        marginLeft: 4,
    },
    percentSymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textTertiary,
        paddingRight: 16,
    },
    currencyField: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        color: colors.text,
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    submitButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: colors.textInverse,
        fontSize: 17,
        fontWeight: '600',
    },
    useCalculatedButton: {
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.primary + '20',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    useCalculatedText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '500',
    },
    emiInfo: {
        marginTop: 8,
        fontSize: 12,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
});


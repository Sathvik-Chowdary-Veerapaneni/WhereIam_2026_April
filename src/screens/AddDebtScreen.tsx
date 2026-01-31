import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { debtsService, CreateDebtInput } from '../services/debts';
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
    const editDebtId = route.params?.debtId;
    const isEditMode = !!editDebtId;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [showCurrencySelector, setShowCurrencySelector] = useState(false);
    const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('USD');

    // Form state - store raw numeric values as strings
    const [name, setName] = useState('');
    const [debtType, setDebtType] = useState<string | null>(null);
    const [creditorName, setCreditorName] = useState('');
    const [currentBalance, setCurrentBalance] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [minimumPayment, setMinimumPayment] = useState('');

    const selectedCurrency = getCurrencyByCode(selectedCurrencyCode);

    // Load existing debt data when editing
    useEffect(() => {
        if (editDebtId) {
            loadDebtData();
        }
    }, [editDebtId]);

    const loadDebtData = async () => {
        try {
            setInitialLoading(true);
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
                // Update existing debt
                const { success, error } = await debtsService.updateDebt(editDebtId!, input);
                if (!success) {
                    throw error || new Error('Failed to update debt');
                }
                logger.info('Debt updated successfully');
            } else {
                // Create new debt
                const { success, error } = await debtsService.createDebt(input);
                if (!success) {
                    throw error || new Error('Failed to create debt');
                }
                logger.info('Debt added successfully');
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
                        <View style={styles.typeGrid}>
                            {DEBT_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeButton,
                                        debtType === type.id && styles.typeButtonSelected,
                                    ]}
                                    onPress={() => setDebtType(type.id)}
                                    disabled={loading}
                                >
                                    <Text
                                        style={[
                                            styles.typeButtonText,
                                            debtType === type.id && styles.typeButtonTextSelected,
                                        ]}
                                    >
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
                        <Text style={styles.label}>Minimum Monthly Payment</Text>
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
                                onChangeText={(text) => handleCurrencyInput(text, setMinimumPayment)}
                                editable={!loading}
                            />
                        </View>
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
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeButton: {
        backgroundColor: '#1C1C1E',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    typeButtonSelected: {
        backgroundColor: '#0A3D62',
        borderColor: '#007AFF',
    },
    typeButtonText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    typeButtonTextSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
    currencyInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    currencySymbolButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#2C2C2E',
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
    },
    currencyDropdown: {
        fontSize: 10,
        color: '#8E8E93',
        marginLeft: 4,
    },
    percentSymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
        paddingRight: 16,
    },
    currencyField: {
        flex: 1,
        fontSize: 18,
        fontWeight: '500',
        color: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});


import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { debtsService, CreateDebtInput } from '../services/debts';
import { logger } from '../utils';
import { CurrencySelector, CurrencyPickerButton } from '../components';
import { Currency, getCurrencyByCode } from '../constants/currencies';

type AddDebtNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddDebt'>;

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
    const [loading, setLoading] = useState(false);
    const [showCurrencySelector, setShowCurrencySelector] = useState(false);
    const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('USD');

    // Form state
    const [name, setName] = useState('');
    const [debtType, setDebtType] = useState<string | null>(null);
    const [creditorName, setCreditorName] = useState('');
    const [currentBalance, setCurrentBalance] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [minimumPayment, setMinimumPayment] = useState('');

    const selectedCurrency = getCurrencyByCode(selectedCurrencyCode);

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
        const balance = parseFloat(currentBalance);
        if (!currentBalance || isNaN(balance) || balance <= 0) {
            Alert.alert('Error', 'Please enter a valid balance amount');
            return false;
        }
        return true;
    };

    const handleCurrencySelect = (currency: Currency) => {
        setSelectedCurrencyCode(currency.code);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const balance = parseFloat(currentBalance);
            const rate = interestRate ? parseFloat(interestRate) : undefined;
            const minPay = minimumPayment ? parseFloat(minimumPayment) : undefined;

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

            const { success, error } = await debtsService.createDebt(input);

            if (!success) {
                throw error || new Error('Failed to create debt');
            }

            logger.info('Debt added successfully');
            navigation.goBack();
        } catch (error) {
            const message = (error as Error).message || 'Failed to add debt';
            logger.error('Add debt error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

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
                                onChangeText={(text) => setCurrentBalance(formatNumber(text))}
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
                                onChangeText={(text) => setMinimumPayment(formatNumber(text))}
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
                            <Text style={styles.submitButtonText}>Add Debt</Text>
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


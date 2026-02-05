import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { incomeService, IncomeSource, CreateIncomeInput } from '../services/incomeService';
import { localStorageService } from '../services';
import { logger } from '../utils';

const PROFESSIONS = [
    { id: 'rideshare', label: '🚗 Rideshare Driver', value: 'rideshare' },
    { id: 'delivery', label: '📦 Delivery Driver', value: 'delivery' },
    { id: 'freelance', label: '💻 Freelancer', value: 'freelance' },
    { id: 'retail', label: '🛍️ Retail Worker', value: 'retail' },
    { id: 'healthcare', label: '🏥 Healthcare', value: 'healthcare' },
    { id: 'food_service', label: '🍽️ Food Service', value: 'food_service' },
    { id: 'construction', label: '🔨 Construction', value: 'construction' },
    { id: 'other', label: '💼 Other', value: 'other' },
];

const INCOME_TYPES = [
    { id: 'primary', label: '💼 Primary Job', value: 'primary', color: '#007AFF' },
    { id: 'side_gig', label: '🌙 Side Gig', value: 'side_gig', color: '#5856D6' },
    { id: 'cash_earnings', label: '💵 Cash Earnings', value: 'cash_earnings', color: '#34C759' },
    { id: 'other', label: '📊 Other Income', value: 'other', color: '#FF9500' },
];

const getProfessionLabel = (value: string): string => {
    const profession = PROFESSIONS.find(p => p.value === value);
    return profession?.label || value;
};

const getIncomeTypeInfo = (type: string) => {
    return INCOME_TYPES.find(t => t.value === type) || INCOME_TYPES[3];
};

export const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, isGuest } = useAuth();
    const { colors } = useTheme();

    // Create dynamic styles based on theme
    const styles = createStyles(colors);

    const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);

    // Form state
    const [formProfession, setFormProfession] = useState<string>('');
    const [formAmount, setFormAmount] = useState<string>('');
    const [formType, setFormType] = useState<string>('primary');
    const [formDescription, setFormDescription] = useState<string>('');
    const [showProfessionPicker, setShowProfessionPicker] = useState(false);
    const [showIncomeTypePicker, setShowIncomeTypePicker] = useState(false);

    const loadIncomeSources = useCallback(async () => {
        try {
            setLoading(true);
            if (isGuest) {
                // Load from local storage for guest users
                const localIncome = await localStorageService.getLocalIncome();
                const formattedIncome: IncomeSource[] = localIncome.map(i => ({
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
                }));
                setIncomeSources(formattedIncome);
            } else if (user) {
                // Load from Supabase for authenticated users
                const sources = await incomeService.getAll(user.id);
                setIncomeSources(sources);
            }
        } catch (error) {
            logger.error('Error loading income sources:', error);
            Alert.alert('Error', 'Failed to load income sources');
        } finally {
            setLoading(false);
        }
    }, [user, isGuest]);

    useFocusEffect(
        useCallback(() => {
            loadIncomeSources();
        }, [loadIncomeSources])
    );

    const formatCurrency = (value: string): string => {
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
    };

    const openAddModal = () => {
        setEditingSource(null);
        setFormProfession('');
        setFormAmount('');
        setFormType('primary');
        setFormDescription('');
        setModalVisible(true);
    };

    const openEditModal = (source: IncomeSource) => {
        setEditingSource(source);
        setFormProfession(source.profession);
        setFormAmount(source.monthly_amount.toString());
        setFormType(source.income_type || 'primary');
        setFormDescription(source.description || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formProfession) {
            Alert.alert('Error', 'Please select a profession');
            return;
        }

        const amount = parseFloat(formAmount);
        if (!formAmount || isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Please enter a valid monthly amount');
            return;
        }

        if (!user && !isGuest) {
            Alert.alert('Error', 'User not found');
            return;
        }

        setSaving(true);
        try {
            if (isGuest) {
                // Save to local storage for guest users
                if (editingSource) {
                    // Update existing
                    await localStorageService.updateLocalIncome(editingSource.id, {
                        source_name: formProfession,
                        amount: amount,
                        is_primary: formType === 'primary',
                    });
                    logger.info('Local income source updated');
                } else {
                    // Create new
                    await localStorageService.saveLocalIncome({
                        source_name: formProfession,
                        amount: amount,
                        currency_code: 'USD',
                        frequency: 'monthly',
                        is_primary: formType === 'primary',
                    });
                    logger.info('Local income source created');
                }
            } else if (user) {
                // Save to Supabase for authenticated users
                if (editingSource) {
                    // Update existing
                    await incomeService.update(editingSource.id, {
                        profession: formProfession,
                        monthly_amount: amount,
                        income_type: formType as CreateIncomeInput['income_type'],
                        description: formDescription || undefined,
                    });
                    logger.info('Income source updated');
                } else {
                    // Create new
                    await incomeService.create(user.id, {
                        profession: formProfession,
                        monthly_amount: amount,
                        income_type: formType as CreateIncomeInput['income_type'],
                        description: formDescription || undefined,
                    });
                    logger.info('Income source created');
                }
            }

            setModalVisible(false);
            await loadIncomeSources();
        } catch (error) {
            logger.error('Error saving income source:', error);
            Alert.alert('Error', 'Failed to save income source');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (source: IncomeSource) => {
        // Don't allow deleting the last income source
        if (incomeSources.length <= 1) {
            Alert.alert('Cannot Delete', 'You must have at least one income source.');
            return;
        }

        Alert.alert(
            'Delete Income Source',
            `Are you sure you want to delete this ${getIncomeTypeInfo(source.income_type).label.split(' ')[1]} income?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (isGuest) {
                                // Delete from local storage for guest users
                                await localStorageService.deleteLocalIncome(source.id);
                                logger.info('Local income source deleted');
                            } else {
                                // Delete from Supabase for authenticated users
                                await incomeService.delete(source.id);
                                logger.info('Income source deleted');
                            }
                            await loadIncomeSources();
                        } catch (error) {
                            logger.error('Error deleting income source:', error);
                            Alert.alert('Error', 'Failed to delete income source');
                        }
                    },
                },
            ]
        );
    };

    const totalMonthlyIncome = incomeSources.reduce(
        (sum, source) => sum + source.monthly_amount,
        0
    );

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
            >
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Monthly Income</Text>
                    <Text style={styles.summaryAmount}>
                        ${totalMonthlyIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.summarySubtext}>
                        {incomeSources.length} income source{incomeSources.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                {/* Income Sources List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Income Sources</Text>

                    {incomeSources.map((source) => {
                        const typeInfo = getIncomeTypeInfo(source.income_type);
                        return (
                            <TouchableOpacity
                                key={source.id}
                                style={styles.incomeCard}
                                onPress={() => openEditModal(source)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.incomeCardHeader}>
                                    <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
                                        <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                                            {typeInfo.label}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDelete(source)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Text style={styles.deleteButtonText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.professionText}>
                                    {getProfessionLabel(source.profession)}
                                </Text>

                                <Text style={styles.amountText}>
                                    ${source.monthly_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    <Text style={styles.perMonthText}> / month</Text>
                                </Text>

                                {source.description && (
                                    <Text style={styles.descriptionText}>
                                        {source.description}
                                    </Text>
                                )}

                                <Text style={styles.editHint}>Tap to edit</Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Add Additional Income Button */}
                    <TouchableOpacity
                        style={styles.addIncomeButton}
                        onPress={openAddModal}
                    >
                        <Text style={styles.addIncomeButtonIcon}>+</Text>
                        <Text style={styles.addIncomeButtonText}>Add Additional Income</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {editingSource ? 'Edit Income' : 'Add Income'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleSave}
                                style={styles.modalSaveButton}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#007AFF" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScrollView}>
                            {/* Income Type Selection */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Income Type</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setShowIncomeTypePicker(true)}
                                >
                                    <View style={styles.dropdownContent}>
                                        <View style={[styles.colorDot, { backgroundColor: getIncomeTypeInfo(formType).color }]} />
                                        <Text style={styles.dropdownButtonText}>
                                            {getIncomeTypeInfo(formType).label}
                                        </Text>
                                    </View>
                                    <Text style={styles.dropdownIcon}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Profession Selection */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Profession</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setShowProfessionPicker(true)}
                                >
                                    <Text style={formProfession ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
                                        {formProfession
                                            ? getProfessionLabel(formProfession)
                                            : 'Select profession...'}
                                    </Text>
                                    <Text style={styles.dropdownIcon}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Monthly Amount */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Monthly Amount</Text>
                                <View style={styles.amountInputContainer}>
                                    <Text style={styles.currencySymbol}>$</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#666"
                                        keyboardType="decimal-pad"
                                        value={formAmount}
                                        onChangeText={(text) => setFormAmount(formatCurrency(text))}
                                    />
                                </View>
                            </View>

                            {/* Description (Optional) */}
                            <View style={styles.formSection}>
                                <Text style={styles.formLabel}>Description (Optional)</Text>
                                <TextInput
                                    style={styles.descriptionInput}
                                    placeholder="e.g., Uber driving on weekends"
                                    placeholderTextColor="#666"
                                    value={formDescription}
                                    onChangeText={setFormDescription}
                                    multiline
                                    numberOfLines={2}
                                />
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Profession Picker Modal */}
            <Modal
                visible={showProfessionPicker}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowProfessionPicker(false)}
            >
                <SafeAreaView style={styles.pickerModalContainer}>
                    <View style={styles.pickerModalHeader}>
                        <TouchableOpacity
                            onPress={() => setShowProfessionPicker(false)}
                            style={styles.pickerModalCloseButton}
                        >
                            <Text style={styles.pickerModalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.pickerModalTitle}>Select Profession</Text>
                        <View style={styles.pickerModalCloseButton} />
                    </View>
                    <FlatList
                        data={PROFESSIONS}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.pickerList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    formProfession === item.value && styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    setFormProfession(item.value);
                                    setShowProfessionPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    formProfession === item.value && styles.pickerOptionTextSelected,
                                ]}>
                                    {item.label}
                                </Text>
                                {formProfession === item.value && (
                                    <Text style={styles.pickerCheckmark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>

            {/* Income Type Picker Modal */}
            <Modal
                visible={showIncomeTypePicker}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowIncomeTypePicker(false)}
            >
                <SafeAreaView style={styles.pickerModalContainer}>
                    <View style={styles.pickerModalHeader}>
                        <TouchableOpacity
                            onPress={() => setShowIncomeTypePicker(false)}
                            style={styles.pickerModalCloseButton}
                        >
                            <Text style={styles.pickerModalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.pickerModalTitle}>Select Income Type</Text>
                        <View style={styles.pickerModalCloseButton} />
                    </View>
                    <FlatList
                        data={INCOME_TYPES}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.pickerList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    formType === item.value && styles.pickerOptionSelected,
                                    { borderLeftWidth: 4, borderLeftColor: item.color },
                                ]}
                                onPress={() => {
                                    setFormType(item.value);
                                    setShowIncomeTypePicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerOptionText,
                                    formType === item.value && styles.pickerOptionTextSelected,
                                ]}>
                                    {item.label}
                                </Text>
                                {formType === item.value && (
                                    <Text style={styles.pickerCheckmark}>✓</Text>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    summaryCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary + '30',
        marginBottom: 24,
    },
    summaryLabel: {
        fontSize: 14,
        color: colors.textTertiary,
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    summarySubtext: {
        fontSize: 14,
        color: colors.textTertiary,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    addIncomeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 8,
    },
    addIncomeButtonIcon: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginRight: 8,
    },
    addIncomeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    addButton: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    addButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    incomeCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    incomeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    deleteButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.errorBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: '600',
    },
    professionText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    amountText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.success,
    },
    perMonthText: {
        fontSize: 14,
        fontWeight: '400',
        color: colors.textTertiary,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.textTertiary,
        marginTop: 8,
        fontStyle: 'italic',
    },
    editHint: {
        fontSize: 12,
        color: colors.placeholder,
        marginTop: 12,
        textAlign: 'right',
    },
    // Modal Styles
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
    formSection: {
        marginBottom: 28,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textTertiary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    dropdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
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
    // Picker Modal styles
    pickerModalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    pickerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    pickerModalCloseButton: {
        width: 60,
    },
    pickerModalCloseText: {
        fontSize: 16,
        color: colors.primary,
    },
    pickerModalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
    },
    pickerList: {
        padding: 16,
    },
    pickerOption: {
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
    pickerOptionSelected: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    pickerOptionText: {
        fontSize: 16,
        color: colors.text,
    },
    pickerOptionTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    pickerCheckmark: {
        fontSize: 18,
        color: colors.primary,
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
    descriptionInput: {
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

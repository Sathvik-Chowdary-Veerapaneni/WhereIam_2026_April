import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Modal,
    FlatList,
} from 'react-native';
import { supabase, localStorageService } from '../services';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
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

export const OnboardingScreen: React.FC = () => {
    const { user, isGuest, guestDaysRemaining, checkOnboardingStatus } = useAuth();
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [profession, setProfession] = useState<string | null>(null);
    const [showProfessionSelector, setShowProfessionSelector] = useState(false);
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!profession) {
            Alert.alert('Error', 'Please select your profession');
            return;
        }

        const incomeValue = parseFloat(monthlyIncome);
        if (!monthlyIncome || isNaN(incomeValue) || incomeValue <= 0) {
            Alert.alert('Error', 'Please enter a valid monthly income');
            return;
        }

        // Check for authenticated user if not in guest mode
        if (!isGuest && !user) {
            Alert.alert('Error', 'User not found. Please sign in again.');
            return;
        }

        setLoading(true);
        try {
            if (isGuest) {
                // Save to local storage for guest users
                await localStorageService.saveLocalIncome({
                    source_name: profession,
                    amount: incomeValue,
                    currency_code: 'USD',
                    frequency: 'monthly',
                    is_primary: true,
                });
                logger.info('Guest onboarding completed');
            } else {
                // Save to Supabase for authenticated users
                const { error } = await supabase.from('income').insert({
                    user_id: user!.id,
                    profession: profession,
                    monthly_amount: incomeValue,
                    created_at: new Date().toISOString(),
                });

                if (error) {
                    throw error;
                }
                logger.info('Onboarding completed');
            }

            // Refresh onboarding status
            await checkOnboardingStatus();
        } catch (error) {
            const message = (error as Error).message || 'Failed to save profile';
            logger.error('Onboarding error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: string) => {
        // Remove non-numeric characters except decimal
        const cleaned = value.replace(/[^0-9.]/g, '');
        // Only allow one decimal point
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            return parts[0] + '.' + parts.slice(1).join('');
        }
        return cleaned;
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
                    {/* Guest Mode Banner */}
                    {isGuest && (
                        <View style={styles.guestBanner}>
                            <Text style={styles.guestBannerText}>
                                Guest Mode • {guestDaysRemaining} days remaining
                            </Text>
                            <Text style={styles.guestBannerSubtext}>
                                Create an account to save your data permanently
                            </Text>
                        </View>
                    )}

                    <View style={styles.header}>
                        <Text style={styles.title}>Let's get started</Text>
                        <Text style={styles.subtitle}>
                            Tell us about yourself to personalize your experience
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What's your profession?</Text>
                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowProfessionSelector(true)}
                            disabled={loading}
                        >
                            <Text style={profession ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
                                {profession
                                    ? PROFESSIONS.find(p => p.value === profession)?.label
                                    : 'Select your profession...'}
                            </Text>
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Monthly Income</Text>
                        <Text style={styles.sectionHint}>Your average monthly earnings</Text>
                        <View style={styles.incomeInputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={styles.incomeInput}
                                placeholder="0.00"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="decimal-pad"
                                value={monthlyIncome}
                                onChangeText={(text) => setMonthlyIncome(formatCurrency(text))}
                                editable={!loading}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Profession Selector Modal */}
            <Modal
                visible={showProfessionSelector}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowProfessionSelector(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            onPress={() => setShowProfessionSelector(false)}
                            style={styles.modalCloseButton}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Profession</Text>
                        <View style={styles.modalCloseButton} />
                    </View>
                    <FlatList
                        data={PROFESSIONS}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.professionList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.professionOption,
                                    profession === item.value && styles.professionOptionSelected,
                                ]}
                                onPress={() => {
                                    setProfession(item.value);
                                    setShowProfessionSelector(false);
                                }}
                            >
                                <Text style={[
                                    styles.professionOptionText,
                                    profession === item.value && styles.professionOptionTextSelected,
                                ]}>
                                    {item.label}
                                </Text>
                                {profession === item.value && (
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
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    guestBanner: {
        backgroundColor: colors.warning,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    guestBannerText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    guestBannerSubtext: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        marginTop: 4,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textTertiary,
        lineHeight: 22,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    sectionHint: {
        fontSize: 14,
        color: colors.textTertiary,
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
        marginTop: 8,
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
    professionList: {
        padding: 16,
    },
    professionOption: {
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
    professionOptionSelected: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    professionOptionText: {
        fontSize: 16,
        color: colors.text,
    },
    professionOptionTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },
    checkmark: {
        fontSize: 18,
        color: colors.primary,
        fontWeight: '600',
    },
    incomeInputContainer: {
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
    incomeInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
        paddingVertical: 16,
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
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});


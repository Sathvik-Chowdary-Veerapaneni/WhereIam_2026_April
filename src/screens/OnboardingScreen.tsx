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
} from 'react-native';
import { supabase } from '../services';
import { useAuth } from '../context';
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
    const { user, checkOnboardingStatus } = useAuth();
    const [profession, setProfession] = useState<string | null>(null);
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

        if (!user) {
            Alert.alert('Error', 'User not found. Please sign in again.');
            return;
        }

        setLoading(true);
        try {
            // Insert income record
            const { error } = await supabase.from('income').insert({
                user_id: user.id,
                profession: profession,
                monthly_amount: incomeValue,
                created_at: new Date().toISOString(),
            });

            if (error) {
                throw error;
            }

            logger.info('Onboarding completed');

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
                    <View style={styles.header}>
                        <Text style={styles.title}>Let's get started</Text>
                        <Text style={styles.subtitle}>
                            Tell us about yourself to personalize your experience
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>What's your profession?</Text>
                        <View style={styles.professionGrid}>
                            {PROFESSIONS.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.professionButton,
                                        profession === item.value && styles.professionSelected,
                                    ]}
                                    onPress={() => setProfession(item.value)}
                                    disabled={loading}
                                >
                                    <Text
                                        style={[
                                            styles.professionText,
                                            profession === item.value && styles.professionTextSelected,
                                        ]}
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Monthly Income</Text>
                        <Text style={styles.sectionHint}>Your average monthly earnings</Text>
                        <View style={styles.incomeInputContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={styles.incomeInput}
                                placeholder="0.00"
                                placeholderTextColor="#666"
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
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        lineHeight: 22,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    sectionHint: {
        fontSize: 14,
        color: '#8E8E93',
        marginBottom: 16,
    },
    professionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    professionButton: {
        backgroundColor: '#1C1C1E',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    professionSelected: {
        backgroundColor: '#0A3D62',
        borderColor: '#007AFF',
    },
    professionText: {
        fontSize: 15,
        color: '#FFFFFF',
    },
    professionTextSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
    incomeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
        paddingHorizontal: 16,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: '#8E8E93',
        marginRight: 8,
    },
    incomeInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        paddingVertical: 16,
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

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
} from 'react-native';
import { useAuth, useTheme } from '../context';
import type { ThemeMode, ThemeColors } from '../context';
import { authService } from '../services';
import { logger } from '../utils';

type SignupStep = 'form' | 'otp' | 'success';

export const SettingsScreen: React.FC = () => {
    const { user, signOut, isAdmin, isGuest, guestDaysRemaining } = useAuth();
    const { theme, setTheme, colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [showCreateAccount, setShowCreateAccount] = useState(false);

    // Signup form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [signupStep, setSignupStep] = useState<SignupStep>('form');
    const [signingUp, setSigningUp] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const styles = createStyles(colors);

    const handleSignOut = async () => {
        const title = isGuest ? 'End Guest Session' : 'Sign Out';
        const message = isGuest
            ? 'Are you sure you want to end your guest session? Your local data will be deleted.'
            : 'Are you sure you want to sign out?';

        Alert.alert(
            title,
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: isGuest ? 'End Session' : 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await signOut();
                            logger.info('User signed out from settings');
                        } catch (error) {
                            logger.error('Sign out error:', error);
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleThemeChange = async (newTheme: ThemeMode) => {
        try {
            await setTheme(newTheme);
        } catch (error) {
            logger.error('Failed to change theme:', error);
            Alert.alert('Error', 'Failed to change theme. Please try again.');
        }
    };

    const validateSignupForm = (): boolean => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }

        if (!password) {
            Alert.alert('Error', 'Please enter a password');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSignUp = async () => {
        if (!validateSignupForm()) return;

        setSigningUp(true);
        try {
            const { success, error } = await authService.signUp(email.trim(), password);

            if (!success) {
                throw error || new Error('Failed to create account');
            }

            // Account created, OTP sent to email
            setSignupStep('otp');
            logger.info('Account created, OTP sent to:', email);
        } catch (error) {
            const message = (error as Error).message || 'Failed to create account';
            logger.error('Signup error:', error);
            Alert.alert('Error', message);
        } finally {
            setSigningUp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp.trim() || otp.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code from your email');
            return;
        }

        setVerifying(true);
        try {
            const { success, error } = await authService.verifyEmailOtp(email.trim(), otp.trim());

            if (!success) {
                throw error || new Error('Invalid verification code');
            }

            setSignupStep('success');
            logger.info('Email verified successfully');

            // The auth state change will handle the rest (migration, etc.)
            Alert.alert(
                'Success!',
                'Your account has been verified. Your data is being synced.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            const message = (error as Error).message || 'Failed to verify code';
            logger.error('OTP verification error:', error);
            Alert.alert('Error', message);
        } finally {
            setVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        setSigningUp(true);
        try {
            const { success, error } = await authService.resendOtp(email.trim());

            if (!success) {
                throw error || new Error('Failed to resend code');
            }

            Alert.alert('Code Sent', 'A new verification code has been sent to your email');
            logger.info('OTP resent to:', email);
        } catch (error) {
            const message = (error as Error).message || 'Failed to resend code';
            logger.error('Resend OTP error:', error);
            Alert.alert('Error', message);
        } finally {
            setSigningUp(false);
        }
    };

    const resetSignupForm = () => {
        setShowCreateAccount(false);
        setSignupStep('form');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
    };

    const renderSignupForm = () => (
        <View style={styles.createAccountForm}>
            <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!signingUp}
            />
            <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!signingUp}
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!signingUp}
            />
            <TouchableOpacity
                style={[styles.primaryButton, signingUp && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={signingUp}
            >
                {signingUp ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetSignupForm}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderOtpForm = () => (
        <View style={styles.otpContainer}>
            <Text style={styles.otpIcon}>📧</Text>
            <Text style={styles.otpTitle}>Check Your Email</Text>
            <Text style={styles.otpSubtitle}>
                We sent a 6-digit verification code to
            </Text>
            <Text style={styles.otpEmail}>{email}</Text>

            <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                editable={!verifying}
            />

            <TouchableOpacity
                style={[styles.primaryButton, verifying && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={verifying}
            >
                {verifying ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={signingUp}
            >
                <Text style={styles.resendButtonText}>
                    {signingUp ? 'Sending...' : "Didn't receive code? Resend"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetSignupForm}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );

    const renderThemeOption = (mode: ThemeMode, label: string, icon: string) => {
        const isSelected = theme === mode;
        return (
            <TouchableOpacity
                style={[styles.themeOption, isSelected && styles.themeOptionSelected]}
                onPress={() => handleThemeChange(mode)}
            >
                <Text style={styles.themeOptionIcon}>{icon}</Text>
                <Text style={[styles.themeOptionLabel, isSelected && styles.themeOptionLabelSelected]}>
                    {label}
                </Text>
                {isSelected && (
                    <View style={styles.themeCheckmark}>
                        <Text style={styles.themeCheckmarkText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Guest Upgrade Section */}
                {isGuest && (
                    <View style={styles.section}>
                        <View style={styles.guestUpgradeCard}>
                            <View style={styles.guestUpgradeHeader}>
                                <Text style={styles.guestUpgradeIcon}>⏰</Text>
                                <View style={styles.guestUpgradeInfo}>
                                    <Text style={styles.guestUpgradeTitle}>Guest Mode</Text>
                                    <Text style={styles.guestUpgradeSubtitle}>
                                        {guestDaysRemaining} days remaining
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.guestUpgradeText}>
                                Create an account to keep your data forever and sync across devices.
                            </Text>

                            {!showCreateAccount ? (
                                <TouchableOpacity
                                    style={styles.createAccountButton}
                                    onPress={() => setShowCreateAccount(true)}
                                >
                                    <Text style={styles.createAccountButtonText}>
                                        Create Account
                                    </Text>
                                </TouchableOpacity>
                            ) : signupStep === 'form' ? (
                                renderSignupForm()
                            ) : signupStep === 'otp' ? (
                                renderOtpForm()
                            ) : null}
                        </View>
                    </View>
                )}

                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <View style={styles.profileRow}>
                            <View style={[styles.avatar, isGuest && styles.avatarGuest]}>
                                <Text style={styles.avatarText}>
                                    {isGuest ? '👤' : (user?.email?.charAt(0).toUpperCase() || '?')}
                                </Text>
                            </View>
                            <View style={styles.profileInfo}>
                                <View style={styles.emailRow}>
                                    <Text style={styles.profileEmail}>
                                        {isGuest ? 'Guest User' : user?.email}
                                    </Text>
                                    {isAdmin && (
                                        <View style={styles.adminBadge}>
                                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                                        </View>
                                    )}
                                    {isGuest && (
                                        <View style={styles.guestBadge}>
                                            <Text style={styles.guestBadgeText}>GUEST</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.profileId}>
                                    {isGuest
                                        ? `Expires in ${guestDaysRemaining} days`
                                        : `ID: ${user?.id?.slice(0, 8)}...`}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Appearance</Text>
                    <View style={styles.card}>
                        <View style={styles.themeSelector}>
                            {renderThemeOption('light', 'Light', '☀️')}
                            {renderThemeOption('dark', 'Dark', '🌙')}
                            {renderThemeOption('system', 'System', '⚙️')}
                        </View>
                    </View>
                </View>

                {/* App Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>App Version</Text>
                            <Text style={styles.infoValue}>1.0.0</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Build</Text>
                            <Text style={styles.infoValue}>MVP</Text>
                        </View>
                    </View>
                </View>

                {/* Sign Out Section */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.signOutButton, loading && styles.signOutButtonDisabled]}
                        onPress={handleSignOut}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.error} />
                        ) : (
                            <Text style={styles.signOutText}>
                                {isGuest ? 'End Guest Session' : 'Sign Out'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.avatarBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarGuest: {
        backgroundColor: colors.avatarGuestBackground,
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.textInverse,
    },
    profileInfo: {
        flex: 1,
    },
    profileEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    profileId: {
        fontSize: 13,
        color: colors.textTertiary,
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    adminBadge: {
        backgroundColor: colors.adminBadgeBackground,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    adminBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.adminBadgeText,
    },
    guestBadge: {
        backgroundColor: colors.guestBadgeBackground,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    guestBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.guestBadgeText,
    },
    // Theme selector styles
    themeSelector: {
        flexDirection: 'row',
        padding: 8,
        gap: 8,
    },
    themeOption: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.cardSecondary,
    },
    themeOptionSelected: {
        backgroundColor: colors.primary,
    },
    themeOptionIcon: {
        fontSize: 24,
        marginBottom: 6,
    },
    themeOptionLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.text,
    },
    themeOptionLabelSelected: {
        color: '#FFFFFF',
    },
    themeCheckmark: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    themeCheckmarkText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    infoLabel: {
        fontSize: 16,
        color: colors.text,
    },
    infoValue: {
        fontSize: 16,
        color: colors.textTertiary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginLeft: 16,
    },
    signOutButton: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.errorBackground,
    },
    signOutButtonDisabled: {
        opacity: 0.6,
    },
    signOutText: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.error,
    },
    // Guest upgrade styles
    guestUpgradeCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.warning,
    },
    guestUpgradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    guestUpgradeIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    guestUpgradeInfo: {
        flex: 1,
    },
    guestUpgradeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    guestUpgradeSubtitle: {
        fontSize: 14,
        color: colors.warning,
        fontWeight: '500',
    },
    guestUpgradeText: {
        fontSize: 14,
        color: colors.textTertiary,
        lineHeight: 20,
        marginBottom: 16,
    },
    createAccountButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    createAccountButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    createAccountForm: {
        gap: 12,
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: colors.text,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cancelButton: {
        padding: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        color: colors.textTertiary,
    },
    // OTP styles
    otpContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    otpIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    otpTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    otpSubtitle: {
        fontSize: 14,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    otpEmail: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 20,
    },
    otpInput: {
        backgroundColor: colors.inputBackground,
        borderRadius: 10,
        padding: 16,
        fontSize: 24,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: 8,
        width: '80%',
        marginBottom: 16,
    },
    resendButton: {
        padding: 12,
    },
    resendButtonText: {
        fontSize: 14,
        color: colors.primary,
    },
});

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { authService } from '../services';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { logger } from '../utils';

type AuthMode = 'signin' | 'signup';
type AuthStep = 'form' | 'otp';

const OTP_LENGTH = 6;

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('signup');
    const [authStep, setAuthStep] = useState<AuthStep>('form');
    const [otpCode, setOtpCode] = useState<string[]>(new Array(OTP_LENGTH).fill(''));

    const otpInputRefs = useRef<(TextInput | null)[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const { startGuestSession } = useAuth();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    // Animate OTP screen entry
    useEffect(() => {
        if (authStep === 'otp') {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(30);
        }
    }, [authStep]);

    const handleSignUp = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { success, error } = await authService.sendSignUpOtp(email.trim());

            if (!success) {
                throw error || new Error('Failed to send verification code');
            }

            setAuthStep('otp');
            logger.info('Sign-up OTP sent successfully');
        } catch (error) {
            const message = (error as Error).message || 'Failed to send verification code';
            logger.error('Sign-up OTP error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const { success, error } = await authService.signIn(email.trim(), password);

            if (!success) {
                throw error || new Error('Authentication failed');
            }

            logger.info('Sign in successful');
        } catch (error) {
            const message = (error as Error).message || 'Authentication failed';
            logger.error('Auth error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste - distribute digits across inputs
            const digits = value.replace(/[^0-9]/g, '').split('').slice(0, OTP_LENGTH);
            const newOtp = [...otpCode];
            digits.forEach((digit, i) => {
                if (index + i < OTP_LENGTH) {
                    newOtp[index + i] = digit;
                }
            });
            setOtpCode(newOtp);

            // Focus the next empty input or last one
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            otpInputRefs.current[nextIndex]?.focus();

            // Auto-verify if all digits filled
            if (newOtp.every(d => d !== '')) {
                verifyOtp(newOtp.join(''));
            }
            return;
        }

        const newOtp = [...otpCode];
        newOtp[index] = value.replace(/[^0-9]/g, '');
        setOtpCode(newOtp);

        // Auto-advance to next input
        if (value && index < OTP_LENGTH - 1) {
            otpInputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all digits entered
        if (value && newOtp.every(d => d !== '')) {
            verifyOtp(newOtp.join(''));
        }
    };

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otpCode[index] && index > 0) {
            const newOtp = [...otpCode];
            newOtp[index - 1] = '';
            setOtpCode(newOtp);
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    const verifyOtp = async (code: string) => {
        setLoading(true);
        try {
            const otpType = authMode === 'signup' ? 'signup' : 'email';
            const { success, error } = await authService.verifyEmailOtp(
                email.trim(),
                code,
                otpType
            );

            if (!success) {
                throw error || new Error('Invalid verification code');
            }

            logger.info('OTP verified successfully');
        } catch (error) {
            const message = (error as Error).message || 'Invalid verification code';
            logger.error('OTP verification error:', error);
            Alert.alert('Invalid Code', message);
            // Clear OTP inputs on error
            setOtpCode(new Array(OTP_LENGTH).fill(''));
            otpInputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const { success, error } = await authService.sendSignUpOtp(email.trim());

            if (!success) {
                throw error || new Error('Failed to resend code');
            }

            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
            logger.info('OTP resent successfully');
        } catch (error) {
            const message = (error as Error).message || 'Failed to resend code';
            logger.error('Resend OTP error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestMode = async () => {
        setLoading(true);
        try {
            await startGuestSession();
            logger.info('Guest session started');
        } catch (error) {
            logger.error('Failed to start guest session:', error);
            Alert.alert('Error', 'Failed to start guest mode. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetToForm = () => {
        setAuthStep('form');
        setOtpCode(new Array(OTP_LENGTH).fill(''));
        setEmail('');
        setPassword('');
    };

    // OTP Verification Screen
    if (authStep === 'otp') {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        <View style={styles.header}>
                            <View style={styles.otpIconContainer}>
                                <Text style={styles.otpIcon}>🔐</Text>
                            </View>
                            <Text style={styles.title}>Verify Your Email</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6-digit code sent to
                            </Text>
                            <Text style={styles.emailHighlight}>{email}</Text>
                        </View>

                        <View style={styles.otpContainer}>
                            {otpCode.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { otpInputRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpInput,
                                        digit ? styles.otpInputFilled : null,
                                    ]}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={({ nativeEvent }) =>
                                        handleOtpKeyPress(nativeEvent.key, index)
                                    }
                                    keyboardType="number-pad"
                                    maxLength={index === 0 ? OTP_LENGTH : 1}
                                    autoFocus={index === 0}
                                    editable={!loading}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        {loading && (
                            <View style={styles.verifyingContainer}>
                                <ActivityIndicator color={colors.primary} size="small" />
                                <Text style={styles.verifyingText}>Verifying...</Text>
                            </View>
                        )}

                        <View style={styles.otpActions}>
                            <TouchableOpacity
                                style={styles.resendButton}
                                onPress={handleResendOtp}
                                disabled={loading}
                            >
                                <Text style={styles.resendButtonText}>
                                    Didn't receive the code? Resend
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={resetToForm}
                                disabled={loading}
                            >
                                <Text style={styles.backButtonText}>
                                    ← Use a different email
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Main Auth Form
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>💰</Text>
                        <Text style={styles.title}>Debt Mirror</Text>
                        <Text style={styles.subtitle}>
                            {authMode === 'signup'
                                ? 'Create your account'
                                : 'Welcome back'}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        {/* Password Input - Only for sign-in mode */}
                        {authMode === 'signin' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.placeholder}
                                    secureTextEntry
                                    editable={!loading}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                        )}

                        {/* Main Action Button */}
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={authMode === 'signup' ? handleSignUp : handleSignIn}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {authMode === 'signup'
                                        ? 'Send Verification Code'
                                        : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Signup info text */}
                        {authMode === 'signup' && (
                            <Text style={styles.otpInfoText}>
                                We'll send a 6-digit code to verify your email
                            </Text>
                        )}

                        {/* Auth Mode Toggle */}
                        <View style={styles.authModeContainer}>
                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={() => {
                                    setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                                    setPassword('');
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.toggleText}>
                                    {authMode === 'signup'
                                        ? 'Already have an account? Sign In'
                                        : "Don't have an account? Sign Up"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.divider} />
                        </View>

                        {/* Guest Mode Button */}
                        <TouchableOpacity
                            style={styles.guestButton}
                            onPress={handleGuestMode}
                            disabled={loading}
                        >
                            <Text style={styles.guestButtonText}>Continue as Guest</Text>
                            <Text style={styles.guestSubtext}>
                                Try free for 2 months, no account needed
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textTertiary,
        textAlign: 'center',
    },
    emailHighlight: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    otpInfoText: {
        fontSize: 13,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: -8,
    },
    authModeContainer: {
        gap: 8,
    },
    toggleButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    toggleText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.borderLight,
    },
    dividerText: {
        color: colors.textTertiary,
        marginHorizontal: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    guestButton: {
        backgroundColor: colors.card,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    guestButtonText: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '600',
    },
    guestSubtext: {
        color: colors.textTertiary,
        fontSize: 13,
        marginTop: 4,
    },
    // OTP Screen Styles
    otpIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    otpIcon: {
        fontSize: 40,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.borderLight,
        backgroundColor: colors.card,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    otpInputFilled: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    verifyingContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    verifyingText: {
        fontSize: 15,
        color: colors.textTertiary,
    },
    otpActions: {
        alignItems: 'center',
        gap: 16,
    },
    resendButton: {
        paddingVertical: 12,
    },
    resendButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '500',
    },
    backButton: {
        paddingVertical: 12,
    },
    backButtonText: {
        color: colors.textTertiary,
        fontSize: 15,
    },
});

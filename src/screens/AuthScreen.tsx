import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { authService } from '../services';
import { useAuth } from '../context';
import { logger } from '../utils';

// Required for expo-auth-session to work properly
WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'signin' | 'signup' | 'magiclink';

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('magiclink');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const { startGuestSession } = useAuth();

    // Create redirect URI for OAuth
    const redirectUri = AuthSession.makeRedirectUri({});

    // Log the redirect URI for debugging (development only)
    useEffect(() => {
        logger.info('OAuth Redirect URI:', redirectUri);
    }, []);

    const handleEmailPasswordAuth = async () => {
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
            const { success, error } = authMode === 'signup'
                ? await authService.signUp(email.trim(), password)
                : await authService.signIn(email.trim(), password);

            if (!success) {
                throw error || new Error('Authentication failed');
            }

            logger.info(`${authMode === 'signup' ? 'Sign up' : 'Sign in'} successful`);

            if (authMode === 'signup') {
                Alert.alert(
                    'Success',
                    'Account created! Please check your email to verify your account.'
                );
            }
        } catch (error) {
            const message = (error as Error).message || 'Authentication failed';
            logger.error('Auth error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { success, error } = await authService.sendMagicLink(email.trim());

            if (!success) {
                throw error || new Error('Failed to send verification link');
            }

            setMagicLinkSent(true);
            logger.info('Magic link sent successfully');
        } catch (error) {
            const message = (error as Error).message || 'Failed to send verification link';
            logger.error('Magic link error:', error);
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

    const resetMagicLinkState = () => {
        setMagicLinkSent(false);
        setEmail('');
    };

    // Magic link sent confirmation view
    if (magicLinkSent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.successIcon}>📧</Text>
                        <Text style={styles.title}>Check Your Email</Text>
                        <Text style={styles.subtitle}>
                            We sent a verification link to
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>
                    </View>

                    <View style={styles.instructionsContainer}>
                        <Text style={styles.instructionsText}>
                            Click the link in the email to sign in. The link will expire in 1 hour.
                        </Text>
                        <Text style={styles.instructionsSubtext}>
                            Don't see the email? Check your spam folder.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleMagicLink}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Resend Link</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={resetMagicLinkState}
                            disabled={loading}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Use Different Email
                            </Text>
                        </TouchableOpacity>
                    </View>
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
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>💰</Text>
                        <Text style={styles.title}>Debt Mirror</Text>
                        <Text style={styles.subtitle}>
                            {authMode === 'magiclink'
                                ? 'Sign in with email link'
                                : authMode === 'signup'
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
                                placeholderTextColor="#999"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        {/* Password Input - Only show for signin/signup modes */}
                        {authMode !== 'magiclink' && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
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
                            onPress={authMode === 'magiclink' ? handleMagicLink : handleEmailPasswordAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {authMode === 'magiclink'
                                        ? 'Send Verification Link'
                                        : authMode === 'signup'
                                            ? 'Sign Up'
                                            : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Auth Mode Toggles */}
                        <View style={styles.authModeContainer}>
                            {authMode === 'magiclink' ? (
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={() => {
                                        setAuthMode('signin');
                                        setPassword('');
                                    }}
                                    disabled={loading}
                                >
                                    <Text style={styles.toggleText}>
                                        Use password instead
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.toggleButton}
                                        onPress={() => {
                                            setAuthMode('magiclink');
                                            setPassword('');
                                        }}
                                        disabled={loading}
                                    >
                                        <Text style={styles.toggleText}>
                                            Use email link instead
                                        </Text>
                                    </TouchableOpacity>
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
                                </>
                            )}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
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
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
    },
    successIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emailText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginTop: 8,
    },
    instructionsContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    },
    instructionsText: {
        fontSize: 15,
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: 22,
    },
    instructionsSubtext: {
        fontSize: 13,
        color: '#8E8E93',
        textAlign: 'center',
        marginTop: 12,
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
        color: '#FFFFFF',
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
    button: {
        backgroundColor: '#007AFF',
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
    secondaryButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    secondaryButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    authModeContainer: {
        gap: 8,
    },
    toggleButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    toggleText: {
        color: '#007AFF',
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
        backgroundColor: '#2C2C2E',
    },
    dividerText: {
        color: '#8E8E93',
        marginHorizontal: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    guestButton: {
        backgroundColor: '#1C1C1E',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3A3A3C',
    },
    guestButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    guestSubtext: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 4,
    },
});

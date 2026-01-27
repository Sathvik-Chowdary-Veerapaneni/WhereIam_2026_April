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
import { authService, supabase } from '../services';
import { logger } from '../utils';
import { Config } from '../constants/config';

// Required for expo-auth-session to work properly
WebBrowser.maybeCompleteAuthSession();

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    // Create redirect URI for OAuth
    // For Expo Go, we need to use the exp:// scheme
    const redirectUri = AuthSession.makeRedirectUri({
        // Use the Expo scheme for development
        // This generates: exp://192.168.x.x:8081/--/auth/callback
    });

    // Log the redirect URI for debugging (development only)
    useEffect(() => {
        logger.info('OAuth Redirect URI:', redirectUri);
    }, []);

    const handleAuth = async () => {
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
            const { success, error } = isSignUp
                ? await authService.signUp(email.trim(), password)
                : await authService.signIn(email.trim(), password);

            if (!success) {
                throw error || new Error('Authentication failed');
            }

            logger.info(`${isSignUp ? 'Sign up' : 'Sign in'} successful`);

            if (isSignUp) {
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

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setEmail('');
        setPassword('');
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            // Get the OAuth URL from Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true, // We handle the browser ourselves
                },
            });

            if (error) throw error;
            if (!data.url) throw new Error('No OAuth URL returned');

            logger.info('Opening Google OAuth URL:', data.url);
            logger.info('Redirect URI:', redirectUri);

            // Open the browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUri
            );

            if (result.type === 'success' && result.url) {
                // Extract the tokens from the URL
                const url = new URL(result.url);
                const params = new URLSearchParams(url.hash.slice(1)); // Remove the # prefix

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken) {
                    // Set the session in Supabase
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });

                    if (sessionError) throw sessionError;
                    logger.info('Google sign-in successful!');
                } else {
                    throw new Error('No access token in callback URL');
                }
            } else if (result.type === 'cancel') {
                logger.info('User cancelled Google sign-in');
            }
        } catch (error) {
            logger.error('Google auth error:', error);
            Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
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
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.logo}>💰</Text>
                        <Text style={styles.title}>Debt Mirror</Text>
                        <Text style={styles.subtitle}>
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </Text>
                    </View>

                    <View style={styles.form}>
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

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isSignUp ? 'Sign Up' : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Social Auth */}
                        <View style={styles.socialContainer}>
                            <View style={styles.dividerContainer}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.divider} />
                            </View>

                            <TouchableOpacity
                                style={[styles.socialButton, styles.googleButton]}
                                onPress={handleGoogleAuth}
                                disabled={loading}
                            >
                                <Text style={styles.socialButtonText}>Continue with Google</Text>
                            </TouchableOpacity>

                            {/* Apple Sign In - Hidden for now
                            <TouchableOpacity
                                style={[styles.socialButton, styles.appleButton]}
                                onPress={() => handleSocialAuth('apple')}
                                disabled={loading}
                            >
                                <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
                            </TouchableOpacity>
                            */}
                        </View>

                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={toggleMode}
                            disabled={loading}
                        >
                            <Text style={styles.toggleText}>
                                {isSignUp
                                    ? 'Already have an account? Sign In'
                                    : "Don't have an account? Sign Up"}
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
    toggleButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    toggleText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '500',
    },
    socialContainer: {
        marginTop: 16,
        gap: 12,
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
    socialButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
    },
    appleButton: {
        backgroundColor: '#000000',
        borderColor: '#3A3A3C',
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000', // Default for Google
    },
    appleButtonText: {
        color: '#FFFFFF',
    },
});

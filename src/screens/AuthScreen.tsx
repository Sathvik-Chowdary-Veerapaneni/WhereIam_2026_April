import React, { useState } from 'react';
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
import { authService } from '../services';
import { logger } from '../utils';

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

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
});

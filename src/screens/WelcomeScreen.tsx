import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { useAuth, useTheme } from '../context';
import type { ThemeColors } from '../context';
import { authService, localStorageService } from '../services';
import { logger } from '../utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WelcomeScreen: React.FC = () => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const { user, isGuest, setDisplayName: updateContextName } = useAuth();
    const { colors } = useTheme();
    const styles = createStyles(colors);

    // Animations
    const waveAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(-40)).current;
    const inputSlide = useRef(new Animated.Value(60)).current;
    const buttonFade = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Staggered entrance animations
        Animated.sequence([
            // Wave emoji bounces in
            Animated.spring(waveAnim, {
                toValue: 1,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
            }),
            // Title slides in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(titleSlide, {
                    toValue: 0,
                    tension: 40,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            // Input area slides up
            Animated.spring(inputSlide, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
            // Button fades in
            Animated.timing(buttonFade, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous subtle pulse on the wave emoji
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handleContinue = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            Alert.alert('Hey there!', 'Please enter your name to continue.');
            return;
        }

        if (trimmedName.length < 2) {
            Alert.alert('Too short', 'Your name should be at least 2 characters.');
            return;
        }

        setLoading(true);
        try {
            if (isGuest) {
                // Save name locally for guest users
                await localStorageService.saveGuestDisplayName(trimmedName);
                logger.info('Guest display name saved:', trimmedName);
            } else if (user) {
                // Save to both auth metadata and profiles table
                const [authResult, profileResult] = await Promise.all([
                    authService.updateDisplayName(trimmedName),
                    authService.saveProfileName(user.id, trimmedName),
                ]);

                if (!authResult.success) {
                    throw authResult.error || new Error('Failed to save name');
                }

                if (!profileResult.success) {
                    logger.error('Profile name save failed (non-critical):', profileResult.error);
                }

                logger.info('Display name saved:', trimmedName);
            }

            // Update context to trigger navigation
            updateContextName(trimmedName);
        } catch (error) {
            const message = (error as Error).message || 'Failed to save your name';
            logger.error('Save name error:', error);
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    const waveScale = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                {/* Animated Wave Emoji */}
                <Animated.View
                    style={[
                        styles.emojiContainer,
                        {
                            transform: [
                                { scale: Animated.multiply(waveScale, pulseAnim) },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.waveEmoji}>👋</Text>
                </Animated.View>

                {/* Title */}
                <Animated.View
                    style={[
                        styles.titleContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: titleSlide }],
                        },
                    ]}
                >
                    <Text style={styles.welcomeTitle}>Welcome!</Text>
                    <Text style={styles.welcomeSubtitle}>
                        What should we call you?
                    </Text>
                </Animated.View>

                {/* Name Input */}
                <Animated.View
                    style={[
                        styles.inputSection,
                        {
                            transform: [{ translateY: inputSlide }],
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.nameInputWrapper,
                            isFocused && styles.nameInputWrapperFocused,
                        ]}
                    >
                        <TextInput
                            style={styles.nameInput}
                            placeholder="Your name"
                            placeholderTextColor={colors.placeholder}
                            value={name}
                            onChangeText={setName}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleContinue}
                            editable={!loading}
                            maxLength={50}
                        />
                    </View>

                    {/* Live greeting preview */}
                    {name.trim().length > 0 && (
                        <Animated.Text
                            style={[
                                styles.greetingPreview,
                                { opacity: fadeAnim },
                            ]}
                        >
                            Nice to meet you, {name.trim()}!
                        </Animated.Text>
                    )}
                </Animated.View>

                {/* Continue Button */}
                <Animated.View style={{ opacity: buttonFade }}>
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            loading && styles.continueButtonDisabled,
                            !name.trim() && styles.continueButtonInactive,
                        ]}
                        onPress={handleContinue}
                        disabled={loading || !name.trim()}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.continueButtonText}>
                                Continue
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Footer hint */}
                <Animated.Text
                    style={[styles.footerHint, { opacity: buttonFade }]}
                >
                    You can change this later in settings
                </Animated.Text>
            </View>
        </KeyboardAvoidingView>
    );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emojiContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
    },
    waveEmoji: {
        fontSize: 52,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    welcomeTitle: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    welcomeSubtitle: {
        fontSize: 18,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 24,
    },
    inputSection: {
        width: '100%',
        marginBottom: 32,
        alignItems: 'center',
    },
    nameInputWrapper: {
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.borderLight,
        paddingHorizontal: 20,
        paddingVertical: Platform.OS === 'ios' ? 18 : 6,
    },
    nameInputWrapperFocused: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '08',
    },
    nameInput: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    greetingPreview: {
        marginTop: 16,
        fontSize: 16,
        color: colors.primary,
        fontWeight: '500',
    },
    continueButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        paddingHorizontal: 64,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: SCREEN_WIDTH - 64,
    },
    continueButtonDisabled: {
        opacity: 0.6,
    },
    continueButtonInactive: {
        backgroundColor: colors.borderLight,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    footerHint: {
        marginTop: 20,
        fontSize: 13,
        color: colors.textTertiary,
    },
});

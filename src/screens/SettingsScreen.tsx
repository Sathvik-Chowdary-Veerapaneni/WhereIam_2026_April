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
import { useAuth } from '../context';
import { authService } from '../services';
import { logger } from '../utils';

export const SettingsScreen: React.FC = () => {
    const { user, signOut, isAdmin, isGuest, guestDaysRemaining, endGuestSession } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showCreateAccount, setShowCreateAccount] = useState(false);
    const [email, setEmail] = useState('');
    const [sendingLink, setSendingLink] = useState(false);
    const [linkSent, setLinkSent] = useState(false);

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

    const handleSendMagicLink = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setSendingLink(true);
        try {
            const { success, error } = await authService.sendMagicLink(email.trim());

            if (!success) {
                throw error || new Error('Failed to send verification link');
            }

            setLinkSent(true);
            logger.info('Magic link sent from settings');
        } catch (error) {
            const message = (error as Error).message || 'Failed to send verification link';
            logger.error('Magic link error:', error);
            Alert.alert('Error', message);
        } finally {
            setSendingLink(false);
        }
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
                            ) : linkSent ? (
                                <View style={styles.linkSentContainer}>
                                    <Text style={styles.linkSentIcon}>📧</Text>
                                    <Text style={styles.linkSentTitle}>Check Your Email</Text>
                                    <Text style={styles.linkSentText}>
                                        We sent a verification link to {email}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.resendButton}
                                        onPress={handleSendMagicLink}
                                        disabled={sendingLink}
                                    >
                                        <Text style={styles.resendButtonText}>
                                            {sendingLink ? 'Sending...' : 'Resend Link'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.createAccountForm}>
                                    <TextInput
                                        style={styles.emailInput}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#666"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        value={email}
                                        onChangeText={setEmail}
                                        editable={!sendingLink}
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendLinkButton, sendingLink && styles.buttonDisabled]}
                                        onPress={handleSendMagicLink}
                                        disabled={sendingLink}
                                    >
                                        {sendingLink ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.sendLinkButtonText}>
                                                Send Verification Link
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            setShowCreateAccount(false);
                                            setEmail('');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
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
                            <ActivityIndicator color="#FF3B30" />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0F',
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
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2E',
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
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarGuest: {
        backgroundColor: '#FF9500',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    profileEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    profileId: {
        fontSize: 13,
        color: '#8E8E93',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    adminBadge: {
        backgroundColor: '#FFD60A',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    adminBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#000000',
    },
    guestBadge: {
        backgroundColor: '#FF9500',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    guestBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    infoLabel: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    infoValue: {
        fontSize: 16,
        color: '#8E8E93',
    },
    divider: {
        height: 1,
        backgroundColor: '#2C2C2E',
        marginLeft: 16,
    },
    signOutButton: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3A2020',
    },
    signOutButtonDisabled: {
        opacity: 0.6,
    },
    signOutText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FF3B30',
    },
    // Guest upgrade styles
    guestUpgradeCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#FF9500',
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
        color: '#FFFFFF',
    },
    guestUpgradeSubtitle: {
        fontSize: 14,
        color: '#FF9500',
        fontWeight: '500',
    },
    guestUpgradeText: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 20,
        marginBottom: 16,
    },
    createAccountButton: {
        backgroundColor: '#007AFF',
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
    emailInput: {
        backgroundColor: '#2C2C2E',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: '#FFFFFF',
    },
    sendLinkButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    sendLinkButtonText: {
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
        color: '#8E8E93',
    },
    linkSentContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    linkSentIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    linkSentTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    linkSentText: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 16,
    },
    resendButton: {
        padding: 10,
    },
    resendButtonText: {
        fontSize: 15,
        color: '#007AFF',
        fontWeight: '500',
    },
});

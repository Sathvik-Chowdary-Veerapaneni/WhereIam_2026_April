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
} from 'react-native';
import { useAuth } from '../context';
import { logger } from '../utils';

export const SettingsScreen: React.FC = () => {
    const { user, signOut, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <View style={styles.profileRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {user?.email?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View style={styles.profileInfo}>
                                <View style={styles.emailRow}>
                                    <Text style={styles.profileEmail}>{user?.email}</Text>
                                    {isAdmin && (
                                        <View style={styles.adminBadge}>
                                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.profileId}>ID: {user?.id?.slice(0, 8)}...</Text>
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
                            <Text style={styles.signOutText}>Sign Out</Text>
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
});

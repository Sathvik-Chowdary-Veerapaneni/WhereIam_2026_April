import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, authService, localStorageService, migrationService } from '../services';
import type { GuestSession } from '../services';
import { logger } from '../utils';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isOnboarded: boolean;
    isAdmin: boolean;
    isGuest: boolean;
    guestSession: GuestSession | null;
    guestDaysRemaining: number;
    signOut: () => Promise<void>;
    checkOnboardingStatus: () => Promise<boolean>;
    startGuestSession: () => Promise<void>;
    endGuestSession: () => Promise<void>;
    refreshGuestStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnboarded, setIsOnboarded] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
    const [guestDaysRemaining, setGuestDaysRemaining] = useState(0);

    // Check if user is admin
    const checkAdminStatus = async (userId: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .single();

            if (error) {
                // Column might not exist yet, that's ok
                logger.info('Admin check:', error.message);
                return false;
            }

            const adminStatus = data?.is_admin === true;
            setIsAdmin(adminStatus);
            if (adminStatus) {
                logger.info('Admin user detected');
            }
            return adminStatus;
        } catch (error) {
            logger.error('Admin check failed:', error);
            return false;
        }
    };

    // Check if user has completed onboarding (has income entry)
    const checkOnboardingStatus = async (): Promise<boolean> => {
        // For guest users, check local storage
        if (isGuest) {
            try {
                const localIncome = await localStorageService.getLocalIncome();
                const onboarded = localIncome.length > 0;
                setIsOnboarded(onboarded);
                return onboarded;
            } catch (error) {
                logger.error('Error checking guest onboarding status:', error);
                return false;
            }
        }

        // For authenticated users, check Supabase
        if (!user) return false;

        try {
            const { data, error } = await supabase
                .from('income')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                logger.error('Error checking onboarding status:', error);
                return false;
            }

            const onboarded = data && data.length > 0;
            setIsOnboarded(onboarded);
            return onboarded;
        } catch (error) {
            logger.error('Onboarding check failed:', error);
            return false;
        }
    };

    // Start a guest session
    const startGuestSession = async () => {
        try {
            const session = await localStorageService.createGuestSession();
            setGuestSession(session);
            setIsGuest(true);
            setIsOnboarded(false);

            const daysRemaining = await localStorageService.getDaysRemaining();
            setGuestDaysRemaining(daysRemaining);

            logger.info('Guest session started');
        } catch (error) {
            logger.error('Failed to start guest session:', error);
            throw error;
        }
    };

    // End guest session (when user signs up or session expires)
    const endGuestSession = async () => {
        try {
            await localStorageService.clearGuestSession();
            setGuestSession(null);
            setIsGuest(false);
            setGuestDaysRemaining(0);
            logger.info('Guest session ended');
        } catch (error) {
            logger.error('Failed to end guest session:', error);
            throw error;
        }
    };

    // Refresh guest session status
    const refreshGuestStatus = useCallback(async () => {
        try {
            const existingSession = await localStorageService.getGuestSession();

            if (existingSession) {
                const isExpired = await localStorageService.isGuestSessionExpired();

                if (isExpired) {
                    logger.info('Guest session has expired');
                    await localStorageService.clearGuestSession();
                    setGuestSession(null);
                    setIsGuest(false);
                    setGuestDaysRemaining(0);
                } else {
                    setGuestSession(existingSession);
                    setIsGuest(true);
                    const daysRemaining = await localStorageService.getDaysRemaining();
                    setGuestDaysRemaining(daysRemaining);

                    // Check guest onboarding
                    const localIncome = await localStorageService.getLocalIncome();
                    setIsOnboarded(localIncome.length > 0);
                }
            }
        } catch (error) {
            logger.error('Error refreshing guest status:', error);
        }
    }, []);

    // Sign out handler
    const signOut = async () => {
        try {
            if (isGuest) {
                // If guest, just end the guest session
                await endGuestSession();
            } else {
                // If authenticated, sign out from Supabase
                const { success, error } = await authService.signOut();
                if (!success) throw error;
            }

            setSession(null);
            setUser(null);
            setIsOnboarded(false);
            setIsAdmin(false);
            setIsGuest(false);
            setGuestSession(null);
            setGuestDaysRemaining(0);
            logger.info('User signed out');
        } catch (error) {
            logger.error('Sign out error:', error);
            throw error;
        }
    };

    useEffect(() => {
        // Get initial session
        const initSession = async () => {
            try {
                // First check for authenticated session
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // User is authenticated
                    setSession(session);
                    setUser(session.user);
                    setIsGuest(false);

                    await checkAdminStatus(session.user.id);

                    // Check onboarding after setting user
                    const { data, error } = await supabase
                        .from('income')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .limit(1);

                    if (!error) {
                        setIsOnboarded(data && data.length > 0);
                    }

                    // Migrate guest data to Supabase if exists, then clear local data
                    const guestExists = await localStorageService.getGuestSession();
                    if (guestExists) {
                        const hasData = await migrationService.hasDataToMigrate();
                        if (hasData) {
                            logger.info('Migrating guest data to Supabase...');
                            const result = await migrationService.migrateToSupabase(session.user.id);
                            if (result.success) {
                                logger.info('Guest data migrated successfully');
                            } else {
                                logger.error('Guest data migration failed:', result.error);
                            }
                        } else {
                            await localStorageService.clearGuestSession();
                        }
                    }
                } else {
                    // No authenticated session, check for guest session
                    await refreshGuestStatus();
                }
            } catch (error) {
                logger.error('Session init error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                logger.info('Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // User signed in - migrate guest data if active
                    const guestExists = await localStorageService.getGuestSession();
                    if (guestExists) {
                        const hasData = await migrationService.hasDataToMigrate();
                        if (hasData) {
                            logger.info('Migrating guest data on sign in...');
                            const result = await migrationService.migrateToSupabase(session.user.id);
                            if (result.success) {
                                logger.info('Guest data migrated successfully on sign in');
                            } else {
                                logger.error('Guest data migration failed on sign in:', result.error);
                            }
                        } else {
                            await localStorageService.clearGuestSession();
                        }
                        setIsGuest(false);
                        setGuestSession(null);
                    }

                    // Small delay to ensure DB trigger has run for new users
                    setTimeout(async () => {
                        await checkAdminStatus(session.user.id);
                        await checkOnboardingStatus();
                    }, 500);
                } else {
                    setIsOnboarded(false);
                    setIsAdmin(false);
                    // Check for guest session when user signs out
                    await refreshGuestStatus();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Re-check onboarding when user or guest status changes
    useEffect(() => {
        if (user) {
            checkAdminStatus(user.id);
            checkOnboardingStatus();
        } else if (isGuest) {
            checkOnboardingStatus();
        }
    }, [user?.id, isGuest]);

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                isLoading,
                isOnboarded,
                isAdmin,
                isGuest,
                guestSession,
                guestDaysRemaining,
                signOut,
                checkOnboardingStatus,
                startGuestSession,
                endGuestSession,
                refreshGuestStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

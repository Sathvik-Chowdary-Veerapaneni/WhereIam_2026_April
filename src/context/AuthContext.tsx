import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, authService } from '../services';
import { logger } from '../utils';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isOnboarded: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
    checkOnboardingStatus: () => Promise<boolean>;
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

    // Sign out handler
    const signOut = async () => {
        try {
            const { success, error } = await authService.signOut();
            if (!success) throw error;
            setSession(null);
            setUser(null);
            setIsOnboarded(false);
            setIsAdmin(false);
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
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await checkAdminStatus(session.user.id);
                    await checkOnboardingStatus();
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
                    // Small delay to ensure DB trigger has run for new users
                    setTimeout(async () => {
                        await checkAdminStatus(session.user.id);
                        await checkOnboardingStatus();
                    }, 500);
                } else {
                    setIsOnboarded(false);
                    setIsAdmin(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Re-check onboarding when user changes
    useEffect(() => {
        if (user) {
            checkAdminStatus(user.id);
            checkOnboardingStatus();
        }
    }, [user?.id]);

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                isLoading,
                isOnboarded,
                isAdmin,
                signOut,
                checkOnboardingStatus,
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

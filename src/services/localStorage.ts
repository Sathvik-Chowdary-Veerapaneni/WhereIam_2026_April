import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils';

// Storage keys for guest/local data
const LOCAL_STORAGE_KEYS = {
    GUEST_SESSION: '@debt_mirror_guest_session',
    GUEST_DEBTS: '@debt_mirror_guest_debts',
    GUEST_INCOME: '@debt_mirror_guest_income',
    GUEST_TRANSACTIONS: '@debt_mirror_guest_transactions',
};

export interface GuestSession {
    id: string;
    startedAt: string;
    expiresAt: string;
}

export interface LocalDebt {
    id: string;
    name: string;
    description?: string;
    debt_type: string;
    creditor_name?: string;
    currency_code: string;
    principal: number;
    current_balance: number;
    interest_rate?: number;
    minimum_payment?: number;
    start_date?: string;
    due_date?: string;
    target_payoff_date?: string;
    status: string;
    priority: number;
    created_at: string;
    updated_at: string;
}

export interface LocalIncome {
    id: string;
    source_name: string;
    amount: number;
    currency_code: string;
    frequency: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface LocalTransaction {
    id: string;
    debt_id: string;
    type: string;
    amount: number;
    interest_amount: number;
    new_balance: number;
    notes?: string;
    created_at: string;
}

// Generate a unique ID for local entities
const generateLocalId = (): string => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Calculate expiration date (2 months from now)
const calculateExpirationDate = (): string => {
    const now = new Date();
    now.setMonth(now.getMonth() + 2);
    return now.toISOString();
};

export const localStorageService = {
    // Guest Session Management
    async createGuestSession(): Promise<GuestSession> {
        const session: GuestSession = {
            id: generateLocalId(),
            startedAt: new Date().toISOString(),
            expiresAt: calculateExpirationDate(),
        };

        await AsyncStorage.setItem(
            LOCAL_STORAGE_KEYS.GUEST_SESSION,
            JSON.stringify(session)
        );

        logger.info('Guest session created, expires:', session.expiresAt);
        return session;
    },

    async getGuestSession(): Promise<GuestSession | null> {
        try {
            const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_SESSION);
            if (!data) return null;

            const session: GuestSession = JSON.parse(data);
            return session;
        } catch (error) {
            logger.error('Error getting guest session:', error);
            return null;
        }
    },

    async isGuestSessionExpired(): Promise<boolean> {
        const session = await this.getGuestSession();
        if (!session) return true;

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        return now > expiresAt;
    },

    async clearGuestSession(): Promise<void> {
        await AsyncStorage.multiRemove([
            LOCAL_STORAGE_KEYS.GUEST_SESSION,
            LOCAL_STORAGE_KEYS.GUEST_DEBTS,
            LOCAL_STORAGE_KEYS.GUEST_INCOME,
            LOCAL_STORAGE_KEYS.GUEST_TRANSACTIONS,
        ]);
        logger.info('Guest session cleared');
    },

    // Local Debts Management
    async getLocalDebts(): Promise<LocalDebt[]> {
        try {
            const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_DEBTS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            logger.error('Error getting local debts:', error);
            return [];
        }
    },

    async saveLocalDebt(debt: Omit<LocalDebt, 'id' | 'created_at' | 'updated_at'>): Promise<LocalDebt> {
        const debts = await this.getLocalDebts();
        const newDebt: LocalDebt = {
            ...debt,
            id: generateLocalId(),
            status: debt.status || 'active',
            priority: debt.priority || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        debts.push(newDebt);
        await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_DEBTS, JSON.stringify(debts));

        // Create initial transaction
        await this.saveLocalTransaction({
            debt_id: newDebt.id,
            type: 'initial',
            amount: newDebt.principal,
            interest_amount: 0,
            new_balance: newDebt.principal,
            notes: 'Initial Balance',
        });

        logger.info('Local debt saved:', newDebt.name);
        return newDebt;
    },

    async updateLocalDebt(id: string, updates: Partial<LocalDebt>): Promise<boolean> {
        try {
            const debts = await this.getLocalDebts();
            const index = debts.findIndex(d => d.id === id);
            if (index === -1) return false;

            debts[index] = {
                ...debts[index],
                ...updates,
                updated_at: new Date().toISOString(),
            };

            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_DEBTS, JSON.stringify(debts));
            logger.info('Local debt updated:', id);
            return true;
        } catch (error) {
            logger.error('Error updating local debt:', error);
            return false;
        }
    },

    async deleteLocalDebt(id: string): Promise<boolean> {
        try {
            const debts = await this.getLocalDebts();
            const filtered = debts.filter(d => d.id !== id);

            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_DEBTS, JSON.stringify(filtered));

            // Also delete associated transactions
            const transactions = await this.getLocalTransactions();
            const filteredTxns = transactions.filter(t => t.debt_id !== id);
            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_TRANSACTIONS, JSON.stringify(filteredTxns));

            logger.info('Local debt deleted:', id);
            return true;
        } catch (error) {
            logger.error('Error deleting local debt:', error);
            return false;
        }
    },

    async getLocalDebt(id: string): Promise<LocalDebt | null> {
        const debts = await this.getLocalDebts();
        return debts.find(d => d.id === id) || null;
    },

    // Local Income Management
    async getLocalIncome(): Promise<LocalIncome[]> {
        try {
            const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_INCOME);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            logger.error('Error getting local income:', error);
            return [];
        }
    },

    async saveLocalIncome(income: Omit<LocalIncome, 'id' | 'created_at' | 'updated_at'>): Promise<LocalIncome> {
        const incomes = await this.getLocalIncome();
        const newIncome: LocalIncome = {
            ...income,
            id: generateLocalId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        incomes.push(newIncome);
        await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_INCOME, JSON.stringify(incomes));
        logger.info('Local income saved:', newIncome.source_name);
        return newIncome;
    },

    async updateLocalIncome(id: string, updates: Partial<LocalIncome>): Promise<boolean> {
        try {
            const incomes = await this.getLocalIncome();
            const index = incomes.findIndex(i => i.id === id);
            if (index === -1) return false;

            incomes[index] = {
                ...incomes[index],
                ...updates,
                updated_at: new Date().toISOString(),
            };

            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_INCOME, JSON.stringify(incomes));
            logger.info('Local income updated:', id);
            return true;
        } catch (error) {
            logger.error('Error updating local income:', error);
            return false;
        }
    },

    async deleteLocalIncome(id: string): Promise<boolean> {
        try {
            const incomes = await this.getLocalIncome();
            const filtered = incomes.filter(i => i.id !== id);
            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_INCOME, JSON.stringify(filtered));
            logger.info('Local income deleted:', id);
            return true;
        } catch (error) {
            logger.error('Error deleting local income:', error);
            return false;
        }
    },

    // Local Transactions Management
    async getLocalTransactions(): Promise<LocalTransaction[]> {
        try {
            const data = await AsyncStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_TRANSACTIONS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            logger.error('Error getting local transactions:', error);
            return [];
        }
    },

    async getLocalTransactionsForDebt(debtId: string): Promise<LocalTransaction[]> {
        const transactions = await this.getLocalTransactions();
        return transactions.filter(t => t.debt_id === debtId);
    },

    async saveLocalTransaction(txn: Omit<LocalTransaction, 'id' | 'created_at'>): Promise<LocalTransaction> {
        const transactions = await this.getLocalTransactions();
        const newTxn: LocalTransaction = {
            ...txn,
            id: generateLocalId(),
            created_at: new Date().toISOString(),
        };

        transactions.push(newTxn);
        await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_TRANSACTIONS, JSON.stringify(transactions));
        logger.info('Local transaction saved');
        return newTxn;
    },

    async deleteLocalTransaction(id: string): Promise<boolean> {
        try {
            const transactions = await this.getLocalTransactions();
            const filtered = transactions.filter(t => t.id !== id);
            await AsyncStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_TRANSACTIONS, JSON.stringify(filtered));
            logger.info('Local transaction deleted:', id);
            return true;
        } catch (error) {
            logger.error('Error deleting local transaction:', error);
            return false;
        }
    },

    // Get all local data for migration to cloud
    async getAllLocalData(): Promise<{
        debts: LocalDebt[];
        income: LocalIncome[];
        transactions: LocalTransaction[];
    }> {
        return {
            debts: await this.getLocalDebts(),
            income: await this.getLocalIncome(),
            transactions: await this.getLocalTransactions(),
        };
    },

    // Get days remaining in guest session
    async getDaysRemaining(): Promise<number> {
        const session = await this.getGuestSession();
        if (!session) return 0;

        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    },
};

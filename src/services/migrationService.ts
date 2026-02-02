import { supabase } from './supabase';
import { localStorageService, LocalDebt, LocalIncome, LocalTransaction } from './localStorage';
import { logger } from '../utils';

interface MigrationResult {
    success: boolean;
    migratedDebts: number;
    migratedIncome: number;
    migratedTransactions: number;
    error?: Error;
}

export const migrationService = {
    /**
     * Check if there's local guest data to migrate
     */
    async hasDataToMigrate(): Promise<boolean> {
        const session = await localStorageService.getGuestSession();
        if (!session) return false;

        const data = await localStorageService.getAllLocalData();
        return data.debts.length > 0 || data.income.length > 0;
    },

    /**
     * Migrate all local guest data to Supabase for the authenticated user
     * This should be called after a guest user creates an account or logs in
     */
    async migrateToSupabase(userId: string): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: false,
            migratedDebts: 0,
            migratedIncome: 0,
            migratedTransactions: 0,
        };

        try {
            // Get all local data
            const localData = await localStorageService.getAllLocalData();

            if (localData.debts.length === 0 && localData.income.length === 0) {
                logger.info('No local data to migrate');
                result.success = true;
                return result;
            }

            logger.info(`Starting migration: ${localData.debts.length} debts, ${localData.income.length} income sources`);

            // Map to track old local IDs to new Supabase IDs (for transactions)
            const debtIdMap: { [localId: string]: string } = {};

            // Migrate debts
            for (const localDebt of localData.debts) {
                const newDebt = await this.migrateDebt(userId, localDebt);
                if (newDebt) {
                    debtIdMap[localDebt.id] = newDebt.id;
                    result.migratedDebts++;
                }
            }

            // Migrate income sources
            for (const localIncome of localData.income) {
                const success = await this.migrateIncome(userId, localIncome);
                if (success) {
                    result.migratedIncome++;
                }
            }

            // Migrate transactions (using the new debt IDs)
            for (const localTxn of localData.transactions) {
                const newDebtId = debtIdMap[localTxn.debt_id];
                if (newDebtId) {
                    const success = await this.migrateTransaction(userId, localTxn, newDebtId);
                    if (success) {
                        result.migratedTransactions++;
                    }
                }
            }

            // Clear local data after successful migration
            await localStorageService.clearGuestSession();

            result.success = true;
            logger.info(`Migration complete: ${result.migratedDebts} debts, ${result.migratedIncome} income, ${result.migratedTransactions} transactions`);

            return result;
        } catch (error) {
            logger.error('Migration error:', error);
            result.error = error as Error;
            return result;
        }
    },

    /**
     * Migrate a single debt to Supabase
     */
    async migrateDebt(userId: string, localDebt: LocalDebt): Promise<{ id: string } | null> {
        try {
            const { data, error } = await supabase
                .from('debts')
                .insert({
                    user_id: userId,
                    name: localDebt.name,
                    description: localDebt.description || null,
                    debt_type: localDebt.debt_type,
                    creditor_name: localDebt.creditor_name || null,
                    currency_code: localDebt.currency_code || 'USD',
                    principal: localDebt.principal,
                    current_balance: localDebt.current_balance,
                    interest_rate: localDebt.interest_rate || null,
                    minimum_payment: localDebt.minimum_payment || null,
                    start_date: localDebt.start_date || null,
                    due_date: localDebt.due_date || null,
                    target_payoff_date: localDebt.target_payoff_date || null,
                    status: localDebt.status || 'active',
                    priority: localDebt.priority || 0,
                    created_at: localDebt.created_at,
                    updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();

            if (error) {
                logger.error('Error migrating debt:', error);
                return null;
            }

            return data;
        } catch (error) {
            logger.error('Error migrating debt:', error);
            return null;
        }
    },

    /**
     * Migrate a single income source to Supabase
     */
    async migrateIncome(userId: string, localIncome: LocalIncome): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('income')
                .insert({
                    user_id: userId,
                    profession: localIncome.source_name,
                    monthly_amount: localIncome.amount,
                    income_type: localIncome.is_primary ? 'primary' : 'other',
                    currency_code: localIncome.currency_code || 'USD',
                    created_at: localIncome.created_at,
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                logger.error('Error migrating income:', error);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error migrating income:', error);
            return false;
        }
    },

    /**
     * Migrate a single transaction to Supabase
     */
    async migrateTransaction(userId: string, localTxn: LocalTransaction, newDebtId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('debt_transactions')
                .insert({
                    user_id: userId,
                    debt_id: newDebtId,
                    type: localTxn.type,
                    amount: localTxn.amount,
                    interest_amount: localTxn.interest_amount || 0,
                    new_balance: localTxn.new_balance,
                    notes: localTxn.notes || null,
                    created_at: localTxn.created_at,
                });

            if (error) {
                logger.error('Error migrating transaction:', error);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error migrating transaction:', error);
            return false;
        }
    },
};

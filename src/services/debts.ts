import { supabase } from './supabase';
import { logger } from '../utils';

export interface Debt {
    id: string;
    user_id: string;
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

export interface CreateDebtInput {
    name: string;
    description?: string;
    debt_type: string;
    creditor_name?: string;
    currency_code: string;
    principal: number;
    current_balance: number;
    interest_rate?: number;
    minimum_payment?: number;
    due_date?: string;
    priority?: number;
}

export const debtsService = {
    // Create a new debt
    async createDebt(input: CreateDebtInput): Promise<{ success: boolean; debt?: Debt; error?: Error }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('debts')
                .insert({
                    user_id: user.id,
                    name: input.name,
                    description: input.description || null,
                    debt_type: input.debt_type,
                    creditor_name: input.creditor_name || null,
                    currency_code: input.currency_code || 'USD',
                    principal: input.principal,
                    current_balance: input.current_balance,
                    interest_rate: input.interest_rate || null,
                    minimum_payment: input.minimum_payment || null,
                    due_date: input.due_date || null,
                    priority: input.priority || 0,
                    status: 'active',
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            logger.info('Debt created:', data?.name);
            return { success: true, debt: data };
        } catch (error) {
            logger.error('Create debt error:', error);
            return { success: false, error: error as Error };
        }
    },

    // List all debts for current user
    async listDebts(): Promise<{ success: boolean; debts?: Debt[]; error?: Error }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('debts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, debts: data || [] };
        } catch (error) {
            logger.error('List debts error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Get debt totals
    async getDebtTotals(): Promise<{
        success: boolean;
        totalBalance?: number;
        totalDebts?: number;
        avgInterestRate?: number;
        totalMinPayment?: number;
        error?: Error;
    }> {
        try {
            const { success, debts, error } = await this.listDebts();
            if (!success || !debts) {
                throw error || new Error('Failed to fetch debts');
            }

            const activeDebts = debts.filter(d => d.status === 'active');
            const totalBalance = activeDebts.reduce((sum, d) => sum + (d.current_balance || 0), 0);
            const totalMinPayment = activeDebts.reduce((sum, d) => sum + (d.minimum_payment || 0), 0);

            const debtsWithRate = activeDebts.filter(d => d.interest_rate != null);
            const avgInterestRate = debtsWithRate.length > 0
                ? debtsWithRate.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debtsWithRate.length
                : 0;

            return {
                success: true,
                totalBalance,
                totalDebts: activeDebts.length,
                avgInterestRate,
                totalMinPayment,
            };
        } catch (error) {
            logger.error('Get debt totals error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Update a debt
    async updateDebt(id: string, updates: Partial<CreateDebtInput>): Promise<{ success: boolean; error?: Error }> {
        try {
            const { error } = await supabase
                .from('debts')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                throw error;
            }

            logger.info('Debt updated:', id);
            return { success: true };
        } catch (error) {
            logger.error('Update debt error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Delete a debt
    async deleteDebt(id: string): Promise<{ success: boolean; error?: Error }> {
        try {
            const { error } = await supabase
                .from('debts')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            logger.info('Debt deleted:', id);
            return { success: true };
        } catch (error) {
            logger.error('Delete debt error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Get debt totals grouped by currency
    async getDebtTotalsByCurrency(): Promise<{
        success: boolean;
        totalsByCurrency?: { [currencyCode: string]: { totalBalance: number; totalMinPayment: number; debtCount: number } };
        totalDebts?: number;
        avgInterestRate?: number;
        error?: Error;
    }> {
        try {
            const { success, debts, error } = await this.listDebts();
            if (!success || !debts) {
                throw error || new Error('Failed to fetch debts');
            }

            const activeDebts = debts.filter(d => d.status === 'active');

            // Group totals by currency
            const totalsByCurrency: { [currencyCode: string]: { totalBalance: number; totalMinPayment: number; debtCount: number } } = {};

            for (const debt of activeDebts) {
                const currencyCode = debt.currency_code || 'USD';
                if (!totalsByCurrency[currencyCode]) {
                    totalsByCurrency[currencyCode] = { totalBalance: 0, totalMinPayment: 0, debtCount: 0 };
                }
                totalsByCurrency[currencyCode].totalBalance += debt.current_balance || 0;
                totalsByCurrency[currencyCode].totalMinPayment += debt.minimum_payment || 0;
                totalsByCurrency[currencyCode].debtCount += 1;
            }

            // Calculate average interest rate across all debts
            const debtsWithRate = activeDebts.filter(d => d.interest_rate != null);
            const avgInterestRate = debtsWithRate.length > 0
                ? debtsWithRate.reduce((sum, d) => sum + (d.interest_rate || 0), 0) / debtsWithRate.length
                : 0;

            return {
                success: true,
                totalsByCurrency,
                totalDebts: activeDebts.length,
                avgInterestRate,
            };
        } catch (error) {
            logger.error('Get debt totals by currency error:', error);
            return { success: false, error: error as Error };
        }
    },
};

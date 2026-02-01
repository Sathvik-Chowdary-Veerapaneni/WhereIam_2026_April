import { supabase } from './supabase';
import { logger } from '../utils';

export interface DebtTransaction {
    id: string;
    debt_id: string;
    user_id: string;
    type: 'payment' | 'borrow' | 'initial';
    amount: number;
    interest_amount: number;
    new_balance?: number;
    notes?: string;
    created_at: string;
}

export interface CreateTransactionInput {
    debt_id: string;
    type: 'payment' | 'borrow' | 'initial';
    amount: number;
    interest_amount?: number;
    notes?: string;
}

export const debtTransactionsService = {
    // Create a new transaction and update debt balance
    async createTransaction(input: CreateTransactionInput): Promise<{ success: boolean; transaction?: DebtTransaction; error?: Error }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get current debt to calculate new balance
            const { data: debt, error: debtError } = await supabase
                .from('debts')
                .select('*')
                .eq('id', input.debt_id)
                .single();

            if (debtError || !debt) {
                throw debtError || new Error('Debt not found');
            }

            // Calculate interest if APR exists and it's a borrow transaction
            let interestAmount = input.interest_amount || 0;
            if (input.type === 'borrow' && debt.interest_rate && debt.interest_rate > 0) {
                // Simple interest calculation: amount * (APR/100) / 12 for monthly
                interestAmount = (input.amount * (debt.interest_rate / 100)) / 12;
            }

            // Calculate new balance
            let newBalance = debt.current_balance;
            if (input.type === 'payment') {
                newBalance = Math.max(0, debt.current_balance - input.amount);
            } else {
                // Borrow: add amount + interest
                newBalance = debt.current_balance + input.amount + interestAmount;
            }

            // Create transaction
            const { data: transaction, error: transactionError } = await supabase
                .from('debt_transactions')
                .insert({
                    debt_id: input.debt_id,
                    user_id: user.id,
                    type: input.type,
                    amount: input.amount,
                    interest_amount: interestAmount,
                    notes: input.notes || null,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (transactionError) {
                throw transactionError;
            }

            // Update debt balance
            const { error: updateError } = await supabase
                .from('debts')
                .update({
                    current_balance: newBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', input.debt_id);

            if (updateError) {
                throw updateError;
            }

            logger.info(`Transaction created: ${input.type} of ${input.amount}`);
            return { success: true, transaction };
        } catch (error) {
            logger.error('Create transaction error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Get all transactions for a specific debt
    async getTransactionsByDebt(debtId: string): Promise<{ success: boolean; transactions?: DebtTransaction[]; error?: Error }> {
        try {
            const { data, error } = await supabase
                .from('debt_transactions')
                .select('*')
                .eq('debt_id', debtId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return { success: true, transactions: data || [] };
        } catch (error) {
            logger.error('Get transactions error:', error);
            return { success: false, error: error as Error };
        }
    },

    // Delete a transaction and revert balance change
    async deleteTransaction(transactionId: string): Promise<{ success: boolean; error?: Error }> {
        try {
            // Get transaction first
            const { data: transaction, error: fetchError } = await supabase
                .from('debt_transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (fetchError || !transaction) {
                throw fetchError || new Error('Transaction not found');
            }

            // Get current debt balance
            const { data: debt, error: debtError } = await supabase
                .from('debts')
                .select('current_balance')
                .eq('id', transaction.debt_id)
                .single();

            if (debtError || !debt) {
                throw debtError || new Error('Debt not found');
            }

            // Revert balance change
            let newBalance = debt.current_balance;
            if (transaction.type === 'payment') {
                // Reverting a payment = add the amount back
                newBalance = debt.current_balance + transaction.amount;
            } else {
                // Reverting a borrow = subtract amount + interest
                newBalance = Math.max(0, debt.current_balance - transaction.amount - transaction.interest_amount);
            }

            // Delete transaction
            const { error: deleteError } = await supabase
                .from('debt_transactions')
                .delete()
                .eq('id', transactionId);

            if (deleteError) {
                throw deleteError;
            }

            // Update debt balance
            const { error: updateError } = await supabase
                .from('debts')
                .update({
                    current_balance: newBalance,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', transaction.debt_id);

            if (updateError) {
                throw updateError;
            }

            logger.info('Transaction deleted and balance reverted');
            return { success: true };
        } catch (error) {
            logger.error('Delete transaction error:', error);
            return { success: false, error: error as Error };
        }
    },
};

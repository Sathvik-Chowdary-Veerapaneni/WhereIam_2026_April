import { supabase } from './supabase';

export interface IncomeSource {
    id: string;
    user_id: string;
    profession: string;
    monthly_amount: number;
    income_type: 'primary' | 'side_gig' | 'cash_earnings' | 'other';
    description?: string;
    created_at: string;
    updated_at?: string;
}

export interface CreateIncomeInput {
    profession: string;
    monthly_amount: number;
    income_type?: 'primary' | 'side_gig' | 'cash_earnings' | 'other';
    description?: string;
}

export interface UpdateIncomeInput {
    profession?: string;
    monthly_amount?: number;
    income_type?: 'primary' | 'side_gig' | 'cash_earnings' | 'other';
    description?: string;
}

export const incomeService = {
    /**
     * Fetch all income sources for the current user
     */
    async getAll(userId: string): Promise<IncomeSource[]> {
        const { data, error } = await supabase
            .from('income')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching income sources:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Get a single income source by ID
     */
    async getById(id: string): Promise<IncomeSource | null> {
        const { data, error } = await supabase
            .from('income')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching income source:', error);
            throw error;
        }

        return data;
    },

    /**
     * Create a new income source
     */
    async create(userId: string, input: CreateIncomeInput): Promise<IncomeSource> {
        const { data, error } = await supabase
            .from('income')
            .insert({
                user_id: userId,
                profession: input.profession,
                monthly_amount: input.monthly_amount,
                income_type: input.income_type || 'primary',
                description: input.description,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating income source:', error);
            throw error;
        }

        return data;
    },

    /**
     * Update an existing income source
     */
    async update(id: string, input: UpdateIncomeInput): Promise<IncomeSource> {
        const { data, error } = await supabase
            .from('income')
            .update({
                ...input,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating income source:', error);
            throw error;
        }

        return data;
    },

    /**
     * Delete an income source
     */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('income')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting income source:', error);
            throw error;
        }
    },

    /**
     * Get total monthly income for a user
     */
    async getTotalMonthlyIncome(userId: string): Promise<number> {
        const sources = await this.getAll(userId);
        return sources.reduce((total, source) => total + source.monthly_amount, 0);
    },
};

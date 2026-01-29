import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, DEFAULT_CURRENCY, getCurrencyByCode } from '../constants/currencies';
import { logger } from '../utils';

const CURRENCY_STORAGE_KEY = 'debt_mirror_selected_currency';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => Promise<void>;
    formatAmount: (amount: number) => string;
    formatAmountCompact: (amount: number) => string;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
    children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
    const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved currency on mount
    useEffect(() => {
        const loadCurrency = async () => {
            try {
                const savedCode = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
                if (savedCode) {
                    const savedCurrency = getCurrencyByCode(savedCode);
                    setCurrencyState(savedCurrency);
                    logger.info('Loaded saved currency:', savedCode);
                }
            } catch (error) {
                logger.error('Error loading currency preference:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCurrency();
    }, []);

    // Save and update currency
    const setCurrency = useCallback(async (newCurrency: Currency) => {
        try {
            await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency.code);
            setCurrencyState(newCurrency);
            logger.info('Currency updated to:', newCurrency.code);
        } catch (error) {
            logger.error('Error saving currency preference:', error);
            throw error;
        }
    }, []);

    // Format amount with current currency
    const formatAmount = useCallback((amount: number): string => {
        try {
            return new Intl.NumberFormat(currency.locale, {
                style: 'currency',
                currency: currency.code,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch {
            // Fallback formatting
            return `${currency.symbol}${amount.toFixed(2)}`;
        }
    }, [currency]);

    // Compact format for large numbers
    const formatAmountCompact = useCallback((amount: number): string => {
        try {
            if (amount >= 1000000) {
                return `${currency.symbol}${(amount / 1000000).toFixed(1)}M`;
            } else if (amount >= 1000) {
                return `${currency.symbol}${(amount / 1000).toFixed(1)}K`;
            }
            return formatAmount(amount);
        } catch {
            return `${currency.symbol}${amount.toFixed(2)}`;
        }
    }, [currency, formatAmount]);

    const value: CurrencyContextType = {
        currency,
        setCurrency,
        formatAmount,
        formatAmountCompact,
        isLoading,
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

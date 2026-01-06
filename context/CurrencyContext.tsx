
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencySettings } from '../types';
import * as api from '../services/api';

import { formatPrice as formatPriceUtil } from '../utils/currency';

interface CurrencyContextType {
    currencySettings: CurrencySettings;
    updateCurrency: (settings: CurrencySettings) => Promise<void>;
    formatPrice: (amount: number, overrideSettings?: CurrencySettings) => string;
}

const defaultSettings: CurrencySettings = {
    code: 'EUR',
    symbol: '€',
    position: 'suffix',
    decimalSeparator: ',',
    thousandSeparator: ' ',
    decimalPlaces: 2
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(defaultSettings);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await api.fetchCurrencySettings();
            if (settings) {
                setCurrencySettings(settings);
            }
        } catch (error) {
            console.error("Failed to load currency settings:", error);
        }
    };

    const updateCurrency = async (newSettings: CurrencySettings) => {
        try {
            await api.updateCurrencySettings(newSettings);
            setCurrencySettings(newSettings);
        } catch (error) {
            console.error("Failed to update currency settings:", error);
            throw error;
        }
    };

    const formatPrice = (amount: number, overrideSettings?: CurrencySettings): string => {
        return formatPriceUtil(amount, overrideSettings || currencySettings);
    };

    return (
        <CurrencyContext.Provider value={{ currencySettings, updateCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/axios';

type Currency = 'USD' | 'NPR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  isLoading: boolean;
  refreshRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('NPR');
  const [exchangeRate, setExchangeRate] = useState<number>(132.5); // Default rate
  const [isLoading, setIsLoading] = useState(true);

  // Load currency preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userPreferredCurrency') as Currency;
      if (saved && (saved === 'USD' || saved === 'NPR')) {
        setCurrencyState(saved);
      }
    }
  }, []);

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      // Check if user is authenticated before fetching
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
          // User not authenticated, skip fetching exchange rate
          setIsLoading(false);
          return;
        }
      }
      
      setIsLoading(true);
      const response = await api.get('/currency/rate');
      if (response.data.success) {
        setExchangeRate(response.data.data.rate);
      }
    } catch (error: any) {
      // Silently fail for auth errors (user not logged in)
      if (error.message !== 'No valid authentication token' && 
          error.response?.status !== 401) {
        console.error('Failed to fetch exchange rate:', error);
      }
      // Keep default rate on error
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPreferredCurrency', newCurrency);
    }
  };

  const refreshRate = async () => {
    await fetchExchangeRate();
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate,
        isLoading,
        refreshRate
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

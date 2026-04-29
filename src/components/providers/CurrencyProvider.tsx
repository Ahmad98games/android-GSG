'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'PKR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatCurrency: (amount: number, forceCurrency?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 1. Force PKR for National Tier / Mobile Build
    setCurrencyState('PKR');
    localStorage.setItem('gs_currency', 'PKR');
    setIsInitialized(true);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('gs_currency', c);
  };

  const formatCurrency = (amount: number, forceCurrency?: Currency) => {
    const targetCurrency = forceCurrency || currency;
    if (targetCurrency === 'PKR') {
      return `Rs. ${new Intl.NumberFormat('en-IN').format(amount)}`;
    }
    return `$${new Intl.NumberFormat('en-US').format(amount)}`;
  };

  // Avoid hydration mismatch by waiting for initialization
  if (!isInitialized) {
    return <div className="min-h-screen bg-[#030303]" />;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
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

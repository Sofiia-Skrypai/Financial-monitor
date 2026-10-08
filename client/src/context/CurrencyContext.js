import React, { createContext, useContext, useState, useCallback } from 'react';

const DEFAULT_RATES = {
  USD: 41.5,
  EUR: 45.0,
};

const STORAGE_KEY = 'fin_exchange_rates';

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const [rates, setRates] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored ?? DEFAULT_RATES;
    } catch {
      return DEFAULT_RATES;
    }
  });

  const updateRates = useCallback((newRates) => {
    const merged = { ...rates, ...newRates };
    setRates(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, [rates]);

  const convert = useCallback((amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;

    const from = String(fromCurrency).toUpperCase();
    const to   = String(toCurrency).toUpperCase();

    let amountInUAH;
    if (from === 'UAH') {
      amountInUAH = amount;
    } else {
      const rate = rates[from];
      if (!rate) return amount;
      amountInUAH = amount * rate;
    }

    if (to === 'UAH') return amountInUAH;
    const toRate = rates[to];
    if (!toRate) return amountInUAH;
    return amountInUAH / toRate;
  }, [rates]);

  return (
    <CurrencyContext.Provider value={{ rates, updateRates, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
};

export default CurrencyContext;

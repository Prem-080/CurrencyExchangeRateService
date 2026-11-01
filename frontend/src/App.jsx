import React, { useState } from 'react';
import './App.css';

import { useExchangeRates } from './hooks/useExchangeRates';
import { Navbar } from './components/Navbar';
import { FreshnessBanner } from './components/FreshnessBanner';
import { Converter } from './components/Converter';
import { ProBanner } from './components/ProBanner';
import { RatesGrid } from './components/RatesGrid';
import { Footer } from './components/Footer';

export default function App() {
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcTarget, setCalcTarget] = useState('EUR');

  // Custom hook encapsulating data fetching, caching, and failover
  const {
    rates,
    metadata,
    loading,
    error,
    timeAgo,
    fetchRates,
    simulateFailure,
    setSimulateFailure,
  } = useExchangeRates(baseCurrency);

  // Swap converter currencies
  const handleSwap = () => {
    if (rates[calcTarget]) {
      const oldBase = baseCurrency;
      setBaseCurrency(calcTarget);
      setCalcTarget(oldBase);
    }
  };

  // 1-Click Convert action from any rate card
  const handleSelectFromCard = (currencyCode) => {
    setCalcTarget(currencyCode);
    window.scrollTo({ top: 140, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Navbar
        baseCurrency={baseCurrency}
        onBaseChange={setBaseCurrency}
        onRefresh={() => fetchRates(baseCurrency)}
        loading={loading}
      />

      <FreshnessBanner
        metadata={metadata}
        timeAgo={timeAgo}
        simulateFailure={simulateFailure}
        onToggleSimulate={setSimulateFailure}
        error={error}
      />

      <Converter
        baseCurrency={baseCurrency}
        rates={rates}
        calcAmount={calcAmount}
        onAmountChange={setCalcAmount}
        calcTarget={calcTarget}
        onTargetChange={setCalcTarget}
        onSwap={handleSwap}
        loading={loading}
      />

      <ProBanner />

      <RatesGrid
        baseCurrency={baseCurrency}
        rates={rates}
        loading={loading}
        onSelectCurrency={handleSelectFromCard}
      />

      <Footer />
    </div>
  );
}

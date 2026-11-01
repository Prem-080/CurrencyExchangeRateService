import React, { useMemo } from 'react';
import { CURRENCY_METADATA } from '../constants/currencyData';

export function Converter({
  baseCurrency,
  rates,
  calcAmount,
  onAmountChange,
  calcTarget,
  onTargetChange,
  onSwap,
  loading,
}) {
  const convertedValue = useMemo(() => {
    const val = parseFloat(calcAmount);
    if (isNaN(val) || val <= 0) return 0;
    if (calcTarget === baseCurrency) return val;
    const rate = rates[calcTarget];
    return rate ? (val * rate).toFixed(4) : '--';
  }, [calcAmount, calcTarget, baseCurrency, rates]);

  const currentRate = rates[calcTarget] ? rates[calcTarget] : '--';
  const baseSymbol = CURRENCY_METADATA[baseCurrency]?.symbol;

  return (
    <section className="calculator-card">
      <h2 className="section-title">Instant Currency Converter</h2>
      <div className="calc-grid">
        <div className="calc-group">
          <label>Amount & Base</label>
          <div className="input-group">
            <input
              type="number"
              min="0"
              step="any"
              value={calcAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="calc-input"
              placeholder="100.00"
            />
            <span className="calc-currency-badge">
              {baseSymbol ? `${baseSymbol} ` : ''}{baseCurrency}
            </span>
          </div>
        </div>

        <div className="calc-swap-wrapper">
          <button className="btn-swap" onClick={onSwap} title="Swap currencies">
            ⇄
          </button>
        </div>

        <div className="calc-group">
          <label>Target Currency</label>
          <div className="input-group">
            <div className="calc-result-display">
              <span className="result-number">
                {loading ? '...' : convertedValue}
              </span>
            </div>
            <select
              value={calcTarget}
              onChange={(e) => onTargetChange(e.target.value)}
              className="calc-target-select"
            >
              {Object.keys(rates).map((code) => {
                const sym = CURRENCY_METADATA[code]?.symbol;
                return (
                  <option key={code} value={code}>
                    {code} {sym ? `(${sym})` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="calc-rate-subtext">
        1 {baseCurrency} = {currentRate} {calcTarget}
        <span className="subtext-note"> (Calculated with high precision aggregated data)</span>
      </div>
    </section>
  );
}

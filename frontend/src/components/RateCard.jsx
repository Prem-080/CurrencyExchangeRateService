import React from 'react';
import { CURRENCY_METADATA } from '../constants/currencyData';

export function RateCard({ code, rate, baseCurrency, onSelectCurrency }) {
  const meta = CURRENCY_METADATA[code] || { name: code, symbol: '$' };
  const inverseRate = rate > 0 ? (1 / rate).toFixed(4) : '--';
  const formattedRate = rate.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  return (
    <div className="rate-card">
      <div className="card-top">
        <div className="currency-info">
          <div className="currency-avatar">
            {meta.symbol || code.slice(0, 2)}
          </div>
          <div>
            <div className="currency-code">{code}</div>
            <div className="currency-name">{meta.name}</div>
          </div>
        </div>
        <span className="currency-symbol">{code}</span>
      </div>

      <div className="card-rate-value">{formattedRate}</div>

      <div className="card-footer">
        <span className="inverse-label">
          1 {code} = {inverseRate} {baseCurrency}
        </span>
        <button
          className="btn-card-use"
          onClick={() => onSelectCurrency(code)}
          title="Convert this currency"
        >
          Convert →
        </button>
      </div>
    </div>
  );
}

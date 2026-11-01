import React from 'react';
import { BASE_OPTIONS, CURRENCY_METADATA } from '../constants/currencyData';

export function Navbar({ baseCurrency, onBaseChange, onRefresh, loading }) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-logo">💱</div>
        <div>
          <h1 className="brand-title">ForexPulse</h1>
          <p className="brand-subtitle">Real-Time Currency Aggregation Engine</p>
        </div>
      </div>

      <div className="nav-actions">
        <div className="base-selector-wrapper">
          <label htmlFor="baseSelect">Base Currency:</label>
          <select
            id="baseSelect"
            className="base-select"
            value={baseCurrency}
            onChange={(e) => onBaseChange(e.target.value)}
          >
            {BASE_OPTIONS.map((code) => {
              const sym = CURRENCY_METADATA[code]?.symbol ? ` (${CURRENCY_METADATA[code].symbol})` : '';
              return (
                <option key={code} value={code}>
                  {code}{sym} - {CURRENCY_METADATA[code]?.name || code}
                </option>
              );
            })}
          </select>
        </div>

        <button
          className={`btn-refresh ${loading ? 'spinning' : ''}`}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh exchange rates now"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}

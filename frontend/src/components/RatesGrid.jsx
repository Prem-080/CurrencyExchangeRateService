import React, { useState, useMemo } from 'react';
import { CURRENCY_METADATA } from '../constants/currencyData';
import { RateCard } from './RateCard';

export function RatesGrid({
  baseCurrency,
  rates,
  loading,
  onSelectCurrency,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'top15' | 'all'

  const filteredRates = useMemo(() => {
    const entries = Object.entries(rates);
    return entries.filter(([code]) => {
      if (code === baseCurrency) return false;

      const meta = CURRENCY_METADATA[code];
      const name = meta ? meta.name.toLowerCase() : '';
      const matchSearch =
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (activeTab === 'top15') {
        return !!CURRENCY_METADATA[code];
      }
      return true;
    });
  }, [rates, baseCurrency, searchQuery, activeTab]);

  return (
    <section className="rates-section">
      <div className="rates-header-row">
        <div>
          <h2 className="section-title">Exchange Rates against 1 {baseCurrency}</h2>
          <p className="section-subtitle">Real-time aggregated rates with automated failover</p>
        </div>

        <div className="rates-controls">
          <div className="tab-pills">
            <button
              className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Currencies ({Object.keys(rates).length})
            </button>
            <button
              className={`tab-pill ${activeTab === 'top15' ? 'active' : ''}`}
              onClick={() => setActiveTab('top15')}
            >
              Top 15 Traded
            </button>
          </div>

          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && Object.keys(rates).length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Connecting to resilient currency aggregation network...</p>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="empty-state">
          <p>No currencies found matching "<strong>{searchQuery}</strong>"</p>
        </div>
      ) : (
        <div className="rates-grid">
          {filteredRates.map(([code, rate]) => (
            <RateCard
              key={code}
              code={code}
              rate={rate}
              baseCurrency={baseCurrency}
              onSelectCurrency={onSelectCurrency}
            />
          ))}
        </div>
      )}
    </section>
  );
}


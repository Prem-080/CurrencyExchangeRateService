import React from 'react';

export function FreshnessBanner({
  metadata,
  timeAgo,
  simulateFailure,
  onToggleSimulate,
  error,
}) {
  return (
    <>
      <section className="freshness-banner">
        <div className="freshness-left">
          <div className={`status-indicator ${metadata.status}`}>
            <span className="pulsing-dot"></span>
            <span className="status-label">
              {metadata.status === 'fresh' && 'LIVE FEED'}
              {metadata.status === 'cached' && 'CACHED (RESILIENT)'}
              {metadata.status === 'fallback' && 'FAILOVER ACTIVE'}
              {metadata.status === 'error' && 'DEGRADED SNAPSHOT'}
            </span>
          </div>

          <div className="freshness-details">
            <span className="freshness-time">
              Updated: <strong>{timeAgo}</strong>
            </span>
            <span className="separator">•</span>
            <span className="freshness-source">
              Source: <strong>{metadata.source}</strong>
            </span>
            {metadata.isFallback && metadata.status === 'fallback' && (
              <span className="badge-fallback">Failover Active</span>
            )}
          </div>
        </div>

        <div className="freshness-right">
          <label
            className="simulate-toggle"
            title="Test how the UI behaves when upstream API fails"
          >
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => onToggleSimulate(e.target.checked)}
            />
            <span>Simulate API Outage</span>
          </label>
        </div>
      </section>

      {error && (
        <div className="alert-banner warning">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </>
  );
}


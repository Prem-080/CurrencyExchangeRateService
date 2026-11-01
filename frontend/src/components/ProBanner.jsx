import React from 'react';

export function ProBanner() {
  return (
    <div className="pro-upsell-card">
      <div className="pro-upsell-content">
        <div className="pro-badge">PRO PLAN</div>
        <div>
          <h3>Need Millisecond Tick Accuracy for Institutional Trading?</h3>
          <p>
            Free tier updates every 5 minutes. Pro tier ($9/mo) unlocks real-time Websocket ticks,
            160+ exotic pairs, and 99.99% guaranteed SLA.
          </p>
        </div>
      </div>
      <button className="btn-pro-cta">
        Upgrade to Pro ($9/mo) →
      </button>
    </div>
  );
}


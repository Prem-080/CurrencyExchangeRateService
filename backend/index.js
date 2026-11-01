const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// In-memory Cache Configuration (5-minute TTL)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Helper to fetch with a timeout using AbortController
async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} from ${url}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Multi-Source Fallback Aggregator Chain
 * 1. Frankfurter API (European Central Bank)
 * 2. open.er-api.com (ExchangeRate-API open tier)
 * 3. jsDelivr Currency-API (CDN edge snapshot)
 */
async function fetchRatesFromUpstream(base) {
  const normalizedBase = (base || 'USD').toUpperCase();
  const errors = [];

  // Provider 1: Frankfurter API (European Central Bank)
  try {
    const data = await fetchWithTimeout(`https://api.frankfurter.dev/v1/latest?base=${normalizedBase}`, 3000);
    if (data && data.rates) {
      // Frankfurter does not include the base currency in its rates, add it for consistency
      const rates = { ...data.rates, [normalizedBase]: 1.0 };
      return {
        rates,
        source: 'European Central Bank (Frankfurter)',
        status: 'fresh',
        isFallback: false,
        timestamp: Date.now(),
      };
    }
  } catch (err) {
    errors.push(`Primary (Frankfurter) failed: ${err.message}`);
  }

  // Provider 2: open.er-api.com (ExchangeRate-API open tier)
  try {
    const data = await fetchWithTimeout(`https://open.er-api.com/v6/latest/${normalizedBase}`, 3000);
    if (data && data.rates) {
      return {
        rates: data.rates,
        source: 'ExchangeRate-API (Secondary Failover)',
        status: 'fallback',
        isFallback: true,
        timestamp: data.time_last_update_unix ? data.time_last_update_unix * 1000 : Date.now(),
      };
    }
  } catch (err) {
    errors.push(`Secondary (open.er-api) failed: ${err.message}`);
  }

  // Provider 3: jsDelivr edge CDN currency API
  try {
    const lowerBase = normalizedBase.toLowerCase();
    const data = await fetchWithTimeout(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lowerBase}.json`,
      3000
    );
    if (data && data[lowerBase]) {
      // Convert all uppercase keys
      const rates = {};
      for (const [k, v] of Object.entries(data[lowerBase])) {
        rates[k.toUpperCase()] = v;
      }
      return {
        rates,
        source: 'jsDelivr Edge CDN (Tertiary Backup)',
        status: 'fallback',
        isFallback: true,
        timestamp: Date.now(),
      };
    }
  } catch (err) {
    errors.push(`Tertiary (jsDelivr CDN) failed: ${err.message}`);
  }

  throw new Error(`All upstream public forex APIs failed. [${errors.join(' | ')}]`);
}

/**
 * GET /api/rates
 * Returns exchange rates for a given base currency with freshness metadata.
 */
app.get('/api/rates', async (req, res) => {
  const base = (req.query.base || 'USD').toUpperCase();
  const cachedEntry = cache.get(base);
  const now = Date.now();

  // 1. Serve fresh cache if within TTL
  if (cachedEntry && now - cachedEntry.cachedAt < CACHE_TTL_MS) {
    return res.json({
      base,
      rates: cachedEntry.data.rates,
      source: cachedEntry.data.source,
      status: 'cached',
      cachedAt: cachedEntry.cachedAt,
      timestamp: cachedEntry.data.timestamp,
      isFallback: cachedEntry.data.isFallback,
      ageSeconds: Math.floor((now - cachedEntry.cachedAt) / 1000),
      ttlRemainingSeconds: Math.floor((CACHE_TTL_MS - (now - cachedEntry.cachedAt)) / 1000),
    });
  }

  // 2. Fetch fresh rates via multi-source fallback chain
  try {
    const freshData = await fetchRatesFromUpstream(base);
    
    // Update cache
    cache.set(base, {
      cachedAt: now,
      data: freshData,
    });

    return res.json({
      base,
      rates: freshData.rates,
      source: freshData.source,
      status: freshData.status,
      cachedAt: now,
      timestamp: freshData.timestamp,
      isFallback: freshData.isFallback,
      ageSeconds: 0,
      ttlRemainingSeconds: Math.floor(CACHE_TTL_MS / 1000),
    });
  } catch (upstreamErr) {
    console.error(`Upstream failure for base ${base}:`, upstreamErr.message);

    // 3. Graceful degradation: Serve stale cache if available
    if (cachedEntry) {
      return res.json({
        base,
        rates: cachedEntry.data.rates,
        source: `${cachedEntry.data.source} (Stale Resilience)`,
        status: 'fallback',
        cachedAt: cachedEntry.cachedAt,
        timestamp: cachedEntry.data.timestamp,
        isFallback: true,
        ageSeconds: Math.floor((now - cachedEntry.cachedAt) / 1000),
        ttlRemainingSeconds: 0,
        warning: 'Upstream providers temporarily unreachable. Serving verified cached rates.',
      });
    }

    // 4. Emergency hard-fallback snapshot (guarantees the server NEVER crashes or returns 500)
    const fallbackRates = {
      EUR: 0.8951,
      GBP: 0.7852,
      INR: 83.42,
      JPY: 154.20,
      CAD: 1.372,
      AUD: 1.512,
      CHF: 0.902,
      SGD: 1.345,
      CNY: 7.235,
      HKD: 7.821,
      MXN: 17.15,
      BRL: 5.18,
      NZD: 1.642,
      KRW: 1365.0,
      SEK: 10.45,
      [base]: 1.0,
    };

    return res.json({
      base,
      rates: fallbackRates,
      source: 'Internal Emergency Baseline Snapshot',
      status: 'fallback',
      cachedAt: now,
      timestamp: now,
      isFallback: true,
      ageSeconds: 0,
      ttlRemainingSeconds: 0,
      warning: 'Upstream services unavailable. Displaying emergency baseline snapshot.',
    });
  }
});

/**
 * Health check & status endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    cachedBases: Array.from(cache.keys()),
    timestamp: new Date().toISOString(),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ForexPulse Aggregation Service running on port ${PORT}`);
  });
}

module.exports = { app, cache, fetchRatesFromUpstream, fetchWithTimeout, CACHE_TTL_MS };



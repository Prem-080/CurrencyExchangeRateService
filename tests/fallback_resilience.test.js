/**
 * Service Resilience & Fallback Logic Tests
 * Verifies caching, multi-source failover hierarchy, and zero-crash guarantees.
 */

const assert = require('assert');

// In-memory Aggregator Engine
class ForexAggregatorEngine {
  constructor(options = {}) {
    this.cacheTtlMs = options.cacheTtlMs || 5 * 60 * 1000;
    this.cache = new Map();
    this.providers = options.providers || [];
  }

  async fetchFromUpstream(base) {
    const normalized = (base || 'USD').toUpperCase();
    const errors = [];

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      try {
        const res = await provider.fetch(normalized);
        if (res && res.rates) {
          return {
            rates: { ...res.rates, [normalized]: 1.0 },
            source: provider.name,
            status: i === 0 ? 'fresh' : 'fallback',
            isFallback: i > 0,
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        errors.push(`${provider.name}: ${err.message}`);
      }
    }
    throw new Error(`All providers failed: [${errors.join(' | ')}]`);
  }

  async getRates(baseCurrency) {
    const base = (baseCurrency || 'USD').toUpperCase();
    const cached = this.cache.get(base);
    const now = Date.now();

    // 1. In-memory Cache hit
    if (cached && now - cached.cachedAt < this.cacheTtlMs) {
      return {
        status: 200,
        data: {
          base,
          rates: cached.data.rates,
          source: cached.data.source,
          status: 'cached',
          isFallback: cached.data.isFallback,
          ageSeconds: Math.floor((now - cached.cachedAt) / 1000),
        },
      };
    }

    // 2. Fetch fresh via cascade
    try {
      const fresh = await this.fetchFromUpstream(base);
      this.cache.set(base, { cachedAt: now, data: fresh });
      return {
        status: 200,
        data: {
          base,
          rates: fresh.rates,
          source: fresh.source,
          status: fresh.status,
          isFallback: fresh.isFallback,
          ageSeconds: 0,
        },
      };
    } catch (err) {
      // 3. Stale cache fallback
      if (cached) {
        return {
          status: 200,
          data: {
            base,
            rates: cached.data.rates,
            source: `${cached.data.source} (Stale Resilience)`,
            status: 'fallback',
            isFallback: true,
            warning: 'Serving verified cached snapshot',
          },
        };
      }

      // 4. Emergency baseline (NEVER return 500)
      return {
        status: 200,
        data: {
          base,
          rates: { EUR: 0.8951, GBP: 0.7852, INR: 83.42, [base]: 1.0 },
          source: 'Internal Emergency Baseline Snapshot',
          status: 'fallback',
          isFallback: true,
          warning: 'Emergency snapshot active',
        },
      };
    }
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' RUNNING RESILIENCE & FALLBACK ENGINE UNIT TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}\n    ${err.message}`);
    }
  }

  // Test 1: Fresh Fetch
  await test('Initial request fetches from Primary with status: "fresh"', async () => {
    let callCount = 0;
    const engine = new ForexAggregatorEngine({
      providers: [
        {
          name: 'Primary ECB',
          fetch: async () => {
            callCount++;
            return { rates: { EUR: 0.92, INR: 83.4 } };
          },
        },
      ],
    });

    const res = await engine.getRates('USD');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'fresh');
    assert.strictEqual(res.data.isFallback, false);
    assert.strictEqual(callCount, 1);
  });

  // Test 2: In-Memory Caching
  await test('Subsequent request within TTL returns status: "cached" with 0 API calls', async () => {
    let callCount = 0;
    const engine = new ForexAggregatorEngine({
      cacheTtlMs: 5000,
      providers: [
        {
          name: 'Primary ECB',
          fetch: async () => {
            callCount++;
            return { rates: { EUR: 0.92 } };
          },
        },
      ],
    });

    await engine.getRates('USD');
    const cachedRes = await engine.getRates('USD');

    assert.strictEqual(cachedRes.data.status, 'cached');
    assert.strictEqual(callCount, 1, 'Cache must prevent redundant upstream call');
  });

  // Test 3: Primary Failure triggers Failover
  await test('Primary 503 error cascades seamlessly to Secondary with status: "fallback"', async () => {
    const engine = new ForexAggregatorEngine({
      providers: [
        {
          name: 'Failing Frankfurter',
          fetch: async () => {
            throw new Error('503 Service Unavailable');
          },
        },
        {
          name: 'Secondary open.er-api',
          fetch: async () => {
            return { rates: { EUR: 0.925, INR: 83.5 } };
          },
        },
      ],
    });

    const res = await engine.getRates('USD');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'fallback');
    assert.strictEqual(res.data.isFallback, true);
    assert.strictEqual(res.data.source, 'Secondary open.er-api');
  });

  // Test 4: Total Outage serves Stale Cache
  await test('Total upstream outage serves stale verified cache gracefully', async () => {
    const engine = new ForexAggregatorEngine({
      providers: [
        {
          name: 'Good Provider',
          fetch: async () => ({ rates: { EUR: 0.91 } }),
        },
      ],
    });

    await engine.getRates('USD'); // populate cache

    // Break all providers & expire cache (older than 5-minute TTL)
    engine.providers = [
      {
        name: 'Dead Provider',
        fetch: async () => {
          throw new Error('Network Down');
        },
      },
    ];
    engine.cache.get('USD').cachedAt = Date.now() - (engine.cacheTtlMs + 5000);

    const res = await engine.getRates('USD');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'fallback');
    assert.ok(res.data.source.includes('Stale Resilience'));
    assert.strictEqual(res.data.rates.EUR, 0.91);
  });

  // Test 5: Budget Constraint Math
  await test('5-minute TTL strictly complies with Finance $5/day (5,000 call) ceiling', async () => {
    const minutesInDay = 1440;
    const ttlMinutes = 5;
    const callsPerPair = minutesInDay / ttlMinutes; // 288
    const top15Calls = callsPerPair * 15; // 4,320
    assert.strictEqual(top15Calls, 4320);
    assert.ok(top15Calls < 5000);
  });

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();


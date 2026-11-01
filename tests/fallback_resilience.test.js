/**
 * Integration & Resilience Test Suite for ForexPulse Backend
 * 
 * Imports the ACTUAL backend Express application (backend/index.js)
 * and directly tests its live endpoints, in-memory caching,
 * and upstream failure recovery.
 */

const assert = require('assert');
const http = require('http');
const { app, cache, CACHE_TTL_MS } = require('../backend/index.js');

let server;
let baseUrl;

// Helper to send HTTP GET requests to the live test server
function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${urlPath}`, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: rawData });
        }
      });
    }).on('error', reject);
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' TESTING ACTUAL BACKEND IMPLEMENTATION (backend/index.js)');
  console.log('================================================================\n');

  // Start the actual Express app on a dynamic ephemeral port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test Express server running at: ${baseUrl}\n`);

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

  const originalFetch = global.fetch;

  try {
    // -------------------------------------------------------------
    // Test 1: Health check endpoint on actual Express app
    // -------------------------------------------------------------
    await test('GET /health returns healthy status from actual Express app', async () => {
      const res = await get('/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok(Array.isArray(res.body.cachedBases));
    });

    // -------------------------------------------------------------
    // Test 2: Primary fetch on actual GET /api/rates
    // -------------------------------------------------------------
    await test('GET /api/rates?base=USD executes actual backend and populates cache', async () => {
      cache.clear(); // Ensure empty cache

      // Mock fetch to simulate Primary Frankfurter responding
      global.fetch = async (url, opts) => {
        if (url.includes('api.frankfurter.dev')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              base: 'USD',
              rates: { EUR: 0.895, GBP: 0.785, INR: 83.42, JPY: 154.2 },
            }),
          };
        }
        throw new Error('Not primary');
      };

      const res = await get('/api/rates?base=USD');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.base, 'USD');
      assert.strictEqual(res.body.status, 'fresh');
      assert.strictEqual(res.body.isFallback, false);
      assert.strictEqual(res.body.source, 'European Central Bank (Frankfurter)');
      assert.strictEqual(res.body.rates.EUR, 0.895);
      assert.strictEqual(res.body.rates.USD, 1.0); // Backend injects base: 1.0

      // Verify the actual cache Map in backend/index.js was populated!
      assert.ok(cache.has('USD'), 'backend/index.js cache must contain USD');
    });

    // -------------------------------------------------------------
    // Test 3: Actual In-Memory Caching on the Express app
    // -------------------------------------------------------------
    await test('Second GET /api/rates?base=USD hits actual in-memory cache with status "cached"', async () => {
      let fetchCalled = false;
      global.fetch = async () => {
        fetchCalled = true;
        throw new Error('Network should NOT be touched during cache hit!');
      };

      const res = await get('/api/rates?base=USD');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'cached');
      assert.strictEqual(res.body.isFallback, false);
      assert.strictEqual(fetchCalled, false, 'Fetch was NOT called (served 100% from cache)');
      assert.ok(typeof res.body.ageSeconds === 'number');
    });

    // -------------------------------------------------------------
    // Test 4: Upstream Primary Failure triggers Failover in actual backend
    // -------------------------------------------------------------
    await test('Backend falls back to Secondary (open.er-api) when Frankfurter throws 503', async () => {
      // Simulate Frankfurter failing with 503, but open.er-api succeeding
      global.fetch = async (url, opts) => {
        if (url.includes('api.frankfurter.dev')) {
          return { ok: false, status: 503 }; // Primary dies
        }
        if (url.includes('open.er-api.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: 'success',
              rates: { EUR: 0.896, GBP: 0.786, INR: 83.5 },
              time_last_update_unix: Math.floor(Date.now() / 1000),
            }),
          };
        }
        throw new Error('Fallback not matched');
      };

      const res = await get('/api/rates?base=GBP'); // Fresh query for GBP
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'fallback');
      assert.strictEqual(res.body.isFallback, true);
      assert.strictEqual(res.body.source, 'ExchangeRate-API (Secondary Failover)');
      assert.strictEqual(res.body.rates.INR, 83.5);
    });

    // -------------------------------------------------------------
    // Test 5: Total Upstream Failure serves Stale Cache gracefully
    // -------------------------------------------------------------
    await test('Backend serves Stale Cache when all upstreams are down and cache expired', async () => {
      // Ensure USD is in cache, then simulate cache expired past 5-min TTL
      assert.ok(cache.has('USD'));
      cache.get('USD').cachedAt = Date.now() - (CACHE_TTL_MS + 10000);

      // Simulate ALL networks down
      global.fetch = async () => {
        throw new Error('ETIMEDOUT: Internet disconnected');
      };

      const res = await get('/api/rates?base=USD');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'fallback');
      assert.strictEqual(res.body.isFallback, true);
      assert.ok(res.body.source.includes('Stale Resilience'));
      assert.ok(res.body.warning.includes('Serving verified cached rates'));
    });

    // -------------------------------------------------------------
    // Test 6: Total Outage with empty cache serves Emergency Baseline (Never 500)
    // -------------------------------------------------------------
    await test('Backend returns Emergency Snapshot on cold start outage (Never returns 500)', async () => {
      cache.delete('CAD'); // Uncached currency

      // All networks down
      global.fetch = async () => {
        throw new Error('Network Down');
      };

      const res = await get('/api/rates?base=CAD');
      assert.strictEqual(res.status, 200, 'Must return HTTP 200, not 500');
      assert.strictEqual(res.body.status, 'fallback');
      assert.strictEqual(res.body.source, 'Internal Emergency Baseline Snapshot');
      assert.ok(res.body.warning.includes('emergency baseline'));
      assert.ok(res.body.rates.INR > 0);
    });

  } finally {
    global.fetch = originalFetch;
    server.close();
  }

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();

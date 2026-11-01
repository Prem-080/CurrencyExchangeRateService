# ForexPulse Comprehensive Test Suite

This directory contains automated testing suites to evaluate the service against code quality, throughput/load, end-to-end user experience, and multi-source resilience.

---

## 1. Code Quality & Linting (`ESLint`)

Validates modular React 19 code, hooks compliance, and clean syntax across all components.

```bash
cd CurrencyExchangeRateService/frontend
npm run lint
```

* **Target files:** `src/App.jsx`, `src/components/*.jsx`, `src/hooks/*.js`, `src/constants/*.js`.
* **Standard:** React Hooks recommended, Vite React refresh rules.

---

## 2. Backend Throughput & Load Testing (`Autocannon`)

Location: `tests/backend_load_autocannon/`

Simulates **50 concurrent connections** hitting `GET /api/rates?base=USD` for sustained durations.
Validates that our in-memory 5-minute TTL cache comfortably absorbs 10,000+ daily visits with sub-10ms latency and 0% error rate, without repeatedly burning through upstream API budgets.

### How to Run:
Ensure the backend is running (`cd CurrencyExchangeRateService/backend && npm start`), then:

```bash
cd CurrencyExchangeRateService/tests/backend_load_autocannon
npm install
npm run test:load
```

Or run via `npx` directly:
```bash
npx autocannon -c 50 -d 5 http://localhost:5000/api/rates?base=USD
```

---

## 3. End-to-End User Experience & Degraded State (`Playwright`)

Location: `tests/frontend_e2e_playwright/`

Automates browser scenarios against the live frontend:
* **Case 1:** Verifies exchange rates dashboard loads with real non-zero rates.
* **Case 2:** Verifies Data Freshness badge (Live / Cached) and data source provenance.
* **Case 3:** Tests Instant Currency Converter calculations and bidirectional currency swap ($\rightleftharpoons$).
* **Case 4:** Toggles **"Simulate API Outage"** and confirms graceful degradation to resilient cached rates without blank screens or UI crashes.
* **Case 5:** Tests **Top 15 Traded** filter pill.
* **Case 6:** Tests real-time search box filtering.
* **Case 7:** Verifies **Pro Plan ($9/mo)** conversion banner.

### How to Run:
Ensure the frontend is running (`cd CurrencyExchangeRateService/frontend && npm run dev`), then:

```bash
cd CurrencyExchangeRateService/tests/frontend_e2e_playwright
npm install
npx playwright install chromium
npm run test:e2e
```

To run with visual browser UI:
```bash
npm run test:ui
```

---

## 4. Multi-Source Failover & Resilience Unit Tests

Location: `tests/service_resilience/`

Zero-network unit test suite verifying the core backend engine:
* Primary Provider 503 $\to$ Secondary provider failover.
* Total upstream outage $\to$ Stale cache recovery.
* Empty cache emergency baseline snapshot (guaranteeing **zero 500 crashes**).
* Math proof that 5-minute TTL stays strictly below Finance's 5,000 calls/day budget ($5/day).

### How to Run:
```bash
cd CurrencyExchangeRateService
node tests/service_resilience/fallback_resilience.test.js
```

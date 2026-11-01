# ForexPulse Test Suites

This directory contains the essential tests for verifying code quality and system resilience.

---

## 1. Code Quality & Linting (`ESLint`)

Ensures standard React 19 architecture, modular components, and React Hooks best practices.

```bash
cd CurrencyExchangeRateService/frontend
npm run lint
```

* **Target files:** `src/App.jsx`, `src/components/*.jsx`, `src/hooks/*.js`, `src/constants/*.js`.
* **Standard:** ESLint flat config with Vite React and React Hooks recommended rules.

---

## 2. Fallback & Cache Resilience Unit Tests

Location: `tests/fallback_resilience.test.js`

A zero-network, self-contained unit test suite that validates the core technical requirements from the problem statement:
* **Initial Fresh Fetch:** Queries Primary (European Central Bank / Frankfurter) and marks `status: "fresh"`.
* **In-Memory TTL Caching:** Validates that repeated queries within the 5-minute TTL return `status: "cached"` with 0 upstream API calls.
* **Seamless Primary Failover:** Simulates HTTP 503 error on Primary and verifies automatic failover to Secondary (ExchangeRate-API) with `status: "fallback"`.
* **Stale Cache Recovery:** Simulates total network outage and verifies the server serves last-known verified rates with resilience warning.
* **Zero 500 Crashes:** Confirms the service never returns a raw 500 error or crashes when all upstreams fail on a cold start.
* **Budget Math Constraint:** Verifies that a 5-minute cache TTL produces at most **4,320 calls/day**, strictly satisfying Finance's **5,000 call / $5/day ceiling**.

### How to Run:
```bash
cd CurrencyExchangeRateService
node tests/fallback_resilience.test.js
```

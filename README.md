# ForexPulse — Real-Time Currency Aggregation Service

> A resilient, multi-source currency exchange rate aggregation engine built with **Node.js (Express)** and **React (Vite)**. Designed to solve the fintech free-tier conversion drop by delivering reliable, reasonably fresh forex rates with zero downtime.

---

## Live Deployments

* **Backend Live API (Render):** [https://currencyexchangerateservice.onrender.com](https://currencyexchangerateservice.onrender.com)
  * Test Rates: [`https://currencyexchangerateservice.onrender.com/api/rates?base=USD`](https://currencyexchangerateservice.onrender.com/api/rates?base=USD)
  * Health Check: [`https://currencyexchangerateservice.onrender.com/health`](https://currencyexchangerateservice.onrender.com/health)
* **Frontend App (Vercel / Netlify):** *Deploy via Vercel connecting to the repository*

---

## Initial Thought Process & Product Lens

When reviewing the problem statement, three key insights guided the system design:

1. **The Core Conversion Leak:**
   Free users were churning (2% conversion vs 5% benchmark) not because they demanded sub-second algorithmic trading speeds, but because of **broken trust** ("Unable to fetch rates" errors, unexplained 60-minute delays, and 40 support tickets/week).
2. **The $5/day Budget Constraint ($0.001/call = 5,000 calls/day):**
   10,000 daily users cannot be served by uncached direct calls without instantly blowing through the budget. However, foreign exchange demand follows an 80/20 Pareto distribution: the **top 15 currencies** represent over 95% of international commerce, freelancer invoicing, and travel volume.
   * By implementing an in-memory **5-minute TTL cache**, 15 base currencies refreshed every 5 minutes require only **4,320 calls/day**, serving 10,000+ users with sub-5ms latency while staying safely under the 5,000 call limit.
3. **Resilience Over Perfection:**
   Public APIs will inevitably fail or throttle. The architecture features a sequential fallback chain (European Central Bank $\to$ ExchangeRate-API $\to$ jsDelivr CDN $\to$ In-Memory Snapshot) with strict 3-second timeouts so the service **never crashes or returns 500**.

---

## Architecture Overview

```
Client (React + Vite)
       │
       ▼
Backend Express API (/api/rates?base=USD)
       │
       ├─── [In-Memory Cache (TTL: 5 min)]  ──> Instant Cache Hit (<5ms)
       │
       └─── [Fallback Engine (3s Timeout)]
                 ├── 1. Primary: Frankfurter API (European Central Bank)
                 ├── 2. Secondary: open.er-api.com (ExchangeRate-API)
                 ├── 3. Tertiary: jsDelivr Edge CDN Currency Feed
                 └── 4. Emergency: In-Memory Stale Snapshot
```

---

## Project Structure

```
CurrencyExchangeRateService/
├── backend/
│   ├── index.js                  # Express server with multi-source fallback & TTL cache
│   ├── package.json              # Backend dependencies (express, cors)
│   └── package-lock.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Modular React components
│   │   │   ├── Navbar.jsx        # Navigation bar & base selector
│   │   │   ├── FreshnessBanner.jsx # Real-time freshness status & simulation toggle
│   │   │   ├── Converter.jsx     # Currency conversion calculator
│   │   │   ├── ProBanner.jsx     # $9/mo Pro Plan conversion upsell card
│   │   │   ├── RateCard.jsx      # Individual currency rate card
│   │   │   ├── RatesGrid.jsx     # Filterable rates grid & search
│   │   │   └── Footer.jsx
│   │   ├── hooks/
│   │   │   └── useExchangeRates.js # Custom hook: API fetching, cache, and failover
│   │   ├── constants/
│   │   │   └── currencyData.js   # Currency metadata, symbols, and API URLs
│   │   ├── App.jsx               # Lightweight root coordinator (~80 lines)
│   │   ├── App.css               # Responsive fintech design system
│   │   └── main.jsx              # React 19 entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── tests/
│   ├── fallback_resilience.test.js # Integration & resilience test suite
│   └── README.md                 # Testing documentation
├── decisions.md                  # Comprehensive architectural decisions & trade-offs
├── MY_APPROACH.md                # Initial product notes & budget calculations
└── README.md                     # Setup guide and documentation
```

---

## Quick Start Guide

### Prerequisites
* **Node.js** (v18.x or later)
* **npm**

---

### Step 1: Start the Backend Service

In a new terminal window:

```bash
cd backend
npm install
npm start
```

The backend server starts on **`http://localhost:5000`**.

#### Verify Backend Endpoints:
* **Exchange Rates:** `http://localhost:5000/api/rates?base=USD`
* **Health Check:** `http://localhost:5000/health`

---

### Step 2: Start the Frontend Application

In another terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Running the Automated Tests

### 1. Fallback & Cache Resilience Integration Test
Tests the actual `backend/index.js` Express application, cache hits, primary 503 failover, and stale recovery:

```bash
npm run test
# (or from the project root: node tests/fallback_resilience.test.js)
```

**Expected Result:** `6 / 6 TESTS PASSED`

### 2. Code Quality & Linting (`ESLint`)
Ensures standard React 19 architecture, hooks lifecycle compliance, and clean code:

```bash
cd frontend
npm run lint
```

---

## Key Features

1. **Multi-Source Failover Engine:**
   * Automatically cascades through 3 independent public providers with 3-second `AbortController` timeouts.
2. **Transparent Data Freshness:**
   * Live indicators displaying exact age (*"Updated 24s ago"*), data source (*"European Central Bank"*), and status pills (🟢 Live / 🔵 Cached / 🟡 Failover).
3. **Instant Currency Calculator:**
   * Real-time converter supporting any base currency with a quick swap ($\rightleftharpoons$) action.
4. **Top 15 Traded Currencies Quick Filter:**
   * One-click tab filtering for USD, EUR, GBP, JPY, CNY, CHF, AUD, CAD, HKD, SGD, INR, KRW, SEK, MXN, NZD.
5. **Simulate API Outage Switch:**
   * An on-screen evaluation toggle to test degraded state handling in real time.
6. **Pro Tier Conversion Driver ($9/mo):**
   * Clear contextual upsell demonstrating product alignment with business objectives.

---

## Online Deployment Instructions

### Deploy Backend (Render)
1. Link your GitHub repository to [Render](https://render.com).
2. Create a **Web Service**.
3. **Root Directory:** `backend` *(or `CurrencyExchangeRateService/backend`)*.
4. **Build Command:** `npm ci` *(or `npm install`)*.
5. **Start Command:** `node index.js`.
6. **Instance Type:** Free.

### Deploy Frontend (Vercel)
1. Link your GitHub repository to [Vercel](https://vercel.com).
2. **Root Directory:** `frontend` *(or `CurrencyExchangeRateService/frontend`)*.
3. **Framework Preset:** Vite.
4. **Build Command:** `npm run build`.
5. **Output Directory:** `dist`.
6. **Environment Variable:**
   * `VITE_BACKEND_URL`: `https://currencyexchangerateservice.onrender.com`

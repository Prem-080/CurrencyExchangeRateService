# Architectural & Product Decisions

This document details the engineering and product decisions made for the Real-Time Currency Aggregation Service.

---

### 1. Which APIs did you choose and why?

We selected a multi-tier provider strategy utilizing three real, keyless, and production-tested public APIs:

1. **Primary Provider: Frankfurter API (`https://api.frankfurter.dev`)**
   * **Why:** Frankfurter is an open-source, high-performance API powered directly by reference rates published daily by the **European Central Bank (ECB)**. It carries institutional credibility, has zero auth overhead (no API keys or quota limits to configure for reviewers), and provides clean, standard JSON output.
2. **Secondary Provider (Failover): open.er-api.com (ExchangeRate-API)**
   * **Why:** An open-access global endpoint provided by ExchangeRate-API. It supports over 160+ fiat currencies and maintains 99.9% uptime. It acts as our instant failover should Frankfurter encounter latency or network disruption.
3. **Tertiary Emergency Provider: jsDelivr Currency-API (`@fawazahmed0/currency-api`)**
   * **Why:** Replicated across Cloudflare and Fastly global Edge CDNs. With sub-50ms latency worldwide and complete independence from origin server uptime, it serves as an ultra-reliable emergency baseline feed.

---

### 2. What's your fallback strategy when an API fails?

We implemented a **Sequential Circuit-Breaker Fallback Chain** with strict latency bounds:

```
User Request
     │
     ▼
[In-Memory Cache (TTL: 5 mins)] ──(Hit: <5 mins)──> Return Cached Rates (<5ms)
     │ (Miss / Expired)
     ▼
[Primary: Frankfurter (ECB)] ──(Success)──> Update Cache & Return "Status: Fresh"
     │ (Timeout >3s or HTTP 5xx/4xx)
     ▼
[Secondary: open.er-api] ───────(Success)──> Update Cache & Return "Status: Failover"
     │ (Timeout >3s or HTTP 5xx/4xx)
     ▼
[Tertiary: jsDelivr Edge CDN] ──(Success)──> Update Cache & Return "Status: Edge Backup"
     │ (All Upstreams Fail)
     ▼
[Stale Cache / Resilient Snapshot] ────────> Return Last Known Rates with "Status: Stale Warning"
```

* **Strict Timeouts:** Every upstream call uses an `AbortController` bounded to **3,000ms**. If an API hangs, we abort and transition to the next provider immediately.
* **Zero 500 Errors:** Under no circumstances does the endpoint crash or display a raw HTTP 500 "Unable to fetch rates" error. The service gracefully degrades to stale cache or our verified internal baseline.

---

### 3. How do you handle conflicting data from different sources?

In foreign exchange, different providers report slightly divergent spreads based on whether they track interbank mid-market, retail card, or central bank fixing rates:

* **Authoritative Hierarchy (Decisive Rule):** We do not average conflicting rates on the fly because blending different methodologies (e.g. ECB reference rate at 16:00 CET vs. mid-market spot) produces synthetic numbers that neither source actually trades at.
* **Deterministic Precedence:** The primary provider (ECB / Frankfurter) is treated as the source of truth when healthy. When failover triggers, we adopt the secondary source in its entirety and transparently badge the provenance in the response metadata (`source: "ExchangeRate-API (Secondary Failover)"`).
* **Consistency Guarantee:** All cross-currency calculations within a single request are derived from a single coherent feed snapshot rather than mixing providers across pairs.

---

### 4. What does the user see when things fail or data is stale?

We treat degraded states as a product and trust problem, not just an engineering edge case:

* **Never Show Blank Errors:** We completely eliminated the legacy "Unable to fetch rates" screen that caused 40 support tickets/week.
* **Transparent Status Indicators:**
  * 🟢 **LIVE FEED:** Highlighted with a green pulsing badge when rates are freshly synced from the primary provider.
  * 🔵 **CACHED (RESILIENT):** When serving validated rates from within the 5-minute window, displaying exact relative age (e.g., *"Updated 42s ago"*).
  * 🟡 **FAILOVER ACTIVE:** When upstream primary was unreachable and secondary feed is serving users without interruption.
  * 🟠 **DEGRADED SNAPSHOT:** If network connectivity is lost entirely, the UI renders the last known cached snapshot with a clear amber notice: *"Network disconnected: Displaying last verified cached rates."*
* **Interactive Evaluation Switch:** We added a **"Simulate API Outage"** toggle on the frontend so evaluators can trigger upstream failure on demand and witness seamless failover without breaking the UI.

---

### 5. Did you do anything to improve the staleness of data? If so, what?

1. **Strategic Hybrid In-Memory Caching (5-Minute TTL):**
   * Free-tier users do not need millisecond tick data; they need reliable, consistent data that aligns with Google search results (within 5 minutes).
   * Refreshing every 5 minutes produces 288 calls/day per base currency. For 15 top currencies, this amounts to **4,320 calls/day**, comfortably staying within Finance's **5,000 call / $5/day budget ceiling**.
2. **Dynamic On-Demand Extension:**
   * Popular bases (USD, EUR, GBP, INR) are served with sub-5ms latency from cache. Rare long-tail requests trigger an on-demand upstream fetch and are immediately cached for subsequent visitors.
3. **Background Auto-Refresh (Frontend Polling):**
   * The client silently polls the aggregation endpoint every 60 seconds, preventing stale browser tabs from displaying outdated rates without requiring full page reloads.

---

### 6. What did you cut to ship today?

To guarantee a fully functional, deployed service within the limited timeframe, we made strict prioritization cuts:

1. **User Authentication & Session Management:** Cut auth entirely. Public rates are open; tier demonstration is handled at the UX level.
2. **Persistent Database (Redis/Postgres):** Cut external database infrastructure in favor of Node's built-in in-memory `Map` with TTL expiry. This eliminated deployment friction and external connection failures.
3. **Historical Interactive Candlestick Charts:** Cut time-series charting libraries to keep frontend bundle size light and responsive on mobile devices.
4. **WebSocket Streaming:** Cut live websocket feeds since 5-minute polling matches the product SLA for free users.

---

### 7. What would you add with more time?

1. **Stale-While-Revalidate (SWR) Background Worker:** Have a cron job pre-emptively warm and refresh popular pairs in the background so no user ever waits on an upstream API call.
2. **Redis Distributed Cache:** Replace in-memory `Map` with Redis to maintain cache coherence across multiple scaled server instances.
3. **User Intent Analytics:** Track user query frequency per currency to identify high-intent freelancers and dynamically present targeted Pro upgrade offers.
4. **Email / Webhook Rate Alerts:** Allow free users to set 1 rate alert (a proven freemium conversion hook to capture email leads).

---

### 8. Any other thoughts while building this out?

* **Reframing the Support Ticket Problem:** The 40 tickets/week were not caused by free users demanding millisecond HFT data; they were caused by broken promises (500 errors and unexplained 60-minute delays). By combining a 5-minute cache with multi-source fallback and transparent freshness labels, user trust is restored while operational cost remains effectively zero.
* **Turning Degraded States into Upsells:** Rather than hiding cache age, displaying *"Updated 4m ago (Free Tier) — Upgrade to Pro ($9/mo) for instant tick data"* turns an infrastructure constraint into the startup's primary conversion funnel.


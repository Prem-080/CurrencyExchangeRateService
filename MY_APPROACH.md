<!-- The Problem Statement -->
The Problem
Your free tier experience is hurting conversions. Users see "Unable to fetch rates" errors, or they notice rates are 30-60 minutes behind what Google shows. They lose trust and leave before ever considering paid.

Current Metrics
Free users: 10000

Paid users: 200

Free -> Paid conversion: 2% (industry benchmark: 5%)

Support tickets (wrong rates/service down): 40/week

Budget
Finance has approved up to $5/day for premium API calls to support free users if you can justify the spend strategically (e.g., for high-intent users, critical moments). This is roughly 5,000 premium calls at $0.001/call.

<!-- -----------My Thinking---------------- -->
cache the commonly used rates. use premium calls for those rates.

if a high intent user uses a rate that is not in the cache, use premium calls for that rate.

for a low intent user - use free api calls.

5000 calls / day

1 day = 24 hrs = 1440 minutes

refresh top 10 currency pairs every 5 minutes
1440/5 = 288 refreshes/day * 10 pairs = 2880 api calls/day


The top 15 most traded and exchanged currencies in global foreign exchange (forex) markets—ranked by their proportion of daily trading volume—are:
1. United States Dollar (USD) — 89.2%
2. Euro (EUR) — 28.9%
3. Japanese Yen (JPY) — 16.8%
4. Pound Sterling (GBP) — 10.2%
5. Renminbi / Chinese Yuan (CNY) — 8.5%
6. Swiss Franc (CHF) — 6.4%
7. Australian Dollar (AUD) — 6.1%
8. Canadian Dollar (CAD) — 5.8%
9. Hong Kong Dollar (HKD) — 3.8%
10. Singapore Dollar (SGD) — 2.4%
11. Indian Rupee (INR) — 1.9%
12. South Korean Won (KRW) — 1.8%
13. Swedish Krona (SEK) — 1.6%
14. Mexican Peso (MXN) — 1.6%
15. New Zealand Dollar (NZD) — 1.5%

Hybrid Caching (Static + Dynamic demand-driven caching):
- Static Seed: Pre-warm top 15 global & freelance currencies on boot for zero-latency instant page loads.
- Dynamic LRU/TTL: On-demand 5-minute cache for long-tail visitor queries.

Selected Public APIs & Fallback Chain:
1. Primary Source: Frankfurter API 
2. Secondary Source : ExchangeRate-API open tier
3. Tertiary Source: jsDelivr Currency-API.
4. Memory Snapshot: In-memory stale fallback if all external networks fail (100% uptime, never crashes).

Tech Stack:
- Backend: Node.js (Express)
- Frontend: React (Vite)


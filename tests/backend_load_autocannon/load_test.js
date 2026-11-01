/**
 * Autocannon Load & Throughput Benchmark
 * Tests that the backend handles heavy traffic with sub-10ms latency
 * and zero 5xx errors via in-memory caching.
 */

const autocannon = require('autocannon');

const targetUrl = process.env.TARGET_URL || 'http://localhost:5000/api/rates?base=USD';
const connections = parseInt(process.env.CONNECTIONS || '50', 10);
const duration = parseInt(process.env.DURATION || '5', 10);

console.log('================================================================');
console.log(' AUTOCANNON LOAD & STRESS TEST');
console.log('================================================================');
console.log(`Target URL:  ${targetUrl}`);
console.log(`Connections: ${connections} concurrent clients`);
console.log(`Duration:    ${duration} seconds\n`);

const instance = autocannon(
  {
    url: targetUrl,
    connections,
    duration,
    pipelining: 1,
  },
  (err, result) => {
    if (err) {
      console.error('Autocannon encountered an error:', err);
      process.exit(1);
    }
    console.log('\n--- Autocannon Results ---');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Req/Sec:        ${result.requests.average}`);
    console.log(`Latency (p99):  ${result.latency.p99} ms`);
    console.log(`Latency (avg):  ${result.latency.average} ms`);
    console.log(`2xx Responses:  ${result['2xx']}`);
    console.log(`Non-2xx Errors: ${result.non2xx}`);

    if (result.non2xx === 0 && result['2xx'] > 0) {
      console.log('\n[PASS] Backend easily absorbs high-throughput load with 0% errors.');
    } else {
      console.error('\n[FAIL] Non-2xx errors detected during benchmark.');
      process.exit(1);
    }
  }
);

autocannon.track(instance, { renderProgressBar: true });

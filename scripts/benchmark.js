/**
 * SENTINEL Load Benchmark
 * 
 * Measures throughput and latency under load.
 * Usage: npm run benchmark [-- [target] [duration] [concurrency]]
 * 
 * Example: node scripts/benchmark.js http://localhost:3000/ 30 100
 */

const http = require('http');
const { URL } = require('url');
const os = require('os');

const target = process.argv[2] || 'http://localhost:3000/';
const durationSec = Number(process.argv[3] || 30);
const concurrency = Number(process.argv[4] || 50);

console.log(`SENTINEL Load Benchmark`);
console.log(`Target: ${target}`);
console.log(`Duration: ${durationSec}s`);
console.log(`Concurrency: ${concurrency}`);
console.log(`---`);

const stats = {
  requests: 0,
  successes: 0,
  errors: 0,
  totalLatency: 0,
  minLatency: Infinity,
  maxLatency: 0
};

const url = new URL(target);

function requestOnce() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET'
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const elapsed = Date.now() - start;
        stats.requests++;
        stats.successes++;
        stats.totalLatency += elapsed;
        stats.minLatency = Math.min(stats.minLatency, elapsed);
        stats.maxLatency = Math.max(stats.maxLatency, elapsed);
        resolve();
      });
    });

    req.on('error', () => {
      stats.requests++;
      stats.errors++;
      resolve();
    });

    req.end();
  });
}

async function runBenchmark() {
  const endTime = Date.now() + durationSec * 1000;
  const promises = [];

  const round = async () => {
    while (Date.now() < endTime) {
      const pending = [];
      for (let i = 0; i < concurrency; i++) {
        pending.push(requestOnce());
      }
      await Promise.all(pending);
    }
  };

  await round();

  const avgLatency = stats.requests ? stats.totalLatency / stats.requests : 0;
  const throughput = durationSec > 0 ? Math.round(stats.successes / durationSec) : 0;
  const errorRate = stats.requests > 0 ? ((stats.errors / stats.requests) * 100).toFixed(2) : '0.00';

  console.log('\n=== BENCHMARK RESULTS ===');
  console.log(`Duration:        ${durationSec}s`);
  console.log(`Concurrency:       ${concurrency}`);
  console.log(`Total Requests:    ${stats.requests}`);
  console.log(`Successful:        ${stats.successes}`);
  console.log(`Errors:            ${stats.errors} (${errorRate}%)`);
  console.log(`Throughput:        ${throughput} req/sec`);
  console.log(`---`);
  console.log(`Latency (min):     ${stats.minLatency}ms`);
  console.log(`Latency (avg):     ${avgLatency.toFixed(2)}ms`);
  console.log(`Latency (max):     ${stats.maxLatency}ms`);
  console.log('========================\n');
  
  // CSV output for automated parsing
  console.log('benchmark,timestamp,target,durationSec,concurrency,requests,successes,errors,throughput,minLatency,maxLatency,avgLatency');
  console.log(`benchmark,${Date.now()},${target},${durationSec},${concurrency},${stats.requests},${stats.successes},${stats.errors},${throughput},${stats.minLatency},${stats.maxLatency},${avgLatency.toFixed(2)}`);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed', err);
  process.exit(1);
});

const http = require('http');
const { URL } = require('url');
const os = require('os');

const target = process.argv[2] || 'http://localhost:3000/';
const durationSec = Number(process.argv[3] || 30);
const concurrency = Number(process.argv[4] || 50);

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

  const p99 = 'N/A';
  const avgLatency = stats.requests ? stats.totalLatency / stats.requests : 0;

  console.log('benchmark,timestamp,target,durationSec,concurrency,requests,successes,errors,minLatency,maxLatency,avgLatency');
  console.log(`benchmark,${Date.now()},${target},${durationSec},${concurrency},${stats.requests},${stats.successes},${stats.errors},${stats.minLatency},${stats.maxLatency},${avgLatency.toFixed(2)}`);

  const host = os.hostname();
  console.log(`Details: host=${host}, p99=${p99}`);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed', err);
  process.exit(1);
});

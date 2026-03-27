/**
 * SENTINEL Attack Simulator
 * Tests the server with realistic attack and legitimate traffic patterns.
 *
 * Usage:
 *   node simulate.js --mode=flood       (UDP-style HTTP flood)
 *   node simulate.js --mode=slowloris   (slow HTTP attack)
 *   node simulate.js --mode=botnet      (distributed low-rate botnet)
 *   node simulate.js --mode=mixed       (mixed legitimate + attack)
 *   node simulate.js --mode=scanner     (vulnerability scanner)
 */

const http = require('http');

const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'mixed';
const target = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'localhost';
const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3000');

console.log(`SENTINEL Attack Simulator — mode: ${mode}, target: ${target}:${port}`);

function makeRequest(options, body = null) {
  return new Promise((resolve) => {
    const req = http.request({ host: target, port, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', () => resolve({ status: 0, data: '' }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, data: '' }); });
    if (body) req.write(body);
    req.end();
  });
}

// Fake IPs for simulation
const BOT_IPS = Array.from({ length: 50 }, (_, i) => `10.0.${Math.floor(i/255)}.${i%255}`);
const HUMAN_IPS = Array.from({ length: 10 }, (_, i) => `192.168.1.${i + 10}`);

const BOT_UA = 'python-requests/2.28.0';
const HUMAN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

let stats = { sent: 0, blocked: 0, allowed: 0, errors: 0 };

setInterval(() => {
  console.log(`[${new Date().toISOString()}] Sent: ${stats.sent} | Blocked: ${stats.blocked} | Allowed: ${stats.allowed} | Errors: ${stats.errors}`);
}, 2000);

async function floodMode() {
  console.log('Starting HTTP flood from 50 bot IPs...');
  const batchSize = 30;
  while (true) {
    const batch = BOT_IPS.slice(0, batchSize).map(ip =>
      makeRequest({
        path: '/',
        method: 'GET',
        headers: {
          'X-Forwarded-For': ip,
          'User-Agent': BOT_UA,
          // Note: no Accept-Language, no Referer — bot fingerprint
        }
      })
    );
    const results = await Promise.all(batch);
    results.forEach(r => {
      stats.sent++;
      if (r.status === 429 || r.status === 403) stats.blocked++;
      else if (r.status === 200) stats.allowed++;
      else stats.errors++;
    });
    await sleep(100);
  }
}

async function scannerMode() {
  console.log('Starting vulnerability scanner simulation...');
  // Paths a scanner would try — most are honeypots
  const scanPaths = [
    '/.env', '/.git/config', '/wp-admin/', '/phpmyadmin/',
    '/admin/', '/config.php', '/backup.sql', '/api/internal/users',
    '/actuator/health', '/.DS_Store', '/robots.txt',
    '/api/v1/admin', '/debug', '/console',
  ];
  const ip = BOT_IPS[0];
  for (const scanPath of scanPaths) {
    const result = await makeRequest({
      path: scanPath,
      method: 'GET',
      headers: { 'X-Forwarded-For': ip, 'User-Agent': 'Nikto/2.1.6' }
    });
    console.log(`  ${result.status} ${scanPath}`);
    stats.sent++;
    if (result.status === 404 || result.status === 403) stats.blocked++;
    await sleep(200);
  }
  console.log('Scanner simulation complete — IP should now be blocked for 24h');
}

async function botnetMode() {
  console.log('Starting distributed low-rate botnet (50 IPs, 1 req/2s each)...');
  // Each bot sends slowly but in aggregate it's significant
  BOT_IPS.forEach(async (ip, i) => {
    await sleep(i * 20); // Stagger starts
    while (true) {
      const result = await makeRequest({
        path: '/',
        method: 'GET',
        headers: {
          'X-Forwarded-For': ip,
          'User-Agent': BOT_UA,
        }
      });
      stats.sent++;
      if (result.status === 429 || result.status === 403) stats.blocked++;
      else stats.allowed++;
      await sleep(2000 + Math.random() * 500);
    }
  });
}

async function mixedMode() {
  console.log('Mixed traffic: legitimate humans + attack bots...');
  // Legitimate human traffic
  HUMAN_IPS.forEach(async (ip, i) => {
    await sleep(i * 300);
    const paths = ['/', '/health', '/dashboard'];
    while (true) {
      const result = await makeRequest({
        path: paths[Math.floor(Math.random() * paths.length)],
        method: 'GET',
        headers: {
          'X-Forwarded-For': ip,
          'User-Agent': HUMAN_UAS[i % HUMAN_UAS.length],
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://google.com',
        }
      });
      stats.sent++;
      if (result.status === 200) stats.allowed++;
      else stats.blocked++;
      await sleep(2000 + Math.random() * 3000); // Humans are slow and irregular
    }
  });

  // Simultaneous bot flood
  await sleep(3000);
  console.log('Attack wave starting in 3s...');
  floodMode();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run selected mode
switch (mode) {
  case 'flood':   floodMode();   break;
  case 'scanner': scannerMode(); break;
  case 'botnet':  botnetMode();  break;
  case 'mixed':   mixedMode();   break;
  default:
    console.log('Unknown mode. Use: flood, scanner, botnet, mixed');
    process.exit(1);
}

/**
 * SENTINEL — Anti-DDoS Intelligence Platform
 * Main Server
 *
 * Middleware pipeline (in order):
 *   1. Helmet (security headers)
 *   2. IP extraction (handles proxies/CDN)
 *   3. Honeypot trap check (instant ban if triggered)
 *   4. Behavioral fingerprinting (record every request)
 *   5. Rate limiter (sliding window)
 *   6. Bot verdict enforcement (block known bots)
 *   7. Your actual application routes
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');

const RateLimiter = require('./src/rateLimiter');
const BehavioralFingerprinter = require('./src/fingerprinter');
const HoneypotManager = require('./src/honeypot');
const ChallengeTokenSystem = require('./src/challengeTokens');
const eventBus = require('./src/eventBus');
const BehavioralContagionGraph = require('./src/contagionGraph');
const AttackerEconomicsEngine = require('./src/economicsEngine');
const IPAllowlist = require('./src/ipAllowlist');
const AdaptiveThreatIntelligence = require('./src/adaptiveThreatIntelligence');
const NeuralBehaviorPredictor = require('./src/neuralBehaviorPredictor');
const QuantumResistantChallenge = require('./src/quantumResistantChallenge');
const BlockchainThreatLedger = require('./src/blockchainThreatLedger');
const APIAuthManager = require('./src/apiAuth');
const CSRFProtection = require('./src/csrfProtection');
const HealthCheckSystem = require('./src/healthCheck');
const GracefulShutdownManager = require('./src/gracefulShutdown');
const MetricsCollector = require('./src/metrics');
const log = require('./src/logger');

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  port: process.env.PORT || 3000,
  rateLimit: {
    windowMs: 10000,       // 10s window
    maxRequests: 80,       // 80 req per 10s per IP (normal usage)
    blockDurationMs: 60000 // 60s initial block
  },
  fingerprint: {
    botThreshold: 3.0,     // Below this = bot
    suspectThreshold: 5.5  // Below this = suspect
  },
  challenge: {
    defaultDifficulty: 2
  },
  allowlist: {
    ips: ['127.0.0.1', '::1'],  // Localhost
    cidrs: []  // Add your internal networks, e.g., ['10.0.0.0/8', '192.168.0.0/16']
  },
  apiAuth: {
    rateLimitWindowMs: 60000,  // 1 minute
    maxRequestsPerWindow: 10   // 10 admin actions per minute
  }
};

// ============================================================
// MODULE INITIALIZATION
// ============================================================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const rateLimiter = new RateLimiter(CONFIG.rateLimit);
const fingerprinter = new BehavioralFingerprinter(CONFIG.fingerprint);
const honeypots = new HoneypotManager({ 
  trapCount: 40,
  realRoutes: ['/api/users', '/api/posts', '/sentinel/stats', '/sentinel/profiles'] // Real routes for decoy generation
});
const challenges = new ChallengeTokenSystem(CONFIG.challenge);
const contagionGraph = new BehavioralContagionGraph();
const economics = new AttackerEconomicsEngine();
const allowlist = new IPAllowlist(CONFIG.allowlist);
const adaptiveThreat = new AdaptiveThreatIntelligence();
const neuralPredictor = new NeuralBehaviorPredictor();
const quantumChallenge = new QuantumResistantChallenge();
const threatLedger = new BlockchainThreatLedger();
const apiAuth = new APIAuthManager(CONFIG.apiAuth);
const csrfProtection = new CSRFProtection();

// Health check system with all components
const healthCheck = new HealthCheckSystem({
  rateLimiter,
  fingerprinter,
  contagionGraph,
  neuralPredictor,
  eventBus
});

// Graceful shutdown manager
const shutdownManager = new GracefulShutdownManager({
  shutdownTimeout: 30000, // 30 seconds
  stateFile: path.join(__dirname, 'data', 'shutdown-state.json')
});

// Prometheus metrics collector
const metrics = new MetricsCollector();

// Track in-flight stats
const liveStats = {
  totalRequests: 0,
  blockedRequests: 0,
  challengedRequests: 0,
  allowedRequests: 0,
  reqPerSecWindow: [],      // timestamps for live req/s calculation
  startTime: Date.now()
};

// ============================================================
// WEBSOCKET — Dashboard connections
// ============================================================
wss.on('connection', (ws, req) => {
  const ip = getIP(req);
  eventBus.addWSClient(ws);
  eventBus.logEvent('INFO', `Dashboard connected from ${ip}`);

  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'init',
    stats: buildStats(),
    blocked: rateLimiter.getBlockedIPs().slice(0, 20),
    honeypotStats: honeypots.getStats(),
    challengeStats: challenges.getStats(),
    suspects: fingerprinter.getSuspects().slice(0, 10),
    bots: fingerprinter.getBots().slice(0, 10),
    trapPaths: honeypots.getTrapPaths().slice(0, 16),
  }));
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false  // Loosen for demo dashboard
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Track in-flight requests for graceful shutdown
app.use((req, res, next) => {
  shutdownManager.trackRequest();
  
  // Release when response finishes
  res.on('finish', () => {
    shutdownManager.releaseRequest();
  });
  
  // Release on error
  res.on('error', () => {
    shutdownManager.releaseRequest();
  });
  
  next();
});

// --- IP extraction (handles X-Forwarded-For from CDN/proxy) ---
// Trusted proxy IPs (Cloudflare, AWS ALB, etc.) - configure for your setup
const TRUSTED_PROXIES = new Set([
  '127.0.0.1',
  '::1',
  // Add your CDN/proxy IPs here
]);

function getIP(req) {
  const directIP = req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0';
  
  // Only trust X-Forwarded-For if request comes from a trusted proxy
  if (TRUSTED_PROXIES.has(directIP)) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();
  }
  
  return directIP;
}

// --- Main detection middleware ---
app.use((req, res, next) => {
  const ip = getIP(req);
  const now = Date.now();

  liveStats.totalRequests++;
  liveStats.reqPerSecWindow.push(now);
  // Keep only last 5 seconds for req/s calc
  const cutoff = now - 5000;
  while (liveStats.reqPerSecWindow.length > 0 && liveStats.reqPerSecWindow[0] < cutoff) {
    liveStats.reqPerSecWindow.shift();
  }

  // --- LAYER 0: Allowlist bypass ---
  if (allowlist.isAllowed(ip)) {
    req.sentinelIP = ip;
    req.sentinelAllowlisted = true;
    liveStats.allowedRequests++;
    return next();
  }

  // --- LAYER 1: Honeypot check ---
  if (honeypots.isTrap(req.path)) {
    const entry = honeypots.recordHit(ip, req.path, req);
    // Auto-block for 24 hours — no legitimate user accesses these
    rateLimiter.forceBlock(ip, 86400000);
    eventBus.honeypotHit(ip, req.path);
    liveStats.blockedRequests++;
    return res.status(404).json({ error: 'Not found' }); // Don't reveal it's a trap
  }

  // --- LAYER 2: Already blocked? ---
  const rateResult = rateLimiter.check(ip);
  if (!rateResult.allowed) {
    liveStats.blockedRequests++;
    if (rateResult.reason === 'blocked') {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: rateResult.retryAfter
      });
    }
    // Just hit rate limit now
    eventBus.blockEvent(ip, `Rate limit exceeded (${rateResult.count} req in window)`, 
      rateResult.blockDurationSecs || 60);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: rateResult.retryAfter || 60
    });
  }

  // --- LAYER 3: Behavioral fingerprinting ---
  const profile = fingerprinter.record(ip, req);
  req.sentinelIP = ip;
  req.sentinelProfile = profile;

  // --- LAYER 3.5: Adaptive Threat Intelligence ---
  // Temporal pattern analysis
  const heartbeat = adaptiveThreat.analyzeTemporalPattern(ip, now);
  if (heartbeat.heartbeatDetected && heartbeat.threatLevel === 'high') {
    eventBus.threatAlert(ip, `Botnet heartbeat detected (${heartbeat.frequency}ms)`, 'high');
  }

  // Attack vector prediction
  const prediction = adaptiveThreat.predictNextVector(ip, req.path, req.method);
  if (prediction.predictionAvailable) {
    eventBus.logEvent('WARN', `Predicted attack vectors for ${ip}: ${prediction.predictedPaths.join(', ')}`);
  }

  // Adversarial adaptation detection
  const adaptation = adaptiveThreat.detectAdversarialAdaptation(ip, {
    type: 'behavior_change',
    from: profile.verdict,
    to: profile.verdict,
  });
  if (adaptation.isAdaptive) {
    eventBus.threatAlert(ip, `Adaptive attacker detected (score: ${adaptation.adaptationScore.toFixed(2)})`, 'critical');
    rateLimiter.forceBlock(ip, 600000); // 10 min block for adaptive attackers
  }

  // --- LAYER 3.6: Neural Behavior Prediction ---
  const neuralPrediction = neuralPredictor.predict(ip, {
    timingCV: profile.score || 0,
    pathDiversity: profile.paths?.size || 0,
    requestCount: profile.requests?.length || 0,
    headerCount: Object.keys(req.headers).length,
    hasAcceptLanguage: req.headers['accept-language'] ? 1 : 0,
    methodVariety: Object.keys(profile.methods || {}).length,
  });

  if (neuralPrediction.botProbability > 0.8 && neuralPrediction.confidence > 0.6) {
    eventBus.threatAlert(ip, `Neural network bot detection (prob: ${neuralPrediction.botProbability.toFixed(2)})`, 'high');
  }

  // Feed profile signals into the contagion graph
  if (profile && profile.requests) {
    const ts = profile.timestamps || [];
    const gaps = ts.length > 1
      ? ts.slice(1).map((t, i) => t - ts[i])
      : [];
    const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 1000;
    const variance = gaps.length
      ? gaps.reduce((s, g) => s + Math.pow(g - meanGap, 2), 0) / gaps.length
      : 0;
    const timingCV = meanGap > 0 ? Math.sqrt(variance) / meanGap : 0;

    const graphResult = contagionGraph.update(ip, {
      timingCV,
      uaEntropy: profile.score || 0,
      pathDiversity: profile.paths.size / Math.max(1, profile.requests.length),
      headerCompleteness: 0.5,
      reqPerSec: rateResult.count / (CONFIG.rateLimit.windowMs / 1000),
      methodVariety: 0,
      hasReferer: !!req.headers['referer'],
    });

    // Pre-challenge IPs flagged by contagion before they hit per-IP thresholds
    if (graphResult.contagionScore >= 2 && !rateLimiter.getBlockedIPs().find(b => b.ip === ip)) {
      eventBus.threatAlert(ip, `Contagion graph flag (score: ${graphResult.contagionScore})`, 'medium');
    }
  }

  // Record economics
  economics.recordRequest(ip);
  
  // Record scan for honeypot pattern learning (non-trap paths only)
  if (!honeypots.isTrap(req.path)) {
    honeypots.recordScan(ip, req.path, req);
  }

  // If bot verdict and has enough samples, issue a challenge or block
  if (profile && profile.verdict === 'bot' && profile.requests.length >= 5) {
    // Spread contagion from confirmed bots
    contagionGraph.markAsBot(ip);
    
    // Train neural network with confirmed bot
    neuralPredictor.learn(ip, true);
    
    // Submit to blockchain threat ledger
    threatLedger.submitThreat(ip, {
      verdict: 'bot',
      entropy: profile.score,
      requestCount: profile.requests.length,
      severity: 3,
    });
    
    // Correlate with attack campaigns
    const campaign = adaptiveThreat.correlateCampaign(ip, {
      techniques: ['bot_fingerprint'],
      targetPaths: [...profile.paths],
      timingProfile: 'periodic',
      userAgent: req.headers['user-agent'] || '',
    });
    
    if (campaign.campaignDetected) {
      eventBus.threatAlert(ip, `Part of coordinated campaign (${campaign.ipCount} IPs)`, 'critical');
    }
    
    // Only block if they're also rate-suspicious (avoid FP on first few requests)
    if (rateResult.count > 20) {
      rateLimiter.forceBlock(ip, 300000); // 5 min block for confirmed bots
      eventBus.threatAlert(ip, `Bot fingerprint (entropy: ${profile.score.toFixed(2)})`, 'high');
      liveStats.blockedRequests++;
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  liveStats.allowedRequests++;
  next();
});

// ============================================================
// SENTINEL API ROUTES
// ============================================================

// Dashboard stats endpoint
app.get('/sentinel/stats', (req, res) => {
  res.json({
    ...buildStats(),
    blocked: rateLimiter.getBlockedIPs().slice(0, 20),
    topSuspects: fingerprinter.getAllProfiles().slice(0, 15),
    honeypot: honeypots.getStats(),
    challenges: challenges.getStats(),
    caughtIPs: honeypots.getAllCaught().slice(0, 10),
  });
});

// List all active honeypot traps (admin only in real use)
app.get('/sentinel/traps', (req, res) => {
  res.json({ traps: honeypots.getTrapPaths(), stats: honeypots.getStats() });
});

// Honeypot effectiveness metrics
app.get('/sentinel/traps/effectiveness', (req, res) => {
  res.json({
    effectiveness: honeypots.getTrapEffectiveness(),
    stats: honeypots.getStats()
  });
});

// Learned scanning patterns
app.get('/sentinel/traps/patterns', (req, res) => {
  res.json({
    patterns: honeypots.getScanningPatterns(),
    stats: honeypots.getStats()
  });
});

// Block an IP manually (protected with API key + optional CSRF)
app.post('/sentinel/block', apiAuth.middleware(), csrfProtection.validateRequest(true), (req, res) => {
  const { ip, durationMs = 3600000 } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  rateLimiter.forceBlock(ip, durationMs);
  eventBus.blockEvent(ip, 'Manual block via API', Math.ceil(durationMs / 1000));
  res.json({ success: true, ip, until: new Date(Date.now() + durationMs).toISOString() });
});

// Unblock an IP (protected with API key + optional CSRF)
app.post('/sentinel/unblock', apiAuth.middleware(), csrfProtection.validateRequest(true), (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  rateLimiter.unblock(ip);
  eventBus.logEvent('OK', `IP ${ip} manually unblocked`);
  res.json({ success: true, ip });
});

// Issue a challenge to an IP
app.post('/sentinel/challenge', (req, res) => {
  const { ip, difficulty } = req.body;
  const targetIP = ip || req.sentinelIP;
  const result = challenges.issue(targetIP, difficulty);
  eventBus.challengeIssued(targetIP);
  res.json(result);
});

// Verify a solved challenge
app.post('/sentinel/verify-challenge', (req, res) => {
  const { token, nonce } = req.body;
  if (!token || nonce === undefined) {
    return res.status(400).json({ error: 'token and nonce required' });
  }
  const result = challenges.verify(token, String(nonce));
  if (result.valid) {
    eventBus.challengeSolved(req.sentinelIP, Date.now());
  } else {
    eventBus.logEvent('WARN', `Challenge failed from ${req.sentinelIP}: ${result.reason}`);
  }
  res.json(result);
});

// Fingerprint profiles (debug/admin)
app.get('/sentinel/profiles', (req, res) => {
  res.json({
    all: fingerprinter.getAllProfiles().slice(0, 50),
    bots: fingerprinter.getBots(),
    suspects: fingerprinter.getSuspects()
  });
});

// Contagion graph stats and clusters
app.get('/sentinel/contagion', (req, res) => {
  res.json({
    graphStats: contagionGraph.getGraphStats(),
    clusters: contagionGraph.getClusters(),
    contagionFlags: contagionGraph.getContagionFlags().slice(0, 20),
  });
});

// Allowlist management
app.get('/sentinel/allowlist', (req, res) => {
  res.json(allowlist.getAll());
});

app.post('/sentinel/allowlist/add', apiAuth.middleware(), (req, res) => {
  const { ip, cidr } = req.body;
  if (ip) {
    allowlist.add(ip);
    eventBus.logEvent('OK', `IP ${ip} added to allowlist`);
    return res.json({ success: true, ip });
  }
  if (cidr) {
    allowlist.addCIDR(cidr);
    eventBus.logEvent('OK', `CIDR ${cidr} added to allowlist`);
    return res.json({ success: true, cidr });
  }
  res.status(400).json({ error: 'ip or cidr required' });
});

app.post('/sentinel/allowlist/remove', apiAuth.middleware(), (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'ip required' });
  allowlist.remove(ip);
  eventBus.logEvent('OK', `IP ${ip} removed from allowlist`);
  res.json({ success: true, ip });
});

// Attacker economics
app.get('/sentinel/economics', (req, res) => {
  res.json({
    global: economics.getGlobalEconomics(),
    topCostlyAttackers: economics.getTopCostlyAttackers(),
  });
});

// Adaptive threat intelligence
app.get('/sentinel/adaptive-threats', (req, res) => {
  res.json({
    stats: adaptiveThreat.getStats(),
    heartbeats: adaptiveThreat.getHeartbeats().slice(0, 20),
    predictions: adaptiveThreat.getPredictions().slice(0, 20),
    adaptiveAttackers: adaptiveThreat.getAdaptiveAttackers(),
    campaigns: adaptiveThreat.getCampaigns(),
  });
});

// Neural predictions
app.get('/sentinel/neural', (req, res) => {
  res.json(neuralPredictor.getStats());
});

// Quantum-resistant challenge
app.post('/sentinel/quantum-challenge', (req, res) => {
  const { ip, difficulty = 2 } = req.body;
  const targetIP = ip || req.sentinelIP;
  const result = quantumChallenge.issue(targetIP, difficulty);
  res.json(result);
});

// Blockchain threat ledger
app.get('/sentinel/blockchain', (req, res) => {
  res.json({
    stats: threatLedger.getChainStats(),
    chainValid: threatLedger.validateChain(),
    recentBlocks: threatLedger.exportChain().slice(-5),
  });
});

app.post('/sentinel/blockchain/mine', apiAuth.middleware(), (req, res) => {
  const block = threatLedger.mineBlock();
  res.json({ success: !!block, block });
});

// API authentication stats (protected)
app.get('/sentinel/api-stats', apiAuth.middleware(), (req, res) => {
  res.json(apiAuth.getStats());
});

// CSRF protection stats
app.get('/sentinel/csrf-stats', (req, res) => {
  res.json(csrfProtection.getStats());
});

// ============================================================
// YOUR APPLICATION ROUTES GO HERE
// These are the real endpoints you're protecting
// ============================================================
app.get('/', (req, res) => {
  // Inject honeypot links into every HTML response
  const trapHTML = honeypots.getInjectableHTML();
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Protected Application</title></head>
    <body>
      <h1>Application Running — Protected by SENTINEL</h1>
      <p>Your IP: ${req.sentinelIP}</p>
      <p>Behavioral verdict: ${req.sentinelProfile?.verdict || 'pending'}</p>
      <p>Entropy score: ${req.sentinelProfile?.score?.toFixed(2) || 'collecting...'}</p>
      <a href="/dashboard">View SENTINEL Dashboard</a>
      ${trapHTML}
    </body>
    </html>
  `);
});

app.get('/dashboard', csrfProtection.injectToken(), (req, res) => {
  // Inject CSRF token into dashboard
  const token = req.csrfToken();
  
  // Read dashboard HTML and inject token
  const fs = require('fs');
  const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
  let html = fs.readFileSync(dashboardPath, 'utf8');
  
  // Inject CSRF token into JavaScript
  const tokenScript = `
<script>
// CSRF Protection
window.SENTINEL_CSRF_TOKEN = '${token}';
// Token loaded (check logs for structured logging)
</script>`;
  
  // Insert before closing </head> tag
  html = html.replace('</head>', `${tokenScript}\n</head>`);
  
  res.send(html);
});

// Health check endpoints (for load balancers and monitoring)
// Full health check - returns 503 if any component is degraded
app.get('/health', async (req, res) => {
  const health = await healthCheck.runAllChecks();
  const statusCode = health.healthy ? 200 : 503;
  res.status(statusCode).json(health);
});

// Liveness probe - always returns 200 if server is running
app.get('/health/live', (req, res) => {
  res.json(healthCheck.getLivenessCheck());
});

// Readiness probe - returns 200 only if all components are ready
app.get('/health/ready', async (req, res) => {
  const readiness = await healthCheck.getReadinessCheck();
  const statusCode = readiness.healthy ? 200 : 503;
  res.status(statusCode).json(readiness);
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', metrics.getContentType());
  res.end(metrics.getMetrics());
});

// ============================================================
// PERIODIC STATS BROADCAST
// ============================================================
setInterval(() => {
  eventBus.statsUpdate(buildStats());
}, 1000);

// Periodic cleanup
setInterval(() => {
  fingerprinter.cleanup();
}, 120000);

// Periodic blockchain mining
setInterval(() => {
  threatLedger.mineBlock();
}, 30000); // Mine every 30 seconds

// Periodic metrics update
setInterval(() => {
  updateMetrics();
}, 10000); // Update metrics every 10 seconds

// ============================================================
// HELPERS
// ============================================================
function buildStats() {
  const now = Date.now();
  const reqPerSec = liveStats.reqPerSecWindow.length / 5; // over 5s window
  const blockedIPs = rateLimiter.getBlockedIPs();
  const uptime = Math.floor((now - liveStats.startTime) / 1000);

  return {
    reqPerSec: Math.round(reqPerSec * 10) / 10,
    totalRequests: liveStats.totalRequests,
    blockedRequests: liveStats.blockedRequests,
    allowedRequests: liveStats.allowedRequests,
    blockedIPCount: blockedIPs.length,
    botProfiles: fingerprinter.getBots().length,
    suspectProfiles: fingerprinter.getSuspects().length,
    honeypotHits: honeypots.getStats().totalHits,
    challengeStats: challenges.getStats(),
    uptime,
  };
}

function updateMetrics() {
  // Update gauge metrics with current values
  const blockedIPs = rateLimiter.getBlockedIPs();
  metrics.updateBlockedIPs(blockedIPs.length);
  
  // Profile counts
  const bots = fingerprinter.getBots().length;
  const suspects = fingerprinter.getSuspects().length;
  const allProfiles = fingerprinter.getAllProfiles();
  const humans = allProfiles.filter(p => p.verdict === 'human').length;
  metrics.updateProfiles(bots, suspects, humans);
  
  // Honeypot traps
  const trapCount = honeypots.getTrapPaths().length;
  metrics.updateActiveTraps(trapCount);
  
  // Contagion graph
  const graphStats = contagionGraph.getGraphStats();
  metrics.updateContagionGraph(
    graphStats.totalNodes,
    graphStats.totalEdges,
    graphStats.clusters || 0,
    contagionGraph.confirmedBots.size
  );
  
  // Neural network
  const neuralStats = neuralPredictor.getStats();
  if (neuralStats.accuracy !== undefined) {
    metrics.updateNeuralAccuracy(neuralStats.accuracy);
  }
  
  // WebSocket clients
  metrics.updateWebSocketClients(wss.clients.size);
}

// ============================================================
// LAUNCH
// ============================================================
server.listen(CONFIG.port, () => {
  // ASCII art banner for visual appeal
  console.log(`
  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     
  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     
  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     
  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     
  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
  
  Anti-DDoS Intelligence Platform — ACTIVE
  Listening on port ${CONFIG.port}
  Dashboard: http://localhost:${CONFIG.port}/dashboard
  Stats API: http://localhost:${CONFIG.port}/sentinel/stats
  WebSocket: ws://localhost:${CONFIG.port}/ws

  Modules:
    ✓ Sliding Window Rate Limiter
    ✓ Behavioral Fingerprinting (Shannon Entropy)
    ✓ Honeypot Trap Grid (${honeypots.getTrapPaths().length} traps active)
    ✓ Cryptographic Challenge Tokens (SHA-256 PoW)
    ✓ WebSocket Live Dashboard Feed
    
  NOVEL RESEARCH MODULES:
    ✓ Adaptive Threat Intelligence (Temporal Pattern Analysis)
    ✓ Neural Behavior Predictor (Online Learning)
    ✓ Quantum-Resistant Challenges (Lattice-based PoW)
    ✓ Blockchain Threat Ledger (Decentralized Intelligence)
    ✓ Behavioral Contagion Graph (Similarity Clustering)
    ✓ Attacker Economics Engine (Cost Modeling)
  `);
  
  // Structured log for machine parsing
  log.startup({
    port: CONFIG.port,
    layers: 12,
    honeypotTraps: honeypots.getTrapPaths().length,
    rateLimit: CONFIG.rateLimit,
    fingerprint: CONFIG.fingerprint
  });
  
  // Register components for graceful shutdown
  shutdownManager.registerComponents({
    server,
    wss,
    rateLimiter,
    fingerprinter,
    contagionGraph,
    neuralPredictor,
    threatLedger,
    liveStats
  });
  
  // Setup signal handlers for graceful shutdown
  shutdownManager.setupSignalHandlers();
  
  // Try to restore previous state
  const previousState = shutdownManager.restoreState();
  if (previousState) {
    log.info('Restored previous state', {
      component: 'startup',
      blockedIPCount: previousState.blockedIPs?.length || 0,
      confirmedBotCount: previousState.confirmedBots?.length || 0
    });
    
    // Restore blocked IPs
    if (previousState.blockedIPs) {
      previousState.blockedIPs.forEach(blockedIP => {
        if (blockedIP.until > Date.now()) {
          rateLimiter.forceBlock(blockedIP.ip, blockedIP.until - Date.now());
        }
      });
    }
    
    // Restore confirmed bots
    if (previousState.confirmedBots) {
      previousState.confirmedBots.forEach(bot => {
        contagionGraph.confirmedBots.add(bot);
      });
    }
  }
});

module.exports = { app, server, rateLimiter, fingerprinter, honeypots, challenges, contagionGraph, economics, allowlist };

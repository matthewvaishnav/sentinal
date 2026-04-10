/**
 * SENTINEL — API and UI Routes
 * 
 * Defines all management and monitoring endpoints.
 */

const path = require('path');
const fs = require('fs');

/**
 * Sets up all Sentinel-related routes on the given Express app.
 */
function setupSentinelRoutes(app, {
  CONFIG,
  liveStats,
  rateLimiter,
  fingerprinter,
  honeypots,
  challenges,
  quantumChallenge,
  threatLedger,
  contagionGraph,
  economics,
  adaptiveThreat,
  neuralPredictor,
  apiAuth,
  csrfProtection,
  allowlist,
  healthCheck,
  eventBus
}) {
  
  // Helper to build real-time stats object
  async function buildStats() {
    const now = Date.now();
    const reqPerSec = liveStats.reqPerSecWindow.length / 5;
    const blockedIPs = await rateLimiter.getBlockedIPs();
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
      timestamp: now,
    };
  }

  // ============================================================
  // SENTINEL API ROUTES
  // ============================================================

  // Dashboard stats endpoint
  app.get('/sentinel/stats', async (req, res) => {
    res.json({
      ...(await buildStats()),
      blocked: (await rateLimiter.getBlockedIPs()).slice(0, 20),
      topSuspects: fingerprinter.getAllProfiles().slice(0, 15),
      honeypot: honeypots.getStats(),
      challenges: challenges.getStats(),
      caughtIPs: honeypots.getAllCaught().slice(0, 10),
    });
  });

  // List all active honeypot traps (protected)
  app.get('/sentinel/traps', apiAuth.middleware(), (req, res) => {
    res.json({ traps: honeypots.getTrapPaths(), stats: honeypots.getStats() });
  });

  // Honeypot effectiveness metrics (protected)
  app.get('/sentinel/traps/effectiveness', apiAuth.middleware(), (req, res) => {
    res.json({
      effectiveness: honeypots.getTrapEffectiveness(),
      stats: honeypots.getStats()
    });
  });

  // Learned scanning patterns (protected)
  app.get('/sentinel/traps/patterns', apiAuth.middleware(), (req, res) => {
    res.json({
      patterns: honeypots.getScanningPatterns(),
      stats: honeypots.getStats()
    });
  });

  // Block an IP manually (protected)
  app.post('/sentinel/block', apiAuth.middleware(), csrfProtection.validateRequest(true), async (req, res) => {
    const { ip, durationMs = 3600000 } = req.body;
    if (!ip) return res.status(400).json({ error: 'ip required' });
    await rateLimiter.forceBlock(ip, durationMs);
    eventBus.blockEvent(ip, 'Manual block via API', Math.ceil(durationMs / 1000));
    res.json({ success: true, ip, until: new Date(Date.now() + durationMs).toISOString() });
  });

  // Unblock an IP (protected)
  app.post('/sentinel/unblock', apiAuth.middleware(), csrfProtection.validateRequest(true), async (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'ip required' });
    await rateLimiter.unblock(ip);
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

  // Fingerprint profiles (protected)
  app.get('/sentinel/profiles', apiAuth.middleware(), (req, res) => {
    res.json({
      all: fingerprinter.getAllProfiles().slice(0, 50),
      bots: fingerprinter.getBots(),
      suspects: fingerprinter.getSuspects()
    });
  });

  // Contagion graph stats and clusters (protected)
  app.get('/sentinel/contagion', apiAuth.middleware(), (req, res) => {
    res.json({
      graphStats: contagionGraph.getGraphStats(),
      clusters: contagionGraph.getClusters(),
      contagionFlags: contagionGraph.getContagionFlags().slice(0, 20),
    });
  });

  // Performance summary
  app.get('/sentinel/performance', async (req, res) => {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - liveStats.startTime) / 1000);
    const requestRate = liveStats.reqPerSecWindow.length / 5;
    const healthData = await healthCheck.runAllChecks();

    res.json({
      uptimeSeconds,
      requestRatePerSec: Number(requestRate.toFixed(2)),
      blockedIPCount: (await rateLimiter.getBlockedIPs()).length,
      honeypotHits: honeypots.getStats().totalHits || 0,
      confirmedBots: contagionGraph.getGraphStats().confirmedBots || 0,
      activeWebSocketClients: eventBus.getClientCount ? eventBus.getClientCount() : 0,
      health: healthData,
      timestamp: now
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
  // UI ROUTES
  // ============================================================

  app.get('/', (req, res) => {
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
    // Prevent caching to ensure users always get the latest version
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const token = req.csrfToken();
    const dashboardPath = path.join(__dirname, '..', 'public', 'dashboard.html');
    
    if (!fs.existsSync(dashboardPath)) {
      return res.status(404).send('Dashboard template not found');
    }

    let html = fs.readFileSync(dashboardPath, 'utf8');
    
    // Inject CSRF token into JavaScript
    const tokenScript = `
<script>
// CSRF Protection
window.SENTINEL_CSRF_TOKEN = "${token}";
</script>
`;
    html = html.replace('</head>', `${tokenScript}</head>`);
    res.send(html);
  });

  return buildStats;
}

module.exports = { setupSentinelRoutes };

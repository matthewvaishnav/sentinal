/**
 * SENTINEL — Detection Pipeline Middleware
 * 
 * Implements the multi-layer protection stack.
 */

const log = require('./logger');

/**
 * Extracts the real client IP, considering trusted proxies.
 * Uses configurable proxy list from CONFIG.
 */
function getIP(req, trustedProxies) {
  const directIP = req.socket?.remoteAddress || req.connection?.remoteAddress || '0.0.0.0';
  
  // Only trust X-Forwarded-For if request comes from a trusted proxy
  if (trustedProxies && trustedProxies.has(directIP)) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();
  }
  
  return directIP;
}

/**
 * Factory for creating the Sentinel middleware.
 * Injects all necessary detection components.
 */
function createSentinelMiddleware({
  CONFIG,
  liveStats,
  allowlist,
  honeypots,
  rateLimiter,
  fingerprinter,
  adaptiveThreat,
  neuralPredictor,
  contagionGraph,
  threatLedger,
  economics,
  eventBus,
  shutdownManager
}) {
  // Initialize trusted proxies from config
  const trustedProxies = new Set(CONFIG.security?.trustedProxies || ['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  
  return (req, res, next) => {
    const ip = getIP(req, trustedProxies);
    const now = Date.now();

    // Track in-flight requests for graceful shutdown
    shutdownManager.trackRequest();
    res.on('finish', () => shutdownManager.releaseRequest());
    res.on('error', () => shutdownManager.releaseRequest());

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
      honeypots.recordHit(ip, req.path, req);
      // Auto-block for 24 hours — no legitimate user accesses these
      rateLimiter.forceBlock(ip, 86400000).catch(err => log.error('Failed to forceBlock', err));
      eventBus.honeypotHit(ip, req.path);
      liveStats.blockedRequests++;
      return res.status(404).json({ error: 'Not found' });
    }

    // --- LAYER 2: Already blocked? ---
    rateLimiter.check(ip).then(async rateResult => {
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
    const profile = await fingerprinter.record(ip, req);
    req.sentinelIP = ip;
    req.sentinelProfile = profile;

    // --- LAYER 3.5: Adaptive Threat Intelligence ---
    // Temporal pattern analysis
    adaptiveThreat.analyzeTemporalPattern(ip, now).then(heartbeat => {
      if (heartbeat && heartbeat.heartbeatDetected && heartbeat.threatLevel === 'high') {
        eventBus.threatAlert(ip, `Botnet heartbeat detected (${Math.round(heartbeat.frequency)}ms)`, 'high');
      }
    }).catch(err => log.error('FFT array thread err', err));

    // Attack vector prediction
    const prediction = adaptiveThreat.predictNextVector(ip, req.path, req.method);
    if (prediction.predictionAvailable) {
      log.warn(`Predicted attack vectors for ${ip}: ${prediction.predictedPaths.join(', ')}`);
    }

    // Adversarial adaptation detection
    const adaptation = adaptiveThreat.detectAdversarialAdaptation(ip, {
      type: 'behavior_change',
      from: profile.verdict,
      to: profile.verdict,
    });
    if (adaptation.isAdaptive) {
      eventBus.threatAlert(ip, `Adaptive attacker detected (score: ${adaptation.adaptationScore.toFixed(2)})`, 'critical');
      rateLimiter.forceBlock(ip, 600000).catch(err => log.error('Failed to block adaptive attacker', err)); // 10 min block for adaptive attackers
    }

    // --- LAYER 3.6: Neural Behavior Prediction ---
    neuralPredictor.predict(ip, {
      timingCV: profile.score || 0,
      pathDiversity: profile.paths?.size || 0,
      requestCount: profile.requests?.length || 0,
      headerCount: Object.keys(req.headers).length,
      hasAcceptLanguage: req.headers['accept-language'] ? 1 : 0,
      methodVariety: Object.keys(profile.methods || {}).length,
    }).then(neuralPrediction => {
      if (neuralPrediction.botProbability > 0.8 && neuralPrediction.confidence > 0.6) {
        eventBus.threatAlert(ip, `Neural network bot detection (prob: ${neuralPrediction.botProbability.toFixed(2)})`, 'high');
      }
    }).catch(err => log.error('Neural prediction failed', err));

    // Feed profile signals into the contagion graph
    if (profile && profile.requests) {
      const ts = profile.timestamps || [];
      const gaps = ts.length > 1 ? ts.slice(1).map((t, i) => t - ts[i]) : [];
      const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 1000;
      const variance = gaps.length ? gaps.reduce((s, g) => s + Math.pow(g - meanGap, 2), 0) / gaps.length : 0;
      const timingCV = meanGap > 0 ? Math.sqrt(variance) / meanGap : 0;

      const graphResult = contagionGraph.update(ip, {
        timingCV,
        uaEntropy: profile.score || 0,
        pathDiversity: profile.paths.size / Math.max(1, profile.requests.length),
        headerCount: Object.keys(req.headers).length,
        acceptLangRate: req.headers['accept-language'] ? 1 : 0,
        reqPerSec: rateResult.count / (CONFIG.rateLimit.windowMs / 1000),
        methodVariety: Object.keys(profile.methods || {}).length,
        hasReferer: !!req.headers['referer'],
      });

      rateLimiter.getBlockedIPs().then(blockedIPs => {
        if (graphResult.contagionScore >= 2 && !blockedIPs.find(b => b.ip === ip)) {
          eventBus.threatAlert(ip, `Contagion graph flag (score: ${graphResult.contagionScore})`, 'medium');
        }
      });
    }

    // Record economics
    economics.recordRequest(ip);
    
    // Record scan for honeypot pattern learning (non-trap paths only)
    if (!honeypots.isTrap(req.path)) {
      honeypots.recordScan(ip, req.path, req);
    }

    // If bot verdict and has enough samples, issue a challenge or block
    if (profile && profile.verdict === 'bot' && profile.requests.length >= 5) {
      contagionGraph.markAsBot(ip);
      neuralPredictor.learn(ip, true).catch(err => log.error('Neural learn error', err));
      threatLedger.submitThreat(ip, {
        verdict: 'bot',
        entropy: profile.score,
        requestCount: profile.requests.length,
        severity: 3,
      });
      
      const campaign = adaptiveThreat.correlateCampaign(ip, {
        techniques: ['bot_fingerprint'],
        targetPaths: [...profile.paths],
        timingProfile: 'periodic',
        userAgent: req.headers['user-agent'] || '',
      });
      
      if (campaign.campaignDetected) {
        eventBus.threatAlert(ip, `Part of coordinated campaign (${campaign.ipCount} IPs)`, 'critical');
      }
    }

    next();
    }).catch(err => next(err));
  };
}

module.exports = { createSentinelMiddleware, getIP };

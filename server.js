/**
 * SENTINEL — Anti-DDoS Intelligence Platform
 * 
 * Main entry point. Orchestrates the multi-layered protection stack.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const helmet = require('helmet');

// --- Modules & Components ---
const CONFIG = require('./src/config');
const log = require('./src/logger');
const MetricsCollector = require('./src/metrics');
const RateLimiter = require('./src/rateLimiter');
const RedisAdapter = require('./src/state/RedisAdapter');
const BehavioralFingerprinter = require('./src/fingerprinter');
const HoneypotManager = require('./src/honeypot');
const ChallengeTokenSystem = require('./src/challengeTokens');
const QuantumResistantChallenge = require('./src/quantumResistantChallenge');
const BlockchainThreatLedger = require('./src/blockchainThreatLedger');
const BehavioralContagionGraph = require('./src/contagionGraph');
const AttackerEconomicsEngine = require('./src/economicsEngine');
const AdaptiveThreatIntelligence = require('./src/adaptiveThreatIntelligence');
const NeuralBehaviorPredictor = require('./src/neuralBehaviorPredictor');
const GossipManager = require('./src/p2p/gossip');
const APIAuthManager = require('./src/apiAuth');
const CSRFProtection = require('./src/csrfProtection');
const IPAllowlist = require('./src/ipAllowlist');
const HealthCheckSystem = require('./src/healthCheck');
const eventBus = require('./src/eventBus');
const GracefulShutdownManager = require('./src/gracefulShutdown');
const shutdownManager = new GracefulShutdownManager();

const { createSentinelMiddleware } = require('./src/middleware');
const { setupSentinelRoutes } = require('./src/routes');

// --- Initialization ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });
const metrics = new MetricsCollector();

// Initialize all security layers
const stateAdapter = new RedisAdapter(CONFIG.redis);
const rateLimiter = new RateLimiter(CONFIG.rateLimit, stateAdapter);
const allowlist = new IPAllowlist({
  allowedIPs: CONFIG.allowlist.ips,
  allowedCIDRs: CONFIG.allowlist.cidrs
});
const fingerprinter = new BehavioralFingerprinter(CONFIG.fingerprint);
const honeypots = new HoneypotManager({
  trapCount: 15,
  realRoutes: ['/', '/dashboard', '/login', '/api/data']
});
const challenges = new ChallengeTokenSystem(CONFIG.challenge);
const quantumChallenge = new QuantumResistantChallenge();
const threatLedger = new BlockchainThreatLedger();
const contagionGraph = new BehavioralContagionGraph();
const economics = new AttackerEconomicsEngine();
const adaptiveThreat = new AdaptiveThreatIntelligence();
const neuralPredictor = new NeuralBehaviorPredictor();
const apiAuth = new APIAuthManager(CONFIG.apiAuth);
const csrfProtection = new CSRFProtection();
const healthCheck = new HealthCheckSystem();

// P2P Gossip Networking
const gossip = new GossipManager({
  nodeId: threatLedger.nodeId,
  serverPort: CONFIG.p2p.port,
  peers: CONFIG.p2p.peers,
  threatLedger
});

// Link Threat Ledger events to P2P Broadcast
threatLedger.on('broadcast', (msg) => {
  gossip.broadcast(msg);
});

// Live stats tracking (in-memory)
const liveStats = {
  totalRequests: 0,
  blockedRequests: 0,
  allowedRequests: 0,
  startTime: Date.now(),
  reqPerSecWindow: []
};

// --- Middleware Stack ---

// Standard security headers
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for demo dashboard
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// SENTINEL Detection Pipeline
const sentinelMiddleware = createSentinelMiddleware({
  CONFIG, liveStats, allowlist, honeypots, rateLimiter,
  fingerprinter, adaptiveThreat, neuralPredictor, contagionGraph,
  threatLedger, economics, eventBus, shutdownManager
});

app.use(sentinelMiddleware);

// --- Routes ---
const buildStats = setupSentinelRoutes(app, {
  CONFIG, liveStats, rateLimiter, fingerprinter, honeypots,
  challenges, quantumChallenge, threatLedger, contagionGraph,
  economics, adaptiveThreat, neuralPredictor, apiAuth,
  csrfProtection, allowlist, healthCheck, eventBus
});

// --- WebSocket Event Forwarding ---
wss.on('connection', async (ws) => {
  metrics.updateWebSocketClients(wss.clients.size);
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'init', data: await buildStats() }));
  
  ws.on('close', () => {
    metrics.updateWebSocketClients(wss.clients.size);
  });
});

// Broadcast events to dashboard
eventBus.on('event', (event) => {
  const msg = JSON.stringify(event);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
});

// --- Background Jobs ---

// Blockchain mining
const miningTimer = setInterval(() => {
  threatLedger.mineBlock();
}, 30000);
miningTimer.unref?.();

// Metrics collection
const metricsTimer = setInterval(async () => {
  const blockedIPs = await rateLimiter.getBlockedIPs();
  metrics.updateBlockedIPs(blockedIPs.length);
  
  const bots = fingerprinter.getBots().length;
  const suspects = fingerprinter.getSuspects().length;
  const humans = fingerprinter.getAllProfiles().filter(p => p.verdict === 'human').length;
  metrics.updateProfiles(bots, suspects, humans);
  
  metrics.updateActiveTraps(honeypots.getTrapPaths().length);
  
  const graphStats = contagionGraph.getGraphStats();
  metrics.updateContagionGraph(
    graphStats.totalNodes, graphStats.totalEdges,
    graphStats.clusters || 0, contagionGraph.confirmedBots.size
  );
  
  const neuralStats = neuralPredictor.getStats();
  if (neuralStats.accuracy !== undefined) {
    metrics.updateNeuralAccuracy(neuralStats.accuracy);
  }
  
  metrics.updateWebSocketClients(wss.clients.size);
}, 10000);
metricsTimer.unref?.();

// --- Startup ---

function start() {
  server.listen(CONFIG.port, () => {
    // Banner
    console.log(`
  ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     
  ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     
  ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║     
  ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║     
  ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
    `);
    log.info('SENTINEL Platform Active', { port: CONFIG.port });
    
    // Register for shutdown
    shutdownManager.registerComponents({
      server, wss, rateLimiter, fingerprinter, contagionGraph,
      neuralPredictor, threatLedger, liveStats, gossip
    });
    shutdownManager.setupSignalHandlers();
    
    // Start P2P Mesh
    gossip.start();
    
    // Restore state
    const previousState = shutdownManager.restoreState();
    if (previousState) {
      if (previousState.blockedIPs) {
        previousState.blockedIPs.forEach(b => {
          if (b.until > Date.now()) rateLimiter.forceBlock(b.ip, b.until - Date.now()).catch(e => log.error('Block restore failed', e));
        });
      }
      if (previousState.confirmedBots) {
        previousState.confirmedBots.forEach(bot => contagionGraph.confirmedBots.add(bot));
      }
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { 
  app, server, wss, 
  rateLimiter, fingerprinter, honeypots, 
  challenges, quantumChallenge, threatLedger, 
  contagionGraph, economics, adaptiveThreat, 
  neuralPredictor, apiAuth, csrfProtection, 
  allowlist, healthCheck, eventBus, liveStats,
  buildStats
};

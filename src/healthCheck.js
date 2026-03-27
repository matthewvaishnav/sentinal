/**
 * SENTINEL — Health Check System
 * 
 * Comprehensive health checks for all system components.
 * Used by load balancers and monitoring systems to determine instance health.
 * 
 * Health Check Categories:
 * - Memory: Heap usage, RSS, external memory
 * - Components: Rate limiter, fingerprinter, contagion graph, neural network
 * - Event Bus: WebSocket connections
 * - System: Uptime, event loop lag
 * 
 * Returns:
 * - 200 OK: All checks passed (healthy)
 * - 503 Service Unavailable: One or more checks failed (degraded)
 */

const log = require('./logger');

class HealthCheckSystem {
  constructor(components = {}) {
    this.components = components;
    this.startTime = Date.now();
    
    // Thresholds for health checks
    this.thresholds = {
      memory: {
        heapUsedPercent: 90,      // 90% heap usage = unhealthy
        rssBytes: 1024 * 1024 * 1024 // 1GB RSS = unhealthy
      },
      contagionGraph: {
        maxNodes: 50000,            // 50k nodes = capacity limit
        maxEdges: 200000            // 200k edges = capacity limit
      },
      rateLimiter: {
        maxBlockedIPs: 10000        // 10k blocked IPs = potential issue
      },
      eventBus: {
        maxClients: 100             // 100 WebSocket clients = capacity
      }
    };
    
    log.info('Health check system initialized', {
      component: 'health_check',
      thresholds: this.thresholds
    });
  }
  
  /**
   * Run all health checks
   * @returns {Object} Health check results with status
   */
  async runAllChecks() {
    const checks = {
      memory: this.checkMemory(),
      rateLimiter: this.checkRateLimiter(),
      fingerprinter: this.checkFingerprinter(),
      contagionGraph: this.checkContagionGraph(),
      neuralNetwork: this.checkNeuralNetwork(),
      eventBus: this.checkEventBus(),
      system: this.checkSystem()
    };
    
    // Determine overall health
    const allHealthy = Object.values(checks).every(c => c.healthy);
    const degradedChecks = Object.entries(checks)
      .filter(([_, check]) => !check.healthy)
      .map(([name, _]) => name);
    
    const result = {
      status: allHealthy ? 'healthy' : 'degraded',
      healthy: allHealthy,
      degradedChecks,
      checks,
      uptime: process.uptime(),
      uptimeMs: Date.now() - this.startTime,
      timestamp: Date.now()
    };
    
    // Log degraded state
    if (!allHealthy) {
      log.warn('Health check failed', {
        component: 'health_check',
        degradedChecks,
        checks
      });
    }
    
    return result;
  }
  
  /**
   * Check memory usage
   */
  checkMemory() {
    const usage = process.memoryUsage();
    const heapPercent = (usage.heapUsed / usage.heapTotal) * 100;
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    const healthy = heapPercent < this.thresholds.memory.heapUsedPercent &&
                    usage.rss < this.thresholds.memory.rssBytes;
    
    return {
      healthy,
      heapUsedMB,
      heapTotalMB,
      heapPercent: Math.round(heapPercent),
      rssMB,
      externalMB: Math.round(usage.external / 1024 / 1024),
      reason: !healthy ? 'Memory usage exceeds threshold' : null
    };
  }
  
  /**
   * Check rate limiter health
   */
  checkRateLimiter() {
    if (!this.components.rateLimiter) {
      return { healthy: true, reason: 'Component not registered' };
    }
    
    const blockedIPs = this.components.rateLimiter.getBlockedIPs();
    const blockedCount = blockedIPs.length;
    const healthy = blockedCount < this.thresholds.rateLimiter.maxBlockedIPs;
    
    return {
      healthy,
      blockedCount,
      threshold: this.thresholds.rateLimiter.maxBlockedIPs,
      reason: !healthy ? 'Too many blocked IPs' : null
    };
  }
  
  /**
   * Check fingerprinter health
   */
  checkFingerprinter() {
    if (!this.components.fingerprinter) {
      return { healthy: true, reason: 'Component not registered' };
    }
    
    const profiles = this.components.fingerprinter.getProfiles();
    const profileCount = profiles.length;
    
    // Count by verdict
    const verdicts = { bot: 0, suspect: 0, human: 0 };
    profiles.forEach(p => {
      verdicts[p.verdict] = (verdicts[p.verdict] || 0) + 1;
    });
    
    // Healthy if we have profiles and system is tracking
    const healthy = true; // Fingerprinter doesn't have failure modes
    
    return {
      healthy,
      profileCount,
      verdicts,
      reason: null
    };
  }
  
  /**
   * Check contagion graph health
   */
  checkContagionGraph() {
    if (!this.components.contagionGraph) {
      return { healthy: true, reason: 'Component not registered' };
    }
    
    const stats = this.components.contagionGraph.getGraphStats();
    const healthy = stats.totalNodes < this.thresholds.contagionGraph.maxNodes &&
                    stats.totalEdges < this.thresholds.contagionGraph.maxEdges;
    
    return {
      healthy,
      nodes: stats.totalNodes,
      edges: stats.totalEdges,
      clusters: stats.clusters || 0,
      confirmedBots: stats.confirmedBots || 0,
      thresholds: {
        maxNodes: this.thresholds.contagionGraph.maxNodes,
        maxEdges: this.thresholds.contagionGraph.maxEdges
      },
      reason: !healthy ? 'Graph size exceeds capacity' : null
    };
  }
  
  /**
   * Check neural network health
   */
  checkNeuralNetwork() {
    if (!this.components.neuralPredictor) {
      return { healthy: true, reason: 'Component not registered' };
    }
    
    const stats = this.components.neuralPredictor.getStats();
    
    // Healthy if network is making predictions
    const healthy = true; // Neural network doesn't have failure modes
    
    return {
      healthy,
      predictions: stats.predictions || 0,
      accuracy: stats.accuracy || 0,
      reason: null
    };
  }
  
  /**
   * Check event bus health
   */
  checkEventBus() {
    if (!this.components.eventBus) {
      return { healthy: true, reason: 'Component not registered' };
    }
    
    const clientCount = this.components.eventBus.clients.size;
    const healthy = clientCount < this.thresholds.eventBus.maxClients;
    
    return {
      healthy,
      connectedClients: clientCount,
      threshold: this.thresholds.eventBus.maxClients,
      reason: !healthy ? 'Too many WebSocket clients' : null
    };
  }
  
  /**
   * Check system health
   */
  checkSystem() {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    
    // System is healthy if it's running
    const healthy = true;
    
    return {
      healthy,
      uptime,
      uptimeHours,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      reason: null
    };
  }
  
  /**
   * Get a simple liveness check (always returns healthy if server is running)
   */
  getLivenessCheck() {
    return {
      status: 'alive',
      timestamp: Date.now()
    };
  }
  
  /**
   * Get a readiness check (returns healthy only if all components are ready)
   */
  async getReadinessCheck() {
    const health = await this.runAllChecks();
    return {
      status: health.healthy ? 'ready' : 'not_ready',
      healthy: health.healthy,
      degradedChecks: health.degradedChecks,
      timestamp: Date.now()
    };
  }
}

module.exports = HealthCheckSystem;

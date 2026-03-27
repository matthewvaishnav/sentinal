/**
 * SENTINEL — Prometheus Metrics
 * 
 * Exports metrics for Prometheus monitoring and Grafana dashboards.
 * 
 * Metric Types:
 * - Counter: Monotonically increasing (requests, blocks, errors)
 * - Gauge: Can go up or down (blocked IPs, memory usage)
 * - Histogram: Distribution of values (fingerprint scores, latency)
 * - Summary: Similar to histogram with quantiles
 * 
 * Integration:
 * - Prometheus scrapes /metrics endpoint
 * - Grafana visualizes metrics
 * - Alertmanager sends alerts
 */

const promClient = require('prom-client');
const log = require('./logger');

class MetricsCollector {
  constructor() {
    // Enable default metrics (CPU, memory, event loop, etc.)
    promClient.collectDefaultMetrics({
      prefix: 'sentinel_',
      timeout: 5000
    });
    
    this.register = promClient.register;
    
    // Initialize custom metrics
    this.initializeMetrics();
    
    log.info('Prometheus metrics initialized', {
      component: 'metrics',
      defaultMetrics: true
    });
  }
  
  /**
   * Initialize all custom metrics
   */
  initializeMetrics() {
    // ============================================================
    // REQUEST METRICS
    // ============================================================
    
    this.requestsTotal = new promClient.Counter({
      name: 'sentinel_requests_total',
      help: 'Total number of requests processed',
      labelNames: ['verdict', 'method', 'path']
    });
    
    this.requestDuration = new promClient.Histogram({
      name: 'sentinel_request_duration_seconds',
      help: 'Request duration in seconds',
      labelNames: ['verdict', 'layer'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
    });
    
    // ============================================================
    // RATE LIMITER METRICS
    // ============================================================
    
    this.blockedIPsGauge = new promClient.Gauge({
      name: 'sentinel_blocked_ips',
      help: 'Number of currently blocked IPs'
    });
    
    this.blocksTotal = new promClient.Counter({
      name: 'sentinel_blocks_total',
      help: 'Total number of IP blocks',
      labelNames: ['reason']
    });
    
    this.blockDuration = new promClient.Histogram({
      name: 'sentinel_block_duration_seconds',
      help: 'Duration of IP blocks in seconds',
      buckets: [60, 300, 600, 1800, 3600, 7200, 86400]
    });
    
    // ============================================================
    // FINGERPRINTER METRICS
    // ============================================================
    
    this.fingerprintScore = new promClient.Histogram({
      name: 'sentinel_fingerprint_score',
      help: 'Distribution of fingerprint scores',
      labelNames: ['verdict'],
      buckets: [0, 1, 2, 3, 4, 5, 6, 7]
    });
    
    this.profilesGauge = new promClient.Gauge({
      name: 'sentinel_profiles_total',
      help: 'Number of tracked profiles',
      labelNames: ['verdict']
    });
    
    // ============================================================
    // HONEYPOT METRICS
    // ============================================================
    
    this.honeypotHitsTotal = new promClient.Counter({
      name: 'sentinel_honeypot_hits_total',
      help: 'Total honeypot trap hits',
      labelNames: ['trap_type', 'path']
    });
    
    this.activeTrapsGauge = new promClient.Gauge({
      name: 'sentinel_honeypot_traps_active',
      help: 'Number of active honeypot traps'
    });
    
    // ============================================================
    // CONTAGION GRAPH METRICS
    // ============================================================
    
    this.contagionNodesGauge = new promClient.Gauge({
      name: 'sentinel_contagion_nodes',
      help: 'Number of nodes in contagion graph'
    });
    
    this.contagionEdgesGauge = new promClient.Gauge({
      name: 'sentinel_contagion_edges',
      help: 'Number of edges in contagion graph'
    });
    
    this.contagionClustersGauge = new promClient.Gauge({
      name: 'sentinel_contagion_clusters',
      help: 'Number of clusters in contagion graph'
    });
    
    this.confirmedBotsGauge = new promClient.Gauge({
      name: 'sentinel_confirmed_bots',
      help: 'Number of confirmed bots'
    });
    
    // ============================================================
    // NEURAL NETWORK METRICS
    // ============================================================
    
    this.neuralPredictionsTotal = new promClient.Counter({
      name: 'sentinel_neural_predictions_total',
      help: 'Total neural network predictions',
      labelNames: ['prediction']
    });
    
    this.neuralAccuracyGauge = new promClient.Gauge({
      name: 'sentinel_neural_accuracy',
      help: 'Neural network accuracy (0-1)'
    });
    
    // ============================================================
    // CHALLENGE METRICS
    // ============================================================
    
    this.challengesIssuedTotal = new promClient.Counter({
      name: 'sentinel_challenges_issued_total',
      help: 'Total challenges issued',
      labelNames: ['difficulty']
    });
    
    this.challengesSolvedTotal = new promClient.Counter({
      name: 'sentinel_challenges_solved_total',
      help: 'Total challenges solved',
      labelNames: ['success']
    });
    
    // ============================================================
    // WEBSOCKET METRICS
    // ============================================================
    
    this.websocketClientsGauge = new promClient.Gauge({
      name: 'sentinel_websocket_clients',
      help: 'Number of connected WebSocket clients'
    });
    
    this.websocketMessagesTotal = new promClient.Counter({
      name: 'sentinel_websocket_messages_total',
      help: 'Total WebSocket messages sent',
      labelNames: ['type']
    });
    
    // ============================================================
    // HEALTH METRICS
    // ============================================================
    
    this.healthStatusGauge = new promClient.Gauge({
      name: 'sentinel_health_status',
      help: 'Overall health status (1=healthy, 0=degraded)'
    });
    
    this.componentHealthGauge = new promClient.Gauge({
      name: 'sentinel_component_health',
      help: 'Component health status (1=healthy, 0=unhealthy)',
      labelNames: ['component']
    });
  }
  
  /**
   * Record a request
   */
  recordRequest(verdict, method, path) {
    this.requestsTotal.inc({ verdict, method, path });
  }
  
  /**
   * Record request duration
   */
  recordRequestDuration(verdict, layer, durationSeconds) {
    this.requestDuration.observe({ verdict, layer }, durationSeconds);
  }
  
  /**
   * Update blocked IPs count
   */
  updateBlockedIPs(count) {
    this.blockedIPsGauge.set(count);
  }
  
  /**
   * Record a block
   */
  recordBlock(reason, durationSeconds) {
    this.blocksTotal.inc({ reason });
    this.blockDuration.observe(durationSeconds);
  }
  
  /**
   * Record fingerprint score
   */
  recordFingerprintScore(verdict, score) {
    this.fingerprintScore.observe({ verdict }, score);
  }
  
  /**
   * Update profile counts
   */
  updateProfiles(bots, suspects, humans) {
    this.profilesGauge.set({ verdict: 'bot' }, bots);
    this.profilesGauge.set({ verdict: 'suspect' }, suspects);
    this.profilesGauge.set({ verdict: 'human' }, humans);
  }
  
  /**
   * Record honeypot hit
   */
  recordHoneypotHit(trapType, path) {
    this.honeypotHitsTotal.inc({ trap_type: trapType, path });
  }
  
  /**
   * Update active traps count
   */
  updateActiveTraps(count) {
    this.activeTrapsGauge.set(count);
  }
  
  /**
   * Update contagion graph metrics
   */
  updateContagionGraph(nodes, edges, clusters, confirmedBots) {
    this.contagionNodesGauge.set(nodes);
    this.contagionEdgesGauge.set(edges);
    this.contagionClustersGauge.set(clusters);
    this.confirmedBotsGauge.set(confirmedBots);
  }
  
  /**
   * Record neural network prediction
   */
  recordNeuralPrediction(prediction) {
    this.neuralPredictionsTotal.inc({ prediction });
  }
  
  /**
   * Update neural network accuracy
   */
  updateNeuralAccuracy(accuracy) {
    this.neuralAccuracyGauge.set(accuracy);
  }
  
  /**
   * Record challenge issued
   */
  recordChallengeIssued(difficulty) {
    this.challengesIssuedTotal.inc({ difficulty: difficulty.toString() });
  }
  
  /**
   * Record challenge solved
   */
  recordChallengeSolved(success) {
    this.challengesSolvedTotal.inc({ success: success.toString() });
  }
  
  /**
   * Update WebSocket clients count
   */
  updateWebSocketClients(count) {
    this.websocketClientsGauge.set(count);
  }
  
  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(type) {
    this.websocketMessagesTotal.inc({ type });
  }
  
  /**
   * Update health status
   */
  updateHealthStatus(healthy) {
    this.healthStatusGauge.set(healthy ? 1 : 0);
  }
  
  /**
   * Update component health
   */
  updateComponentHealth(component, healthy) {
    this.componentHealthGauge.set({ component }, healthy ? 1 : 0);
  }
  
  /**
   * Get metrics in Prometheus format
   */
  getMetrics() {
    return this.register.metrics();
  }
  
  /**
   * Get content type for metrics endpoint
   */
  getContentType() {
    return this.register.contentType;
  }
  
  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.register.clear();
    this.initializeMetrics();
  }
}

module.exports = MetricsCollector;

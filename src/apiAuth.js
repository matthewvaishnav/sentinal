/**
 * SENTINEL — API Authentication & Authorization
 * 
 * Protects admin endpoints from unauthorized access and abuse.
 * 
 * Features:
 * - API key authentication
 * - Separate rate limiting for admin actions
 * - Audit logging of API usage
 * - Defense against insider threats
 */

const crypto = require('crypto');
const eventBus = require('./eventBus');
const log = require('./logger');

class APIAuthManager {
  constructor(config = {}) {
    // Load API keys from environment
    const apiKeysEnv = process.env.SENTINEL_API_KEYS || '';
    this.apiKeys = new Set(
      apiKeysEnv.split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
    );
    
    // Track API usage for audit trail
    this.usageLog = new Map(); // apiKey → { requests: [], lastUsed: timestamp }
    
    // Rate limiting for API endpoints
    this.rateLimitWindowMs = config.rateLimitWindowMs || 60000; // 1 minute
    this.maxRequestsPerWindow = config.maxRequestsPerWindow || 10;
    this.requestTimestamps = new Map(); // apiKey → [timestamps]
    
    // Warn if no API keys configured
    if (this.apiKeys.size === 0) {
      log.warn('No API keys configured - admin endpoints unprotected', {
        component: 'api_auth',
        recommendation: 'Set SENTINEL_API_KEYS environment variable'
      });
    } else {
      log.info('API authentication initialized', {
        component: 'api_auth',
        keyCount: this.apiKeys.size
      });
    }
  }
  
  /**
   * Generate a secure API key
   * @returns {string} A cryptographically secure API key
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Authenticate an API request
   * @param {string} apiKey - The API key from request header
   * @returns {Object} { valid: boolean, reason?: string }
   */
  authenticate(apiKey) {
    if (!apiKey) {
      return { valid: false, reason: 'missing_api_key' };
    }
    
    if (!this.apiKeys.has(apiKey)) {
      return { valid: false, reason: 'invalid_api_key' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check rate limit for API key
   * @param {string} apiKey - The API key
   * @returns {Object} { allowed: boolean, remaining: number, retryAfter?: number }
   */
  checkRateLimit(apiKey) {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindowMs;
    
    // Get or initialize timestamps for this key
    if (!this.requestTimestamps.has(apiKey)) {
      this.requestTimestamps.set(apiKey, []);
    }
    
    const timestamps = this.requestTimestamps.get(apiKey);
    
    // Remove timestamps outside the window
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }
    
    // Check if limit exceeded
    if (timestamps.length >= this.maxRequestsPerWindow) {
      const oldestInWindow = timestamps[0];
      const retryAfter = Math.ceil((oldestInWindow + this.rateLimitWindowMs - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter
      };
    }
    
    // Add current request
    timestamps.push(now);
    
    return {
      allowed: true,
      remaining: this.maxRequestsPerWindow - timestamps.length
    };
  }
  
  /**
   * Log API usage for audit trail
   * @param {string} apiKey - The API key (hashed for privacy)
   * @param {Object} request - Request details
   */
  logUsage(apiKey, request) {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8);
    
    if (!this.usageLog.has(keyHash)) {
      this.usageLog.set(keyHash, { requests: [], lastUsed: 0 });
    }
    
    const log = this.usageLog.get(keyHash);
    log.requests.push({
      timestamp: Date.now(),
      method: request.method,
      path: request.path,
      ip: request.ip,
      body: request.body ? Object.keys(request.body) : []
    });
    log.lastUsed = Date.now();
    
    // Keep only last 100 requests per key
    if (log.requests.length > 100) {
      log.requests.shift();
    }
    
    // Emit audit event
    eventBus.logEvent('API', `API call: ${request.method} ${request.path} [key: ${keyHash}]`);
  }
  
  /**
   * Get usage statistics
   * @returns {Object} Usage stats
   */
  getStats() {
    const stats = {
      totalKeys: this.apiKeys.size,
      activeKeys: this.usageLog.size,
      recentActivity: []
    };
    
    for (const [keyHash, log] of this.usageLog.entries()) {
      stats.recentActivity.push({
        keyHash,
        requestCount: log.requests.length,
        lastUsed: log.lastUsed,
        recentRequests: log.requests.slice(-5)
      });
    }
    
    return stats;
  }
  
  /**
   * Express middleware for API authentication
   */
  middleware() {
    return (req, res, next) => {
      const apiKey = req.headers['x-sentinel-api-key'];
      
      // Authenticate
      const authResult = this.authenticate(apiKey);
      if (!authResult.valid) {
        eventBus.logEvent('WARN', `Unauthorized API access attempt from ${req.ip || 'unknown'}`);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Valid API key required. Provide X-Sentinel-API-Key header.'
        });
      }
      
      // Check rate limit
      const rateLimitResult = this.checkRateLimit(apiKey);
      if (!rateLimitResult.allowed) {
        eventBus.logEvent('WARN', `API rate limit exceeded for key ${apiKey.substring(0, 8)}...`);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'API rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        });
      }
      
      // Log usage
      this.logUsage(apiKey, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        body: req.body
      });
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequestsPerWindow);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', Date.now() + this.rateLimitWindowMs);
      
      next();
    };
  }
}

module.exports = APIAuthManager;

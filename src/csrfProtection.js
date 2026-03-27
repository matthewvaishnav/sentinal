/**
 * SENTINEL — CSRF Protection
 * 
 * Lightweight CSRF (Cross-Site Request Forgery) protection for dashboard endpoints.
 * 
 * How CSRF Works:
 * 1. Attacker creates malicious site with form/script
 * 2. User visits malicious site while using SENTINEL dashboard
 * 3. Malicious site makes request to SENTINEL from user's browser
 * 4. SENTINEL executes action (e.g., block IP) without user's knowledge
 * 
 * Protection Mechanism:
 * 1. Generate unique token when dashboard is loaded
 * 2. Embed token in dashboard JavaScript
 * 3. Require token in X-CSRF-Token header for state-changing requests
 * 4. Reject requests with missing/invalid tokens
 * 
 * Note: This works alongside API key authentication for defense in depth.
 * API keys protect against unauthorized access, CSRF tokens protect against
 * confused deputy attacks where the user's browser is tricked into making requests.
 */

const crypto = require('crypto');
const eventBus = require('./eventBus');
const log = require('./logger');

class CSRFProtection {
  constructor(config = {}) {
    this.tokenExpiry = config.tokenExpiry || 86400000; // 24 hours
    this.headerName = config.headerName || 'x-csrf-token';
    this.tokens = new Map(); // token → { created: timestamp, used: count, ip: string }
    
    // Periodic cleanup of expired tokens
    setInterval(() => this._cleanupExpiredTokens(), 3600000); // Every hour
    
    log.info('CSRF protection initialized', {
      component: 'csrf',
      tokenExpiry: this.tokenExpiry,
      headerName: this.headerName
    });
  }
  
  /**
   * Generate a cryptographically secure CSRF token
   * @param {string} ip - Client IP address
   * @returns {string} 64-character hex token
   */
  generateToken(ip) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokens.set(token, {
      created: Date.now(),
      used: 0,
      ip: ip
    });
    return token;
  }
  
  /**
   * Validate a CSRF token
   * @param {string} token - The token to validate
   * @param {string} ip - Client IP address
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validateToken(token, ip) {
    if (!token) {
      return { valid: false, reason: 'missing_token' };
    }
    
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return { valid: false, reason: 'invalid_token' };
    }
    
    // Check expiration
    const age = Date.now() - tokenData.created;
    if (age > this.tokenExpiry) {
      this.tokens.delete(token);
      return { valid: false, reason: 'expired_token' };
    }
    
    // Optional: Bind token to IP (can be disabled for proxies)
    // if (tokenData.ip !== ip) {
    //   return { valid: false, reason: 'ip_mismatch' };
    // }
    
    // Update usage count
    tokenData.used++;
    
    return { valid: true };
  }
  
  /**
   * Clean up expired tokens
   */
  _cleanupExpiredTokens() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [token, data] of this.tokens.entries()) {
      if (now - data.created > this.tokenExpiry) {
        this.tokens.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      eventBus.logEvent('INFO', `[CSRF] Cleaned up ${cleaned} expired tokens`);
    }
  }
  
  /**
   * Express middleware to inject CSRF token into dashboard
   * Use this for GET /dashboard
   */
  injectToken() {
    return (req, res, next) => {
      // Generate token for this client
      const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
      const token = this.generateToken(ip);
      
      // Make token available to response
      res.locals.csrfToken = token;
      req.csrfToken = () => token;
      
      next();
    };
  }
  
  /**
   * Express middleware to validate CSRF token (optional mode)
   * Use this for POST/PUT/DELETE requests from dashboard
   * If API key is present, CSRF is optional (for API clients)
   * If no API key, CSRF is required (for dashboard users)
   */
  validateRequest(optional = false) {
    return (req, res, next) => {
      // Skip validation for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // If API key is present, CSRF is optional (API clients)
      const hasAPIKey = req.headers['x-sentinel-api-key'];
      if (hasAPIKey && optional) {
        return next();
      }
      
      // Get token from header or body
      const token = req.headers[this.headerName] || 
                    req.body?._csrf ||
                    req.query?._csrf;
      
      // If optional and no token, allow (for backwards compatibility)
      if (optional && !token) {
        return next();
      }
      
      const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
      
      // Validate token
      const validation = this.validateToken(token, ip);
      if (!validation.valid) {
        eventBus.logEvent('WARN', `[CSRF] Invalid token from ${ip}: ${validation.reason}`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid or missing CSRF token. Reload the dashboard to get a new token.',
          reason: validation.reason
        });
      }
      
      next();
    };
  }
  
  /**
   * Get statistics
   * @returns {Object} CSRF protection stats
   */
  getStats() {
    const now = Date.now();
    let activeTokens = 0;
    let expiredTokens = 0;
    let totalUsage = 0;
    
    for (const [token, data] of this.tokens.entries()) {
      const age = now - data.created;
      if (age > this.tokenExpiry) {
        expiredTokens++;
      } else {
        activeTokens++;
        totalUsage += data.used;
      }
    }
    
    return {
      activeTokens,
      expiredTokens,
      totalUsage,
      averageUsage: activeTokens > 0 ? (totalUsage / activeTokens).toFixed(2) : 0
    };
  }
}

module.exports = CSRFProtection;

/**
 * SENTINEL — Configuration
 * 
 * Centralized configuration for all modules.
 * Reads from environment variables with sensible defaults.
 */

require('dotenv').config();

const CONFIG = {
  port: parseInt(process.env.PORT, 10) || 3000,
  redis: {
    url: process.env.REDIS_URL || ''
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 10000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 80,
    blockDurationMs: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION_MS, 10) || 60000
  },
  fingerprint: {
    botThreshold: parseFloat(process.env.FINGERPRINT_BOT_THRESHOLD) || 3.0,
    suspectThreshold: parseFloat(process.env.FINGERPRINT_SUSPECT_THRESHOLD) || 5.5
  },
  challenge: {
    defaultDifficulty: parseInt(process.env.CHALLENGE_DEFAULT_DIFFICULTY, 10) || 2
  },
  allowlist: {
    ips: process.env.ALLOWLIST_IPS
      ? process.env.ALLOWLIST_IPS.split(',').map(s => s.trim()).filter(Boolean)
      : ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    cidrs: process.env.ALLOWLIST_CIDRS
      ? process.env.ALLOWLIST_CIDRS.split(',').map(s => s.trim()).filter(Boolean)
      : []
  },
  apiAuth: {
    rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequestsPerWindow: parseInt(process.env.API_MAX_REQUESTS_PER_WINDOW, 10) || 10
  },
  p2p: {
    port: parseInt(process.env.P2P_PORT, 10) || 4000,
    peers: process.env.SENTINEL_PEERS ? process.env.SENTINEL_PEERS.split(',').map(p => p.trim()) : []
  }
};

module.exports = CONFIG;

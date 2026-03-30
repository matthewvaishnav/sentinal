/**
 * SENTINEL — Distributed State Adapter
 * 
 * Abstracts state management for Sentinel modules.
 * - If REDIS_URL is provided, connects to a distributed Redis cluster.
 * - Otherwise falls back to an in-memory Map implementation (for tests/local dev).
 */

const Redis = require('ioredis');
const log = require('../logger');

class RedisAdapter {
  constructor(config = {}) {
    this.enabled = !!config.url;
    if (this.enabled) {
      this.client = new Redis(config.url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
      this.client.on('error', (err) => log.error('Redis Adapter Error', { error: err.message }));
      this.client.on('connect', () => log.info('Redis Adapter Connected Successfully'));
    } else {
      this.store = new Map();
      log.info('Redis disabled: StateAdapter using local memory fallback');
    }
  }

  /**
   * Tracks a request in a sliding window using Sorted Sets (Redis ZADD)
   * or memory fallback. Returns the count of requests in the active window.
   */
  async recordSlidingWindow(ip, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = `sentinel:sliding:${ip}`;

    if (this.enabled) {
      // Execute atomically using a pipeline
      const p = this.client.pipeline();
      // Remove timestamps older than window
      p.zremrangebyscore(key, 0, windowStart);
      // Get the new count BEFORE adding
      p.zcard(key);
      // Add the current timestamp (score = now, value = now + random to prevent collisions)
      p.zadd(key, now, `${now}_${Math.random()}`);
      // Set expiration so stale keys don't clutter DB
      p.pexpire(key, windowMs);
      
      const results = await p.exec();
      const countBefore = results[1][1];
      return countBefore + 1; // +1 for the current request we just added
    } else {
      // Memory Fallback
      if (!this.store.has(key)) this.store.set(key, []);
      let timestamps = this.store.get(key);
      timestamps = timestamps.filter(t => t > windowStart);
      timestamps.push(now);
      this.store.set(key, timestamps);
      return timestamps.length;
    }
  }

  /**
   * Checks if an IP is currently serving a mandatory block penalty
   */
  async isBlocked(ip) {
    const key = `sentinel:block:${ip}`;
    if (this.enabled) {
      const pttl = await this.client.pttl(key);
      if (pttl > 0) return { blocked: true, msRemaining: pttl };
      return { blocked: false };
    } else {
      const expireTime = this.store.get(key);
      if (expireTime && expireTime > Date.now()) {
        return { blocked: true, msRemaining: expireTime - Date.now() };
      }
      return { blocked: false };
    }
  }

  /**
   * Enforces a hard block on an IP
   */
  async blockIP(ip, durationMs, violationCount = 1) {
    const key = `sentinel:block:${ip}`;
    const vioKey = `sentinel:violations:${ip}`;
    if (this.enabled) {
      const p = this.client.pipeline();
      p.set(key, '1', 'PX', durationMs);
      p.incrby(vioKey, violationCount);
      p.pexpire(vioKey, 86400000); // Remember violations for 24h
      await p.exec();
    } else {
      this.store.set(key, Date.now() + durationMs);
      this.store.set(vioKey, (this.store.get(vioKey) || 0) + violationCount);
    }
  }

  /**
   * Gets total historical violations for an IP (for exponential backoff)
   */
  async getViolations(ip) {
    const key = `sentinel:violations:${ip}`;
    if (this.enabled) {
      const v = await this.client.get(key);
      return v ? parseInt(v, 10) : 0;
    } else {
      return this.store.get(key) || 0;
    }
  }

  /**
   * Hashmap get/set for Fingerprint profiles
   */
  async setProfile(ip, profileObj) {
    const key = `sentinel:profile:${ip}`;
    const payload = JSON.stringify(profileObj);
    if (this.enabled) {
      await this.client.set(key, payload, 'EX', 600); // 10 min expiry
    } else {
      this.store.set(key, { payload, expires: Date.now() + 600000 });
    }
  }

  async getProfile(ip) {
    const key = `sentinel:profile:${ip}`;
    if (this.enabled) {
      const val = await this.client.get(key);
      return val ? JSON.parse(val) : null;
    } else {
      const record = this.store.get(key);
      if (!record) return null;
      if (Date.now() > record.expires) {
        this.store.delete(key);
        return null;
      }
      return JSON.parse(record.payload);
    }
  }

  async disconnect() {
    if (this.enabled) {
      await this.client.quit();
    }
  }
}

module.exports = RedisAdapter;

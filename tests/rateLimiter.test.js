const RateLimiter = require('../src/rateLimiter');
const RedisAdapter = require('../src/state/RedisAdapter');

describe('RateLimiter (Distributed Async)', () => {
  let limiter;
  let stateAdapter;
  
  beforeEach(() => {
    stateAdapter = new RedisAdapter(); // Uses memory fallback by default
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 5,
      blockDurationMs: 5000
    }, stateAdapter);
  });

  afterEach(async () => {
    limiter.stop();
    await stateAdapter.disconnect();
  });
  
  describe('check()', () => {
    test('allows requests under limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('1.2.3.4');
        expect(result.allowed).toBe(true);
        expect(result.count).toBe(i + 1);
      }
    });
    
    test('blocks requests over limit', async () => {
      // Fill up the window
      for (let i = 0; i < 5; i++) {
        await limiter.check('1.2.3.4');
      }
      
      // Next request should be blocked
      const result = await limiter.check('1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rate_exceeded');
    });
    
    test('sliding window removes old timestamps', async () => {
      // Fill up the window
      for (let i = 0; i < 5; i++) {
        await limiter.check('1.2.3.4');
      }
      
      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should allow new requests
      const result = await limiter.check('1.2.3.4');
      expect(result.allowed).toBe(true);
    });
    
    test('tracks violations correctly', async () => {
      // Trigger multiple violations
      for (let i = 0; i < 10; i++) {
        await limiter.check('1.2.3.4');
      }
      
      const violations = await stateAdapter.getViolations('1.2.3.4');
      expect(violations).toBeGreaterThan(0);
    });
    
    test('isolates different IPs', async () => {
      // Fill up IP1
      for (let i = 0; i < 5; i++) {
        await limiter.check('1.2.3.4');
      }
      
      // IP2 should still be allowed
      const result = await limiter.check('5.6.7.8');
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('forceBlock()', () => {
    test('blocks IP immediately', async () => {
      await limiter.forceBlock('1.2.3.4', 5000);
      
      const result = await limiter.check('1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blocked');
    });
    
    test('respects block duration', async () => {
      await limiter.forceBlock('1.2.3.4', 500);
      
      // Should be blocked initially
      expect((await limiter.check('1.2.3.4')).allowed).toBe(false);
      
      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be allowed again
      expect((await limiter.check('1.2.3.4')).allowed).toBe(true);
    });
  });
  
  describe('unblock()', () => {
    test('removes block immediately', async () => {
      await limiter.forceBlock('1.2.3.4', 60000);
      expect((await limiter.check('1.2.3.4')).allowed).toBe(false);
      
      await limiter.unblock('1.2.3.4');
      expect((await limiter.check('1.2.3.4')).allowed).toBe(true);
    });
  });
  
  describe('getBlockedIPs()', () => {
    test('returns all blocked IPs', async () => {
      await limiter.forceBlock('1.2.3.4', 5000);
      await limiter.forceBlock('5.6.7.8', 5000);
      
      const blocked = await limiter.getBlockedIPs();
      expect(blocked).toHaveLength(2);
      expect(blocked.map(b => b.ip)).toContain('1.2.3.4');
      expect(blocked.map(b => b.ip)).toContain('5.6.7.8');
    });
  });
});

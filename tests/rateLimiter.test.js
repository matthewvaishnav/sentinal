const RateLimiter = require('../src/rateLimiter');

describe('RateLimiter', () => {
  let limiter;
  
  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 5,
      blockDurationMs: 5000
    });
  });
  
  describe('check()', () => {
    test('allows requests under limit', () => {
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('1.2.3.4');
        expect(result.allowed).toBe(true);
        expect(result.count).toBe(i + 1);
      }
    });
    
    test('blocks requests over limit', () => {
      // Fill up the window
      for (let i = 0; i < 5; i++) {
        limiter.check('1.2.3.4');
      }
      
      // Next request should be blocked
      const result = limiter.check('1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rate_exceeded');
    });
    
    test('sliding window removes old timestamps', async () => {
      // Fill up the window
      for (let i = 0; i < 5; i++) {
        limiter.check('1.2.3.4');
      }
      
      // Wait for window to slide
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should allow new requests
      const result = limiter.check('1.2.3.4');
      expect(result.allowed).toBe(true);
    });
    
    test('tracks violations correctly', () => {
      // Trigger multiple violations
      for (let i = 0; i < 10; i++) {
        limiter.check('1.2.3.4');
      }
      
      const stats = limiter.getStats('1.2.3.4');
      expect(stats.violations).toBeGreaterThan(0);
    });
    
    test('isolates different IPs', () => {
      // Fill up IP1
      for (let i = 0; i < 5; i++) {
        limiter.check('1.2.3.4');
      }
      
      // IP2 should still be allowed
      const result = limiter.check('5.6.7.8');
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('forceBlock()', () => {
    test('blocks IP immediately', () => {
      limiter.forceBlock('1.2.3.4', 5000);
      
      const result = limiter.check('1.2.3.4');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blocked');
    });
    
    test('respects block duration', async () => {
      limiter.forceBlock('1.2.3.4', 500);
      
      // Should be blocked initially
      expect(limiter.check('1.2.3.4').allowed).toBe(false);
      
      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should be allowed again
      expect(limiter.check('1.2.3.4').allowed).toBe(true);
    });
  });
  
  describe('unblock()', () => {
    test('removes block immediately', () => {
      limiter.forceBlock('1.2.3.4', 60000);
      expect(limiter.check('1.2.3.4').allowed).toBe(false);
      
      limiter.unblock('1.2.3.4');
      expect(limiter.check('1.2.3.4').allowed).toBe(true);
    });
  });
  
  describe('getBlockedIPs()', () => {
    test('returns all blocked IPs', () => {
      limiter.forceBlock('1.2.3.4', 5000);
      limiter.forceBlock('5.6.7.8', 5000);
      
      const blocked = limiter.getBlockedIPs();
      expect(blocked).toHaveLength(2);
      expect(blocked.map(b => b.ip)).toContain('1.2.3.4');
      expect(blocked.map(b => b.ip)).toContain('5.6.7.8');
    });
  });
});

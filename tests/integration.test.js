/**
 * SENTINEL — Integration Tests
 * 
 * Verifies the full middleware pipeline and API routes.
 */

const request = require('supertest');

// Set API keys before requiring server so they are loaded by APIAuthManager
const apiKey = 'test-integration-key';
process.env.SENTINEL_API_KEYS = apiKey;

const { app, rateLimiter, allowlist, honeypots, fingerprinter, challenges, csrfProtection, contagionGraph } = require('../server');

describe('SENTINEL Integration', () => {
  beforeEach(() => {
    // Reset components to clean state
    rateLimiter.unblockAll ? rateLimiter.unblockAll() : null;
    allowlist.allowedIPs.clear();
    allowlist.add('127.0.0.1');
    allowlist.add('::1');
  });
  
  afterAll(() => {
    // Clean up timers to prevent test leaks
    if (honeypots && honeypots.close) honeypots.close();
    if (challenges && challenges.close) challenges.close();
    if (contagionGraph && contagionGraph.stop) contagionGraph.stop();
    if (csrfProtection && csrfProtection._cleanupInterval) {
      clearInterval(csrfProtection._cleanupInterval);
    }
  });

  describe('Public Endpoints', () => {
    test('GET / should return 200 and mention protection', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Protected by SENTINEL');
    });

    test('GET /sentinel/stats should return stats JSON', async () => {
      const res = await request(app).get('/sentinel/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reqPerSec');
      expect(res.body).toHaveProperty('blockedIPCount');
    });
  });

  describe('Security Pipeline', () => {
    test('layer 0: allowlist should bypass checks', async () => {
      // Add IP to allowlist
      allowlist.add('1.1.1.1');
      
      const res = await request(app)
        .get('/')
        .set('X-Forwarded-For', '1.1.1.1');
        
      expect(res.status).toBe(200);
      expect(res.text).toContain('IP: 1.1.1.1');
    });

    test('layer 1: honeypot should auto-block', async () => {
      const trapPath = honeypots.getTrapPaths()[0];
      
      // First hit to trap
      const res1 = await request(app)
        .get(trapPath)
        .set('X-Forwarded-For', '2.2.2.2');
        
      expect(res1.status).toBe(404);
      
      // Subsequent hit to anywhere should be blocked by rate limiter
      const res2 = await request(app)
        .get('/')
        .set('X-Forwarded-For', '2.2.2.2');
        
      expect(res2.status).toBe(429);
      expect(res2.body.error).toMatch(/Too many requests|Rate limit exceeded/);
    });

    test('layer 2: rate limit enforcement', async () => {
      const ip = '3.3.3.3';
      
      // Force block the IP
      rateLimiter.forceBlock(ip, 60000);
      
      const res = await request(app)
        .get('/')
        .set('X-Forwarded-For', ip);
        
      expect(res.status).toBe(429);
    });
  });

  describe('Protected API Routes', () => {
    test('accessing /sentinel/traps without key should fail', async () => {
      const res = await request(app).get('/sentinel/traps');
      expect(res.status).toBe(401);
    });

    test('accessing /sentinel/traps with valid key should succeed', async () => {
      const res = await request(app)
        .get('/sentinel/traps')
        .set('x-sentinel-api-key', apiKey);
        
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('traps');
    });

    test('manual block via API should work', async () => {
      const res = await request(app)
        .post('/sentinel/block')
        .set('x-sentinel-api-key', apiKey)
        .send({ ip: '4.4.4.4', durationMs: 10000 });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Verify it's blocked
      const checkRes = await request(app)
        .get('/')
        .set('X-Forwarded-For', '4.4.4.4');
      expect(checkRes.status).toBe(429);
    });
  });
});

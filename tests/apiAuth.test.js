// Mock logger and eventBus to prevent side effects
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../src/eventBus', () => ({
  logEvent: jest.fn(),
}));

const APIAuthManager = require('../src/apiAuth');

describe('APIAuthManager', () => {
  let auth;

  beforeEach(() => {
    process.env.SENTINEL_API_KEYS = 'test-key-1,test-key-2';
    auth = new APIAuthManager({
      rateLimitWindowMs: 1000,
      maxRequestsPerWindow: 3
    });
  });

  afterEach(() => {
    delete process.env.SENTINEL_API_KEYS;
  });

  describe('authenticate', () => {
    test('rejects missing API key', () => {
      const result = auth.authenticate(null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing_api_key');
    });

    test('rejects invalid API key', () => {
      const result = auth.authenticate('wrong-key');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_api_key');
    });

    test('accepts valid API key', () => {
      const result = auth.authenticate('test-key-1');
      expect(result.valid).toBe(true);
    });

    test('accepts second valid API key', () => {
      const result = auth.authenticate('test-key-2');
      expect(result.valid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('allows requests within limit', () => {
      const r1 = auth.checkRateLimit('test-key-1');
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
    });

    test('blocks after limit exceeded', () => {
      auth.checkRateLimit('test-key-1');
      auth.checkRateLimit('test-key-1');
      auth.checkRateLimit('test-key-1');
      const result = auth.checkRateLimit('test-key-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    test('rate limits are per-key', () => {
      auth.checkRateLimit('test-key-1');
      auth.checkRateLimit('test-key-1');
      auth.checkRateLimit('test-key-1');
      // key-2 should still be allowed
      const result = auth.checkRateLimit('test-key-2');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Usage Logging', () => {
    test('logs API usage', () => {
      auth.logUsage('test-key-1', {
        method: 'POST',
        path: '/sentinel/block',
        ip: '127.0.0.1',
        body: { ip: '1.2.3.4' }
      });
      const stats = auth.getStats();
      expect(stats.activeKeys).toBe(1);
      expect(stats.recentActivity.length).toBe(1);
    });
  });

  describe('Middleware', () => {
    test('returns a function', () => {
      const mw = auth.middleware();
      expect(typeof mw).toBe('function');
    });

    test('rejects request without API key', () => {
      const mw = auth.middleware();
      const req = { headers: {}, ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('calls next for valid API key', () => {
      const mw = auth.middleware();
      const req = {
        headers: { 'x-sentinel-api-key': 'test-key-1' },
        ip: '127.0.0.1',
        method: 'GET',
        path: '/sentinel/stats',
        body: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateKey', () => {
    test('generates 64-character hex key', () => {
      const key = APIAuthManager.generateKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });
  });
});

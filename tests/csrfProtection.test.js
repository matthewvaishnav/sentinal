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

const CSRFProtection = require('../src/csrfProtection');

describe('CSRFProtection', () => {
  let csrf;

  beforeEach(() => {
    csrf = new CSRFProtection({ tokenExpiry: 5000 }); // 5s expiry for tests
  });

  describe('Token Generation', () => {
    test('generates 64-character hex token', () => {
      const token = csrf.generateToken('127.0.0.1');
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    test('generates unique tokens', () => {
      const t1 = csrf.generateToken('127.0.0.1');
      const t2 = csrf.generateToken('127.0.0.1');
      expect(t1).not.toBe(t2);
    });
  });

  describe('Token Validation', () => {
    test('validates valid token', () => {
      const token = csrf.generateToken('127.0.0.1');
      const result = csrf.validateToken(token, '127.0.0.1');
      expect(result.valid).toBe(true);
    });

    test('rejects missing token', () => {
      const result = csrf.validateToken(null, '127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing_token');
    });

    test('rejects invalid token', () => {
      const result = csrf.validateToken('nonexistent', '127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_token');
    });

    test('rejects expired token', () => {
      const token = csrf.generateToken('127.0.0.1');
      // Expire it manually
      const data = csrf.tokens.get(token);
      data.created = Date.now() - 10000; // 10s ago, expiry is 5s

      const result = csrf.validateToken(token, '127.0.0.1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired_token');
    });

    test('tracks usage count', () => {
      const token = csrf.generateToken('127.0.0.1');
      csrf.validateToken(token, '127.0.0.1');
      csrf.validateToken(token, '127.0.0.1');
      const data = csrf.tokens.get(token);
      expect(data.used).toBe(2);
    });
  });

  describe('Middleware - injectToken', () => {
    test('injects token into response locals', () => {
      const mw = csrf.injectToken();
      const req = { ip: '127.0.0.1' };
      const res = { locals: {} };
      const next = jest.fn();

      mw(req, res, next);
      expect(res.locals.csrfToken).toBeDefined();
      expect(req.csrfToken()).toBeDefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Middleware - validateRequest', () => {
    test('skips GET requests', () => {
      const mw = csrf.validateRequest();
      const req = { method: 'GET', headers: {} };
      const res = {};
      const next = jest.fn();

      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('skips HEAD requests', () => {
      const mw = csrf.validateRequest();
      const req = { method: 'HEAD', headers: {} };
      const next = jest.fn();

      mw(req, {}, next);
      expect(next).toHaveBeenCalled();
    });

    test('rejects POST without token', () => {
      const mw = csrf.validateRequest();
      const req = { method: 'POST', headers: {}, ip: '127.0.0.1' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      mw(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('accepts POST with valid token in header', () => {
      const token = csrf.generateToken('127.0.0.1');
      const mw = csrf.validateRequest();
      const req = {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        ip: '127.0.0.1'
      };
      const res = {};
      const next = jest.fn();

      mw(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('optional mode allows API key without CSRF', () => {
      const mw = csrf.validateRequest(true);
      const req = {
        method: 'POST',
        headers: { 'x-sentinel-api-key': 'some-key' },
        ip: '127.0.0.1'
      };
      const next = jest.fn();

      mw(req, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Stats', () => {
    test('returns stats object', () => {
      csrf.generateToken('1.1.1.1');
      csrf.generateToken('2.2.2.2');
      const stats = csrf.getStats();
      expect(stats.activeTokens).toBe(2);
      expect(stats).toHaveProperty('totalUsage');
    });
  });
});

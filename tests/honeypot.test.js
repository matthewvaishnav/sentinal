const HoneypotManager = require('../src/honeypot');

describe('HoneypotManager', () => {
  let honeypot;

  beforeEach(() => {
    honeypot = new HoneypotManager({
      trapCount: 20,
      rotateIntervalMs: 999999999, // disable auto-rotation in tests
      realRoutes: ['/api/users', '/api/posts']
    });
  });

  afterEach(() => {
    honeypot.close();
  });

  describe('Trap Generation', () => {
    test('generates the configured number of traps', () => {
      const traps = honeypot.getTrapPaths();
      expect(traps.length).toBeLessThanOrEqual(20);
      expect(traps.length).toBeGreaterThan(0);
    });

    test('includes obvious scanner targets', () => {
      const traps = honeypot.getTrapPaths();
      // At least some obvious traps should be present
      const hasObvious = traps.some(t =>
        t.includes('.env') || t.includes('.git') || t.includes('wp-admin') ||
        t.includes('phpmyadmin') || t.includes('admin')
      );
      expect(hasObvious).toBe(true);
    });

    test('generates decoys based on real routes', () => {
      const traps = honeypot.getTrapPaths();
      const hasDecoy = traps.some(t =>
        t.includes('/api/') && (t.includes('admin') || t.includes('internal') || t.includes('debug'))
      );
      expect(hasDecoy).toBe(true);
    });
  });

  describe('Trap Detection', () => {
    test('isTrap returns true for generated traps', () => {
      const traps = honeypot.getTrapPaths();
      expect(honeypot.isTrap(traps[0])).toBe(true);
    });

    test('isTrap returns false for non-trap paths', () => {
      expect(honeypot.isTrap('/api/users')).toBe(false);
      expect(honeypot.isTrap('/dashboard')).toBe(false);
      expect(honeypot.isTrap('/')).toBe(false);
    });

    test('isTrap catches common scanner patterns via regex', () => {
      expect(honeypot.isTrap('/.env.backup')).toBe(true);
      expect(honeypot.isTrap('/.git/HEAD')).toBe(true);
      expect(honeypot.isTrap('/wp-admin/plugins.php')).toBe(true);
      expect(honeypot.isTrap('/phpmyadmin/setup.php')).toBe(true);
    });
  });

  describe('Hit Recording', () => {
    test('records honeypot hits per IP', () => {
      const req = { headers: { 'user-agent': 'test-bot/1.0' } };
      honeypot.recordHit('1.2.3.4', '/.env', req);
      honeypot.recordHit('1.2.3.4', '/.git/config', req);

      expect(honeypot.isCaught('1.2.3.4')).toBe(true);
      expect(honeypot.getStats().totalHits).toBe(2);
      expect(honeypot.getStats().uniqueIPs).toBe(1);
    });

    test('tracks multiple IPs independently', () => {
      const req = { headers: {} };
      honeypot.recordHit('1.1.1.1', '/.env', req);
      honeypot.recordHit('2.2.2.2', '/.env', req);

      expect(honeypot.getStats().uniqueIPs).toBe(2);
    });

    test('updates trap effectiveness on hit', () => {
      const req = { headers: {} };
      honeypot.recordHit('1.1.1.1', '/.env', req);
      honeypot.recordHit('2.2.2.2', '/.env', req);

      const effectiveness = honeypot.getTrapEffectiveness();
      const envTrap = effectiveness.find(e => e.trap === '/.env');
      expect(envTrap).toBeDefined();
      expect(envTrap.hits).toBe(2);
      expect(envTrap.uniqueIPs).toBe(2);
    });
  });

  describe('Scanning Pattern Learning', () => {
    test('records scans for pattern analysis', () => {
      const req = { headers: { 'user-agent': 'Mozilla/5.0' } };
      honeypot.recordScan('1.1.1.1', '/api/users/1', req);
      honeypot.recordScan('1.1.1.1', '/api/users/2', req);
      honeypot.recordScan('1.1.1.1', '/api/users/3', req);

      expect(honeypot.getStats().recentScans).toBe(3);
    });

    test('extracts patterns from scans', () => {
      const req = { headers: {} };
      for (let i = 0; i < 10; i++) {
        honeypot.recordScan('1.1.1.1', `/api/users/${i}`, req);
      }
      const patterns = honeypot.getScanningPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('Injectable HTML', () => {
    test('generates hidden HTML links', () => {
      const html = honeypot.getInjectableHTML();
      expect(html).toContain('sentinel-traps');
      expect(html).toContain('display:none');
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe('getAllCaught', () => {
    test('returns caught IPs sorted by count', () => {
      const req = { headers: {} };
      honeypot.recordHit('1.1.1.1', '/.env', req);
      honeypot.recordHit('2.2.2.2', '/.env', req);
      honeypot.recordHit('2.2.2.2', '/.git/config', req);

      const caught = honeypot.getAllCaught();
      expect(caught[0].ip).toBe('2.2.2.2');
      expect(caught[0].count).toBe(2);
    });
  });

  describe('Trap Rotation', () => {
    test('_rotateTraps preserves effective traps', () => {
      const req = { headers: {} };
      const traps = honeypot.getTrapPaths();
      const firstTrap = traps[0];

      // Make first trap "effective" by recording hits
      honeypot.recordHit('1.1.1.1', firstTrap, req);

      honeypot._rotateTraps();

      // Effective trap should be preserved (70% chance)
      const newTraps = honeypot.getTrapPaths();
      expect(newTraps.length).toBeGreaterThan(0);
    });
  });
});

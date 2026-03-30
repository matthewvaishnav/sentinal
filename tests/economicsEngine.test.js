const AttackerEconomicsEngine = require('../src/economicsEngine');

describe('AttackerEconomicsEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new AttackerEconomicsEngine();
  });

  describe('Request Recording', () => {
    test('creates profile on first request', () => {
      engine.recordRequest('1.1.1.1');
      const profile = engine.getProfile('1.1.1.1');
      expect(profile).toBeDefined();
      expect(profile.requestCount).toBe(1);
    });

    test('increments request count', () => {
      engine.recordRequest('1.1.1.1');
      engine.recordRequest('1.1.1.1');
      engine.recordRequest('1.1.1.1');
      expect(engine.getProfile('1.1.1.1').requestCount).toBe(3);
    });

    test('tracks challenge metrics', () => {
      engine.recordRequest('2.2.2.2', { wasChallenged: true });
      expect(engine.getProfile('2.2.2.2').challengesSent).toBe(1);
    });

    test('estimates cost when challenge solved', () => {
      engine.recordRequest('3.3.3.3', {
        solved: true,
        solveTimeMs: 500,
        wasChallenged: true
      });
      const profile = engine.getProfile('3.3.3.3');
      expect(profile.challengesSolved).toBe(1);
      expect(profile.estimatedCostUSD).toBeGreaterThan(0);
    });

    test('returns current difficulty', () => {
      const difficulty = engine.recordRequest('4.4.4.4');
      expect(typeof difficulty).toBe('number');
    });
  });

  describe('Difficulty Escalation', () => {
    test('escalates difficulty for fast solvers', () => {
      // Solve challenges rapidly (< 100ms)
      for (let i = 0; i < 5; i++) {
        engine.recordRequest('5.5.5.5', {
          solved: true,
          solveTimeMs: 50,
          wasChallenged: true
        });
      }
      const profile = engine.getProfile('5.5.5.5');
      expect(profile.currentDifficulty).toBeGreaterThanOrEqual(2);
    });

    test('decreases difficulty for slow solvers', () => {
      const ip = '6.6.6.6';
      // Force initial difficulty up
      engine.recordRequest(ip, { solved: true, solveTimeMs: 50, wasChallenged: true });
      engine.recordRequest(ip, { solved: true, solveTimeMs: 50, wasChallenged: true });
      engine.recordRequest(ip, { solved: true, solveTimeMs: 50, wasChallenged: true });

      // Now solve slowly
      for (let i = 0; i < 5; i++) {
        engine.recordRequest(ip, {
          solved: true,
          solveTimeMs: 5000,
          wasChallenged: true
        });
      }
      const profile = engine.getProfile(ip);
      expect(profile.currentDifficulty).toBeLessThanOrEqual(6);
    });
  });

  describe('Global Economics', () => {
    test('tracks global attacker cost', () => {
      engine.recordRequest('7.7.7.7', {
        solved: true,
        solveTimeMs: 200,
        wasChallenged: true
      });
      const global = engine.getGlobalEconomics();
      expect(global.estimatedAttackerCostUSD).toBeGreaterThan(0);
      expect(global.totalProfiles).toBe(1);
    });

    test('isAttackEconomicallyUnviable returns false by default', () => {
      expect(engine.isAttackEconomicallyUnviable()).toBe(false);
    });
  });

  describe('Top Costly Attackers', () => {
    test('returns sorted list of top attackers', () => {
      // Create several attacker profiles
      for (let i = 1; i <= 5; i++) {
        for (let j = 0; j < i; j++) {
          engine.recordRequest(`10.0.0.${i}`, {
            solved: true,
            solveTimeMs: 100,
            wasChallenged: true
          });
        }
      }
      const top = engine.getTopCostlyAttackers();
      expect(top.length).toBeLessThanOrEqual(10);
      expect(top[0].estimatedCostUSD).toBeGreaterThanOrEqual(top[1].estimatedCostUSD);
    });
  });

  describe('getProfile', () => {
    test('returns null for unknown IP', () => {
      expect(engine.getProfile('99.99.99.99')).toBeNull();
    });
  });
});

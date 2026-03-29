const HealthCheckSystem = require('../src/healthCheck');

describe('HealthCheckSystem', () => {
  test('runAllChecks returns healthy with minimal components', async () => {
    const hc = new HealthCheckSystem({
      rateLimiter: { getBlockedIPs: () => [] },
      fingerprinter: { getProfiles: () => [] },
      contagionGraph: { getGraphStats: () => ({ totalNodes: 0, totalEdges: 0, clusters: 0, confirmedBots: 0 }) },
      neuralPredictor: { getStats: () => ({ predictions: 0, accuracy: 0 }) },
      eventBus: { clients: new Set() }
    });

    const result = await hc.runAllChecks();
    expect(result.healthy).toBe(true);
    expect(result.degradedChecks).toEqual([]);
    expect(result.checks.memory.healthy).toBe(true);
  });

  test('rateLimiter health check degrades when blocked IPs exceed threshold', () => {
    const hc = new HealthCheckSystem({
      rateLimiter: { getBlockedIPs: () => Array(15000).fill('x') }
    });

    const rate = hc.checkRateLimiter();
    expect(rate.healthy).toBe(false);
    expect(rate.reason).toBe('Too many blocked IPs');
  });
});

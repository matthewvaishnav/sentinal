const fs = require('fs');
const path = require('path');
const GracefulShutdownManager = require('../src/gracefulShutdown');

describe('GracefulShutdownManager', () => {
  const stateFile = path.join(__dirname, 'shutdown-state-test.json');
  let manager;

  beforeEach(() => {
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    manager = new GracefulShutdownManager({ shutdownTimeout: 1000, stateFile });
  });

  afterEach(() => {
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  });

  test('tracks and releases in-flight requests', () => {
    expect(manager.getInFlightCount()).toBe(0);
    manager.trackRequest();
    manager.trackRequest();
    expect(manager.getInFlightCount()).toBe(2);
    manager.releaseRequest();
    expect(manager.getInFlightCount()).toBe(1);
  });

  test('persists and restores state', async () => {
    manager.registerComponents({ rateLimiter: { getBlockedIPs: async () => ['1.2.3.4'] }, contagionGraph: { confirmedBots: new Set(['1.2.3.5']) }, threatLedger: { exportChain: () => [{ id: 1 }] }, liveStats: { totalRequests: 10, blockedRequests: 2 } });
    await manager.persistState();
    expect(fs.existsSync(stateFile)).toBe(true);

    const restored = manager.restoreState();
    expect(restored).toHaveProperty('blockedIPs');
    expect(restored.blockedIPs).toEqual(['1.2.3.4']);
    expect(restored.confirmedBots).toEqual(['1.2.3.5']);
    expect(restored.stats.totalRequests).toBe(10);
  });

  test('stopAcceptingConnections works without server component', async () => {
    await expect(manager.stopAcceptingConnections()).resolves.toBeUndefined();
  });
});

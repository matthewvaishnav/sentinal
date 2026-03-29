const MetricsCollector = require('../src/metrics');

describe('MetricsCollector', () => {
  test('initialize and export Prometheus metrics', async () => {
    const metrics = new MetricsCollector();

    metrics.recordRequest('human', 'GET', '/');
    metrics.updateBlockedIPs(3);
    metrics.recordChallengeIssued(2);
    metrics.updateWebSocketClients(1);
    metrics.updateHealthStatus(true);

    const output = await metrics.getMetrics();
    expect(output).toContain('sentinel_requests_total');
    expect(output).toContain('sentinel_blocked_ips');
    expect(output).toContain('sentinel_health_status 1');
  });
});

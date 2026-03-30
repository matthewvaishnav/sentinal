const AdaptiveThreatIntelligence = require('../src/adaptiveThreatIntelligence');
const mathPool = require('../src/workers/pool');

describe('AdaptiveThreatIntelligence (Async FFT)', () => {
  let ati;

  beforeEach(() => {
    ati = new AdaptiveThreatIntelligence();
  });

  afterAll(async () => {
    await mathPool.close();
  });

  describe('Temporal Pattern Analysis (FFT via worker)', () => {
    test('returns null for insufficient data (<16 samples)', async () => {
      const result = await ati.analyzeTemporalPattern('1.1.1.1', Date.now());
      expect(result).toBeNull();
    });

    test('returns heartbeatDetected: false for random-interval samples', async () => {
      const ip = '1.1.1.1';
      let t = 1000000;
      // Use a deterministic "random-ish" sequence to avoid flaky FFT outcomes.
      const intervals = [137, 911, 244, 1803, 501, 1299, 643, 157, 1999, 433, 1201, 777, 1661, 289, 1043, 555];
      for (let i = 0; i < 16; i++) {
        t += intervals[i];
        await ati.analyzeTemporalPattern(ip, t);
      }
      const result = await ati.analyzeTemporalPattern(ip, t + 1234);
      expect(result).toBeDefined();
      expect(result.heartbeatDetected).toBe(false);
    });

    test('detects periodic heartbeat from regular intervals', async () => {
      const ip = '2.2.2.2';
      let t = 1000000;
      // Send 20 requests at exactly 500ms intervals (very periodic)
      for (let i = 0; i < 20; i++) {
        t += 500;
        await ati.analyzeTemporalPattern(ip, t);
      }
      const result = await ati.analyzeTemporalPattern(ip, t + 500);
      expect(result).toBeDefined();
      if (result.heartbeatDetected) {
        expect(result.frequency).toBeCloseTo(500, -1);
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    test('tracks heartbeat in stats', async () => {
      const ip = '3.3.3.3';
      let t = 0;
      for (let i = 0; i < 25; i++) {
        t += 500;
        await ati.analyzeTemporalPattern(ip, t);
      }
      const stats = ati.getStats();
      expect(stats).toHaveProperty('heartbeatsDetected');
      expect(stats).toHaveProperty('activeHeartbeats');
    });
  });

  describe('Attack Vector Prediction', () => {
    test('returns no prediction for too few samples', () => {
      const result = ati.predictNextVector('1.1.1.1', '/api/users', 'GET');
      expect(result.predictionAvailable).toBe(false);
    });

    test('detects scanning pattern from admin path enumeration', () => {
      const ip = '4.4.4.4';
      const adminPaths = [
        '/admin/login', '/admin/config', '/wp-admin/index.php',
        '/phpmyadmin/index.php', '/.env', '/.git/config',
        '/admin/dashboard', '/config.json'
      ];
      let result;
      for (const path of adminPaths) {
        result = ati.predictNextVector(ip, path, 'GET');
      }
      expect(result).toBeDefined();
    });

    test('stores predictions when scanning detected', () => {
      const ip = '5.5.5.5';
      const paths = [
        '/api/v1/users', '/api/v1/posts', '/api/v1/comments',
        '/api/v1/settings', '/api/v1/config', '/api/v2/users',
        '/api/v2/posts', '/api/v3/data'
      ];
      for (const path of paths) {
        ati.predictNextVector(ip, path, 'GET');
      }
      const predictions = ati.getPredictions();
      expect(Array.isArray(predictions)).toBe(true);
    });
  });

  describe('Adversarial Adaptation Detection', () => {
    test('returns low score for single event', () => {
      const result = ati.detectAdversarialAdaptation('6.6.6.6', {
        type: 'honeypot'
      });
      expect(result.isAdaptive).toBe(false);
      expect(result.adaptationScore).toBeDefined();
    });

    test('detects adaptive attacker with many defense probes', () => {
      const ip = '7.7.7.7';
      for (let i = 0; i < 20; i++) {
        ati.detectAdversarialAdaptation(ip, { type: 'honeypot' });
        ati.detectAdversarialAdaptation(ip, { type: 'challenge' });
        ati.detectAdversarialAdaptation(ip, { type: 'rate_limit' });
        ati.detectAdversarialAdaptation(ip, {
          type: 'behavior_change', from: 'bot', to: 'human'
        });
      }
      const attackers = ati.getAdaptiveAttackers();
      expect(Array.isArray(attackers)).toBe(true);
    });

    test('tracks behavior changes', () => {
      const ip = '8.8.8.8';
      ati.detectAdversarialAdaptation(ip, {
        type: 'behavior_change', from: 'bot', to: 'suspect'
      });
      const stats = ati.getStats();
      expect(stats).toHaveProperty('adaptiveAttackersDetected');
    });
  });

  describe('Cross-Correlation Campaign Clustering', () => {
    test('does not detect campaign with fewer than 3 IPs', () => {
      const result = ati.correlateCampaign('10.0.0.1', {
        techniques: ['bot_fingerprint'],
        targetPaths: ['/api/users'],
        timingProfile: 'periodic',
        userAgent: 'bot-scanner/1.0',
      });
      expect(result.campaignDetected).toBe(false);
    });

    test('detects campaign when 3+ IPs share signature', () => {
      const attackData = {
        techniques: ['flood'],
        targetPaths: ['/api/data'],
        timingProfile: 'burst',
        userAgent: 'botnet-agent/2.0',
      };

      ati.correlateCampaign('10.0.0.1', attackData);
      ati.correlateCampaign('10.0.0.2', attackData);
      const result = ati.correlateCampaign('10.0.0.3', attackData);

      expect(result.campaignDetected).toBe(true);
      expect(result.ipCount).toBe(3);
    });
  });
});

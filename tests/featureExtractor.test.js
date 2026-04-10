/**
 * Tests for Behavioral Feature Extractor
 * 
 * Validates that feature extraction matches SENTINEL's fingerprinting logic
 */

const FeatureExtractor = require('../academic/datasets/processors/featureExtractor');

describe('FeatureExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new FeatureExtractor();
  });

  describe('extract()', () => {
    it('should extract all 12 features from a valid trace', () => {
      const trace = {
        requests: [
          {
            timestamp: 1000,
            path: '/home',
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://example.com',
              'content-length': '500'
            }
          },
          {
            timestamp: 2000,
            path: '/about',
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'accept-language': 'en-US,en;q=0.9',
              'content-length': '600'
            }
          },
          {
            timestamp: 3500,
            path: '/contact',
            method: 'POST',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://example.com/about',
              'content-length': '1200'
            }
          }
        ]
      };

      const features = extractor.extract(trace);

      // Verify all 12 features are present
      expect(features).toHaveProperty('timingCV');
      expect(features).toHaveProperty('pathDiversity');
      expect(features).toHaveProperty('requestCount');
      expect(features).toHaveProperty('headerCount');
      expect(features).toHaveProperty('hasAcceptLanguage');
      expect(features).toHaveProperty('methodVariety');
      expect(features).toHaveProperty('uaEntropy');
      expect(features).toHaveProperty('avgRequestSize');
      expect(features).toHaveProperty('hasReferer');
      expect(features).toHaveProperty('sessionDuration');
      expect(features).toHaveProperty('requestRate');
      expect(features).toHaveProperty('uniquePathRatio');

      // Verify feature types
      expect(typeof features.timingCV).toBe('number');
      expect(typeof features.pathDiversity).toBe('number');
      expect(typeof features.requestCount).toBe('number');
      expect(typeof features.headerCount).toBe('number');
      expect(typeof features.hasAcceptLanguage).toBe('boolean');
      expect(typeof features.methodVariety).toBe('number');
      expect(typeof features.uaEntropy).toBe('number');
      expect(typeof features.avgRequestSize).toBe('number');
      expect(typeof features.hasReferer).toBe('boolean');
      expect(typeof features.sessionDuration).toBe('number');
      expect(typeof features.requestRate).toBe('number');
      expect(typeof features.uniquePathRatio).toBe('number');
    });

    it('should throw error for invalid trace', () => {
      expect(() => extractor.extract(null)).toThrow('Invalid trace');
      expect(() => extractor.extract({})).toThrow('Invalid trace');
      expect(() => extractor.extract({ requests: [] })).toThrow('Invalid trace');
    });
  });

  describe('_calculateTimingCV()', () => {
    it('should calculate coefficient of variation for regular intervals', () => {
      // Bot-like behavior: regular intervals (1000ms each)
      const timestamps = [1000, 2000, 3000, 4000, 5000];
      const cv = extractor._calculateTimingCV(timestamps);
      
      // Regular intervals should have CV close to 0
      expect(cv).toBeCloseTo(0, 1);
    });

    it('should calculate coefficient of variation for irregular intervals', () => {
      // Human-like behavior: irregular intervals
      const timestamps = [1000, 1500, 3000, 3200, 6000];
      const cv = extractor._calculateTimingCV(timestamps);
      
      // Irregular intervals should have higher CV
      expect(cv).toBeGreaterThan(0.3);
    });

    it('should return neutral value for insufficient data', () => {
      expect(extractor._calculateTimingCV([1000])).toBe(0.5);
      expect(extractor._calculateTimingCV([])).toBe(0.5);
      expect(extractor._calculateTimingCV(null)).toBe(0.5);
    });
  });

  describe('_calculatePathDiversity()', () => {
    it('should calculate diversity for varied paths', () => {
      const paths = ['/home', '/about', '/contact', '/products'];
      const diversity = extractor._calculatePathDiversity(paths);
      
      // All unique paths
      expect(diversity).toBe(1.0);
    });

    it('should calculate diversity for repeated paths', () => {
      const paths = ['/api', '/api', '/api', '/api'];
      const diversity = extractor._calculatePathDiversity(paths);
      
      // All same path
      expect(diversity).toBe(0.25);
    });

    it('should calculate diversity for mixed paths', () => {
      const paths = ['/home', '/home', '/about', '/home'];
      const diversity = extractor._calculatePathDiversity(paths);
      
      // 2 unique out of 4 total
      expect(diversity).toBe(0.5);
    });

    it('should return 0 for empty paths', () => {
      expect(extractor._calculatePathDiversity([])).toBe(0);
      expect(extractor._calculatePathDiversity(null)).toBe(0);
    });
  });

  describe('_averageHeaderCount()', () => {
    it('should calculate average header count', () => {
      const requests = [
        { headers: { 'user-agent': 'test', 'accept': '*/*', 'host': 'example.com' } },
        { headers: { 'user-agent': 'test', 'accept': '*/*' } },
        { headers: { 'user-agent': 'test' } }
      ];
      
      const avg = extractor._averageHeaderCount(requests);
      
      // (3 + 2 + 1) / 3 = 2
      expect(avg).toBe(2);
    });

    it('should handle headerCount field', () => {
      const requests = [
        { headerCount: 5 },
        { headerCount: 7 },
        { headerCount: 6 }
      ];
      
      const avg = extractor._averageHeaderCount(requests);
      
      // (5 + 7 + 6) / 3 = 6
      expect(avg).toBe(6);
    });

    it('should return 0 for empty requests', () => {
      expect(extractor._averageHeaderCount([])).toBe(0);
      expect(extractor._averageHeaderCount(null)).toBe(0);
    });
  });

  describe('_hasAcceptLanguage()', () => {
    it('should return true when Accept-Language is present in majority', () => {
      const requests = [
        { headers: { 'accept-language': 'en-US' } },
        { headers: { 'accept-language': 'en-US' } },
        { headers: {} }
      ];
      
      expect(extractor._hasAcceptLanguage(requests)).toBe(true);
    });

    it('should return false when Accept-Language is absent in majority', () => {
      const requests = [
        { headers: { 'accept-language': 'en-US' } },
        { headers: {} },
        { headers: {} }
      ];
      
      expect(extractor._hasAcceptLanguage(requests)).toBe(false);
    });

    it('should return false for empty requests', () => {
      expect(extractor._hasAcceptLanguage([])).toBe(false);
      expect(extractor._hasAcceptLanguage(null)).toBe(false);
    });
  });

  describe('_calculateMethodVariety()', () => {
    it('should return low variety for single method', () => {
      const requests = [
        { method: 'GET' },
        { method: 'GET' },
        { method: 'GET' }
      ];
      
      const variety = extractor._calculateMethodVariety(requests);
      
      expect(variety).toBe(0.25);
    });

    it('should return higher variety for mixed methods', () => {
      const requests = [
        { method: 'GET' },
        { method: 'POST' },
        { method: 'GET' },
        { method: 'PUT' }
      ];
      
      const variety = extractor._calculateMethodVariety(requests);
      
      // Should have entropy > 0.25
      expect(variety).toBeGreaterThan(0.25);
    });

    it('should return neutral value for empty requests', () => {
      expect(extractor._calculateMethodVariety([])).toBe(0.25);
      expect(extractor._calculateMethodVariety(null)).toBe(0.25);
    });
  });

  describe('_calculateUAEntropy()', () => {
    it('should calculate high entropy for complex user agent', () => {
      const userAgents = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'];
      const entropy = extractor._calculateUAEntropy(userAgents);
      
      // Complex UA should have higher entropy
      expect(entropy).toBeGreaterThan(0.5);
    });

    it('should calculate low entropy for simple user agent', () => {
      const userAgents = ['Bot'];
      const entropy = extractor._calculateUAEntropy(userAgents);
      
      // Simple UA should have lower entropy
      expect(entropy).toBeLessThan(0.5);
    });

    it('should return low entropy for empty user agent', () => {
      expect(extractor._calculateUAEntropy([])).toBe(0.2);
      expect(extractor._calculateUAEntropy([''])).toBe(0.2);
      expect(extractor._calculateUAEntropy(null)).toBe(0.2);
    });
  });

  describe('_averageRequestSize()', () => {
    it('should calculate average from content-length header', () => {
      const requests = [
        { headers: { 'content-length': '500' } },
        { headers: { 'content-length': '700' } },
        { headers: { 'content-length': '600' } }
      ];
      
      const avg = extractor._averageRequestSize(requests);
      
      // (500 + 700 + 600) / 3 = 600
      expect(avg).toBe(600);
    });

    it('should calculate average from size field', () => {
      const requests = [
        { size: 1000 },
        { size: 1500 },
        { size: 1250 }
      ];
      
      const avg = extractor._averageRequestSize(requests);
      
      // (1000 + 1500 + 1250) / 3 = 1250
      expect(avg).toBe(1250);
    });

    it('should return 0 for requests without size', () => {
      const requests = [
        { headers: {} },
        { headers: {} }
      ];
      
      expect(extractor._averageRequestSize(requests)).toBe(0);
    });

    it('should return 0 for empty requests', () => {
      expect(extractor._averageRequestSize([])).toBe(0);
      expect(extractor._averageRequestSize(null)).toBe(0);
    });
  });

  describe('_hasReferer()', () => {
    it('should return true when Referer is present in majority', () => {
      const requests = [
        { headers: { 'referer': 'https://example.com' } },
        { headers: { 'referer': 'https://example.com/page' } },
        { headers: {} }
      ];
      
      expect(extractor._hasReferer(requests)).toBe(true);
    });

    it('should return false when Referer is absent in majority', () => {
      const requests = [
        { headers: { 'referer': 'https://example.com' } },
        { headers: {} },
        { headers: {} }
      ];
      
      expect(extractor._hasReferer(requests)).toBe(false);
    });

    it('should handle referrer spelling variant', () => {
      const requests = [
        { headers: { 'referrer': 'https://example.com' } },
        { headers: { 'referrer': 'https://example.com/page' } }
      ];
      
      expect(extractor._hasReferer(requests)).toBe(true);
    });

    it('should return false for empty requests', () => {
      expect(extractor._hasReferer([])).toBe(false);
      expect(extractor._hasReferer(null)).toBe(false);
    });
  });

  describe('_calculateSessionDuration()', () => {
    it('should calculate duration between first and last request', () => {
      const timestamps = [1000, 2000, 3000, 5000];
      const duration = extractor._calculateSessionDuration(timestamps);
      
      // 5000 - 1000 = 4000ms
      expect(duration).toBe(4000);
    });

    it('should handle unsorted timestamps', () => {
      const timestamps = [3000, 1000, 5000, 2000];
      const duration = extractor._calculateSessionDuration(timestamps);
      
      // Should still be 5000 - 1000 = 4000ms
      expect(duration).toBe(4000);
    });

    it('should return 0 for insufficient timestamps', () => {
      expect(extractor._calculateSessionDuration([1000])).toBe(0);
      expect(extractor._calculateSessionDuration([])).toBe(0);
      expect(extractor._calculateSessionDuration(null)).toBe(0);
    });
  });

  describe('_calculateRequestRate()', () => {
    it('should calculate requests per second', () => {
      const timestamps = [1000, 2000, 3000, 4000, 5000];
      const rate = extractor._calculateRequestRate(timestamps);
      
      // 5 requests over 4 seconds = 1.25 req/s
      expect(rate).toBeCloseTo(1.25, 2);
    });

    it('should handle high request rates', () => {
      const timestamps = [1000, 1100, 1200, 1300, 1400];
      const rate = extractor._calculateRequestRate(timestamps);
      
      // 5 requests over 0.4 seconds = 12.5 req/s
      expect(rate).toBeCloseTo(12.5, 1);
    });

    it('should return 0 for insufficient timestamps', () => {
      expect(extractor._calculateRequestRate([1000])).toBe(0);
      expect(extractor._calculateRequestRate([])).toBe(0);
      expect(extractor._calculateRequestRate(null)).toBe(0);
    });
  });

  describe('_calculateUniquePathRatio()', () => {
    it('should match pathDiversity calculation', () => {
      const paths = ['/home', '/about', '/home', '/contact'];
      
      const diversity = extractor._calculatePathDiversity(paths);
      const ratio = extractor._calculateUniquePathRatio(paths);
      
      expect(ratio).toBe(diversity);
    });
  });

  describe('extractBatch()', () => {
    it('should extract features from multiple traces', () => {
      const traces = [
        {
          requests: [
            { timestamp: 1000, path: '/home', method: 'GET', headers: { 'user-agent': 'Mozilla' } }
          ]
        },
        {
          requests: [
            { timestamp: 2000, path: '/api', method: 'POST', headers: { 'user-agent': 'Bot' } }
          ]
        }
      ];

      const features = extractor.extractBatch(traces);

      expect(features).toHaveLength(2);
      expect(features[0]).toHaveProperty('timingCV');
      expect(features[1]).toHaveProperty('timingCV');
    });
  });

  describe('Bot vs Human Detection', () => {
    it('should extract bot-like features', () => {
      // Bot trace: regular timing, same path, no Accept-Language, simple UA
      const botTrace = {
        requests: [
          {
            timestamp: 1000,
            path: '/api/data',
            method: 'GET',
            headers: { 'user-agent': 'Bot' }
          },
          {
            timestamp: 2000,
            path: '/api/data',
            method: 'GET',
            headers: { 'user-agent': 'Bot' }
          },
          {
            timestamp: 3000,
            path: '/api/data',
            method: 'GET',
            headers: { 'user-agent': 'Bot' }
          }
        ]
      };

      const features = extractor.extract(botTrace);

      // Bot characteristics
      expect(features.timingCV).toBeLessThan(0.5); // Regular timing
      expect(features.pathDiversity).toBeLessThan(0.5); // Same path
      expect(features.hasAcceptLanguage).toBe(false); // No Accept-Language
      expect(features.methodVariety).toBe(0.25); // Single method
      expect(features.uaEntropy).toBeLessThan(0.5); // Simple UA
    });

    it('should extract human-like features', () => {
      // Human trace: irregular timing, varied paths, Accept-Language, complex UA
      const humanTrace = {
        requests: [
          {
            timestamp: 1000,
            path: '/home',
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://google.com'
            }
          },
          {
            timestamp: 2500,
            path: '/about',
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://example.com/home'
            }
          },
          {
            timestamp: 8000,
            path: '/contact',
            method: 'POST',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://example.com/about'
            }
          },
          {
            timestamp: 9200,
            path: '/products',
            method: 'GET',
            headers: {
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'accept-language': 'en-US,en;q=0.9',
              'referer': 'https://example.com/contact'
            }
          }
        ]
      };

      const features = extractor.extract(humanTrace);

      // Human characteristics
      expect(features.timingCV).toBeGreaterThan(0.3); // Irregular timing
      expect(features.pathDiversity).toBeGreaterThan(0.5); // Varied paths
      expect(features.hasAcceptLanguage).toBe(true); // Has Accept-Language
      expect(features.methodVariety).toBeGreaterThan(0.25); // Mixed methods
      expect(features.uaEntropy).toBeGreaterThan(0.5); // Complex UA
      expect(features.hasReferer).toBe(true); // Has Referer
    });
  });
});

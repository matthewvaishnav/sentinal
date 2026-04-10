/**
 * Unit Tests for DatasetNormalizer
 * 
 * Tests min-max normalization, statistics calculation, and edge cases
 */

const DatasetNormalizer = require('../academic/datasets/processors/normalizer');

describe('DatasetNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new DatasetNormalizer();
  });

  describe('normalize', () => {
    it('should normalize numeric features to [0, 1] range', () => {
      const dataset = {
        samples: [
          { features: { timingCV: 0.1, requestCount: 10, hasAcceptLanguage: true } },
          { features: { timingCV: 0.5, requestCount: 50, hasAcceptLanguage: false } },
          { features: { timingCV: 0.9, requestCount: 90, hasAcceptLanguage: true } }
        ]
      };

      const result = normalizer.normalize(dataset);

      // Check that numeric features are normalized to [0, 1]
      expect(result.samples[0].features.timingCV).toBe(0);
      expect(result.samples[1].features.timingCV).toBe(0.5);
      expect(result.samples[2].features.timingCV).toBe(1);

      expect(result.samples[0].features.requestCount).toBe(0);
      expect(result.samples[1].features.requestCount).toBe(0.5);
      expect(result.samples[2].features.requestCount).toBe(1);

      // Boolean features should remain unchanged
      expect(result.samples[0].features.hasAcceptLanguage).toBe(true);
      expect(result.samples[1].features.hasAcceptLanguage).toBe(false);
    });

    it('should calculate and store normalization statistics', () => {
      const dataset = {
        samples: [
          { features: { timingCV: 0.1, requestCount: 10 } },
          { features: { timingCV: 0.5, requestCount: 50 } },
          { features: { timingCV: 0.9, requestCount: 90 } }
        ]
      };

      const result = normalizer.normalize(dataset);

      expect(result.normalizationStats).toBeDefined();
      expect(result.normalizationStats.timingCV).toEqual({
        min: 0.1,
        max: 0.9,
        mean: 0.5,
        stddev: expect.any(Number),
        count: 3
      });

      expect(result.normalizationStats.requestCount).toEqual({
        min: 10,
        max: 90,
        mean: 50,
        stddev: expect.any(Number),
        count: 3
      });
    });

    it('should handle constant features (min === max)', () => {
      const dataset = {
        samples: [
          { features: { timingCV: 0.5, requestCount: 100 } },
          { features: { timingCV: 0.5, requestCount: 100 } },
          { features: { timingCV: 0.5, requestCount: 100 } }
        ]
      };

      const result = normalizer.normalize(dataset);

      // Constant features should normalize to 0.5
      expect(result.samples[0].features.timingCV).toBe(0.5);
      expect(result.samples[0].features.requestCount).toBe(0.5);
    });

    it('should throw error for empty dataset', () => {
      expect(() => {
        normalizer.normalize({ samples: [] });
      }).toThrow('Invalid dataset: must contain at least one sample');
    });

    it('should throw error for null dataset', () => {
      expect(() => {
        normalizer.normalize(null);
      }).toThrow('Invalid dataset: must contain at least one sample');
    });
  });

  describe('normalizeBatch', () => {
    it('should normalize multiple datasets using shared statistics', () => {
      const dataset1 = {
        samples: [
          { features: { timingCV: 0.1, requestCount: 10 } },
          { features: { timingCV: 0.3, requestCount: 30 } }
        ]
      };

      const dataset2 = {
        samples: [
          { features: { timingCV: 0.7, requestCount: 70 } },
          { features: { timingCV: 0.9, requestCount: 90 } }
        ]
      };

      const results = normalizer.normalizeBatch([dataset1, dataset2]);

      expect(results).toHaveLength(2);

      // Both datasets should use the same global min (0.1) and max (0.9)
      expect(results[0].samples[0].features.timingCV).toBe(0); // (0.1 - 0.1) / (0.9 - 0.1)
      expect(results[1].samples[1].features.timingCV).toBe(1); // (0.9 - 0.1) / (0.9 - 0.1)

      // Both should have the same normalization stats
      expect(results[0].normalizationStats).toEqual(results[1].normalizationStats);
    });

    it('should throw error for empty dataset array', () => {
      expect(() => {
        normalizer.normalizeBatch([]);
      }).toThrow('Invalid datasets: must contain at least one dataset');
    });
  });

  describe('denormalize', () => {
    it('should reverse normalization correctly', () => {
      const dataset = {
        samples: [
          { features: { timingCV: 0.1, requestCount: 10 } },
          { features: { timingCV: 0.5, requestCount: 50 } },
          { features: { timingCV: 0.9, requestCount: 90 } }
        ]
      };

      const normalized = normalizer.normalize(dataset);
      const denormalized = normalizer.denormalize(
        normalized.samples[1].features,
        normalized.normalizationStats
      );

      // Should recover original values
      expect(denormalized.timingCV).toBeCloseTo(0.5, 10);
      expect(denormalized.requestCount).toBeCloseTo(50, 10);
    });

    it('should preserve boolean features during denormalization', () => {
      const normalizedFeatures = {
        timingCV: 0.5,
        hasAcceptLanguage: true
      };

      const stats = {
        timingCV: { min: 0.1, max: 0.9 }
      };

      const denormalized = normalizer.denormalize(normalizedFeatures, stats);

      expect(denormalized.hasAcceptLanguage).toBe(true);
    });
  });

  describe('getSummaryStats', () => {
    it('should return comprehensive summary statistics', () => {
      const dataset = {
        samples: [
          { features: { timingCV: 0.1, requestCount: 10 } },
          { features: { timingCV: 0.5, requestCount: 50 } },
          { features: { timingCV: 0.9, requestCount: 90 } }
        ]
      };

      const summary = normalizer.getSummaryStats(dataset);

      expect(summary.totalSamples).toBe(3);
      expect(summary.features.timingCV).toEqual({
        min: 0.1,
        max: 0.9,
        mean: 0.5,
        stddev: expect.any(Number),
        range: 0.8
      });

      expect(summary.features.requestCount).toEqual({
        min: 10,
        max: 90,
        mean: 50,
        stddev: expect.any(Number),
        range: 80
      });
    });
  });

  describe('integration with real features', () => {
    it('should normalize all 12 behavioral features correctly', () => {
      const dataset = {
        samples: [
          {
            features: {
              timingCV: 0.1,
              pathDiversity: 0.2,
              requestCount: 10,
              headerCount: 5,
              hasAcceptLanguage: true,
              methodVariety: 0.3,
              uaEntropy: 0.4,
              avgRequestSize: 100,
              hasReferer: false,
              sessionDuration: 1000,
              requestRate: 5,
              uniquePathRatio: 0.2
            }
          },
          {
            features: {
              timingCV: 0.9,
              pathDiversity: 0.8,
              requestCount: 90,
              headerCount: 15,
              hasAcceptLanguage: false,
              methodVariety: 0.7,
              uaEntropy: 0.9,
              avgRequestSize: 500,
              hasReferer: true,
              sessionDuration: 9000,
              requestRate: 15,
              uniquePathRatio: 0.8
            }
          }
        ]
      };

      const result = normalizer.normalize(dataset);

      // Check that all numeric features are in [0, 1] range
      const features1 = result.samples[0].features;
      const features2 = result.samples[1].features;

      expect(features1.timingCV).toBeGreaterThanOrEqual(0);
      expect(features1.timingCV).toBeLessThanOrEqual(1);
      expect(features2.timingCV).toBeGreaterThanOrEqual(0);
      expect(features2.timingCV).toBeLessThanOrEqual(1);

      // Boolean features should remain unchanged
      expect(features1.hasAcceptLanguage).toBe(true);
      expect(features2.hasAcceptLanguage).toBe(false);
      expect(features1.hasReferer).toBe(false);
      expect(features2.hasReferer).toBe(true);

      // Check that statistics are calculated for all numeric features
      expect(Object.keys(result.normalizationStats)).toHaveLength(10); // 10 numeric features
    });
  });
});

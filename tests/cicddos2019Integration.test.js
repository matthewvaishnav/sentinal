/**
 * Integration test for CIC-DDoS2019 Dataset Loader with actual mock data
 */

const CICDDoS2019Loader = require('../academic/datasets/loaders/cicddos2019');
const path = require('path');

describe('CICDDoS2019Loader Integration', () => {
  let loader;
  const mockCsvPath = path.join(__dirname, '../data/cicddos2019_mock.csv');

  beforeEach(() => {
    loader = new CICDDoS2019Loader();
  });

  afterEach(() => {
    loader.clearCache();
  });

  it('should load the actual mock dataset and verify statistics', async () => {
    const dataset = await loader.load(mockCsvPath);
    const metadata = loader.getMetadata(dataset);

    // Verify dataset structure
    expect(dataset.name).toBe('CIC-DDoS2019');
    expect(dataset.samples).toBeInstanceOf(Array);
    expect(dataset.metadata).toBeDefined();

    // Verify we have samples
    expect(metadata.totalSamples).toBeGreaterThan(0);
    expect(metadata.botSamples).toBeGreaterThan(0);
    expect(metadata.humanSamples).toBeGreaterThan(0);

    // Verify counts match
    expect(metadata.totalSamples).toBe(metadata.botSamples + metadata.humanSamples);

    // Verify features list
    expect(metadata.features).toEqual([
      'timingCV',
      'uaEntropy',
      'pathDiversity',
      'headerCount',
      'hasAcceptLanguage',
      'methodVariety',
      'requestSize'
    ]);

    // Log statistics for verification
    console.log('Dataset Statistics:');
    console.log(`  Total Samples: ${metadata.totalSamples}`);
    console.log(`  Bot Samples: ${metadata.botSamples}`);
    console.log(`  Human Samples: ${metadata.humanSamples}`);
    console.log(`  Bot Ratio: ${(metadata.botSamples / metadata.totalSamples * 100).toFixed(2)}%`);
  });

  it('should verify sample data integrity', async () => {
    const dataset = await loader.load(mockCsvPath);

    // Check first sample (should be Benign/human)
    const firstSample = dataset.samples[0];
    expect(firstSample.ip).toBe('192.168.1.1');
    expect(firstSample.label).toBe('human');
    expect(firstSample.features.timingCV).toBeCloseTo(0.6570, 4);
    expect(firstSample.features.uaEntropy).toBeCloseTo(0.6355, 4);
    expect(firstSample.features.pathDiversity).toBeCloseTo(0.8863, 4);
    expect(firstSample.features.headerCount).toBe(16);
    expect(firstSample.features.hasAcceptLanguage).toBe(true);
    expect(firstSample.features.methodVariety).toBeCloseTo(0.5358, 4);
    expect(firstSample.features.requestSize).toBeCloseTo(0.6923, 4);

    // Find a bot sample (DoS/DDoS)
    const botSample = dataset.samples.find(s => s.label === 'bot');
    expect(botSample).toBeDefined();
    expect(botSample.features.timingCV).toBeCloseTo(1.6000, 4);
    expect(botSample.features.hasAcceptLanguage).toBe(false);
  });

  it('should handle all label types in the dataset', async () => {
    const dataset = await loader.load(mockCsvPath);

    const labelCounts = {
      human: 0,
      bot: 0
    };

    dataset.samples.forEach(sample => {
      labelCounts[sample.label]++;
    });

    // Verify we have both types
    expect(labelCounts.human).toBeGreaterThan(0);
    expect(labelCounts.bot).toBeGreaterThan(0);

    console.log('Label Distribution:');
    console.log(`  Human: ${labelCounts.human}`);
    console.log(`  Bot: ${labelCounts.bot}`);
  });

  it('should verify feature value ranges', async () => {
    const dataset = await loader.load(mockCsvPath);

    const featureStats = {
      timingCV: { min: Infinity, max: -Infinity },
      uaEntropy: { min: Infinity, max: -Infinity },
      pathDiversity: { min: Infinity, max: -Infinity },
      headerCount: { min: Infinity, max: -Infinity },
      methodVariety: { min: Infinity, max: -Infinity },
      requestSize: { min: Infinity, max: -Infinity }
    };

    dataset.samples.forEach(sample => {
      Object.keys(featureStats).forEach(feature => {
        const value = sample.features[feature];
        featureStats[feature].min = Math.min(featureStats[feature].min, value);
        featureStats[feature].max = Math.max(featureStats[feature].max, value);
      });
    });

    // Verify all features have valid ranges
    Object.entries(featureStats).forEach(([feature, stats]) => {
      expect(stats.min).toBeLessThanOrEqual(stats.max);
      expect(stats.min).toBeGreaterThanOrEqual(0);
      console.log(`  ${feature}: [${stats.min.toFixed(4)}, ${stats.max.toFixed(4)}]`);
    });
  });
});

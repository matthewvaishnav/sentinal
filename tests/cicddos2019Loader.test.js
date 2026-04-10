/**
 * Tests for CIC-DDoS2019 Dataset Loader
 */

const CICDDoS2019Loader = require('../academic/datasets/loaders/cicddos2019');
const path = require('path');
const fs = require('fs').promises;

describe('CICDDoS2019Loader', () => {
  let loader;
  const mockCsvPath = path.join(__dirname, '../data/cicddos2019_mock.csv');

  beforeEach(() => {
    loader = new CICDDoS2019Loader();
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('load', () => {
    it('should load and parse the CIC-DDoS2019 dataset', async () => {
      const dataset = await loader.load(mockCsvPath);

      expect(dataset).toBeDefined();
      expect(dataset.name).toBe('CIC-DDoS2019');
      expect(dataset.samples).toBeInstanceOf(Array);
      expect(dataset.samples.length).toBeGreaterThan(0);
      expect(dataset.metadata).toBeDefined();
    });

    it('should parse samples with correct structure', async () => {
      const dataset = await loader.load(mockCsvPath);
      const sample = dataset.samples[0];

      expect(sample).toHaveProperty('ip');
      expect(sample).toHaveProperty('timestamp');
      expect(sample).toHaveProperty('features');
      expect(sample).toHaveProperty('label');
      expect(['bot', 'human']).toContain(sample.label);
    });

    it('should parse features correctly', async () => {
      const dataset = await loader.load(mockCsvPath);
      const sample = dataset.samples[0];

      expect(sample.features).toHaveProperty('timingCV');
      expect(sample.features).toHaveProperty('uaEntropy');
      expect(sample.features).toHaveProperty('pathDiversity');
      expect(sample.features).toHaveProperty('headerCount');
      expect(sample.features).toHaveProperty('hasAcceptLanguage');
      expect(sample.features).toHaveProperty('methodVariety');
      expect(sample.features).toHaveProperty('requestSize');

      expect(typeof sample.features.timingCV).toBe('number');
      expect(typeof sample.features.uaEntropy).toBe('number');
      expect(typeof sample.features.pathDiversity).toBe('number');
      expect(typeof sample.features.headerCount).toBe('number');
      expect(typeof sample.features.hasAcceptLanguage).toBe('boolean');
      expect(typeof sample.features.methodVariety).toBe('number');
      expect(typeof sample.features.requestSize).toBe('number');
    });

    it('should map labels correctly', async () => {
      const dataset = await loader.load(mockCsvPath);
      
      // Check that we have both human and bot samples
      const humanSamples = dataset.samples.filter(s => s.label === 'human');
      const botSamples = dataset.samples.filter(s => s.label === 'bot');

      expect(humanSamples.length).toBeGreaterThan(0);
      expect(botSamples.length).toBeGreaterThan(0);
    });

    it('should use cache on subsequent loads', async () => {
      const dataset1 = await loader.load(mockCsvPath);
      const dataset2 = await loader.load(mockCsvPath);

      expect(dataset1).toBe(dataset2); // Same object reference
    });

    it('should throw error for non-existent file', async () => {
      await expect(loader.load('nonexistent.csv')).rejects.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata', async () => {
      const dataset = await loader.load(mockCsvPath);
      const metadata = loader.getMetadata(dataset);

      expect(metadata.totalSamples).toBe(dataset.samples.length);
      expect(metadata.botSamples).toBeGreaterThan(0);
      expect(metadata.humanSamples).toBeGreaterThan(0);
      expect(metadata.totalSamples).toBe(metadata.botSamples + metadata.humanSamples);
      expect(metadata.features).toEqual([
        'timingCV',
        'uaEntropy',
        'pathDiversity',
        'headerCount',
        'hasAcceptLanguage',
        'methodVariety',
        'requestSize'
      ]);
      expect(metadata.source).toBe(mockCsvPath);
    });

    it('should throw error for invalid dataset', () => {
      expect(() => loader.getMetadata(null)).toThrow('Invalid dataset');
      expect(() => loader.getMetadata({})).toThrow('Invalid dataset');
    });
  });

  describe('parse', () => {
    it('should parse valid CSV content', async () => {
      const csvContent = `Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label
192.168.1.1,0.6570,0.6355,0.8863,16,1,0.5358,0.6923,Benign
192.168.1.2,1.6000,0.2239,0.4944,12,0,0.2402,0.2207,DoS`;

      const dataset = await loader.parse(csvContent, 'test.csv');

      expect(dataset.samples.length).toBe(2);
      expect(dataset.samples[0].label).toBe('human');
      expect(dataset.samples[1].label).toBe('bot');
    });

    it('should handle DDoS label', async () => {
      const csvContent = `Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label
192.168.1.1,1.6000,0.4150,0.5088,13,0,0.0544,0.2548,DDoS`;

      const dataset = await loader.parse(csvContent, 'test.csv');

      expect(dataset.samples[0].label).toBe('bot');
    });

    it('should throw error for empty CSV', async () => {
      await expect(loader.parse('', 'test.csv')).rejects.toThrow('empty');
    });

    it('should throw error for CSV with only header', async () => {
      const csvContent = 'Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label';
      await expect(loader.parse(csvContent, 'test.csv')).rejects.toThrow();
    });

    it('should throw error for missing required columns', async () => {
      const csvContent = `Source_IP,timingCV,Label
192.168.1.1,0.6570,Benign`;

      await expect(loader.parse(csvContent, 'test.csv')).rejects.toThrow('Missing required column');
    });

    it('should skip rows with invalid data and continue', async () => {
      const csvContent = `Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label
192.168.1.1,0.6570,0.6355,0.8863,16,1,0.5358,0.6923,Benign
192.168.1.2,invalid,0.2239,0.4944,12,0,0.2402,0.2207,DoS
192.168.1.3,1.6000,0.4150,0.5088,13,0,0.0544,0.2548,DDoS`;

      const dataset = await loader.parse(csvContent, 'test.csv');

      // Should have 2 valid samples (row 2 is skipped)
      expect(dataset.samples.length).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      await loader.load(mockCsvPath);
      expect(loader.cache.size).toBeGreaterThan(0);

      loader.clearCache();
      expect(loader.cache.size).toBe(0);
    });
  });
});

/**
 * Example Usage of DatasetNormalizer
 * 
 * Demonstrates how to normalize behavioral features across datasets
 * to ensure comparability in academic evaluation
 */

const DatasetNormalizer = require('./normalizer');
const FeatureExtractor = require('./featureExtractor');

// Create instances
const normalizer = new DatasetNormalizer();
const extractor = new FeatureExtractor();

console.log('=== Dataset Normalization Example ===\n');

// Example 1: Normalize a single dataset
console.log('--- Example 1: Single Dataset Normalization ---\n');

// Simulate a dataset with extracted features
const dataset1 = {
  name: 'CIC-DDoS2019',
  samples: [
    {
      ip: '192.168.1.100',
      label: 'bot',
      features: {
        timingCV: 0.05,
        pathDiversity: 0.1,
        requestCount: 1000,
        headerCount: 3,
        hasAcceptLanguage: false,
        methodVariety: 0.25,
        uaEntropy: 0.2,
        avgRequestSize: 150,
        hasReferer: false,
        sessionDuration: 10000,
        requestRate: 100,
        uniquePathRatio: 0.1
      }
    },
    {
      ip: '192.168.1.101',
      label: 'human',
      features: {
        timingCV: 0.85,
        pathDiversity: 0.75,
        requestCount: 50,
        headerCount: 12,
        hasAcceptLanguage: true,
        methodVariety: 0.65,
        uaEntropy: 0.82,
        avgRequestSize: 450,
        hasReferer: true,
        sessionDuration: 30000,
        requestRate: 1.67,
        uniquePathRatio: 0.75
      }
    }
  ]
};

const normalized1 = normalizer.normalize(dataset1);

console.log('Original Features (Bot):');
console.log(JSON.stringify(dataset1.samples[0].features, null, 2));
console.log('\nNormalized Features (Bot):');
console.log(JSON.stringify(normalized1.samples[0].features, null, 2));

console.log('\n\nNormalization Statistics:');
console.log(JSON.stringify(normalized1.normalizationStats, null, 2));

// Example 2: Normalize multiple datasets with shared statistics
console.log('\n\n--- Example 2: Multi-Dataset Normalization ---\n');

const dataset2 = {
  name: 'CAIDA',
  samples: [
    {
      ip: '10.0.0.50',
      label: 'bot',
      features: {
        timingCV: 0.03,
        pathDiversity: 0.05,
        requestCount: 2000,
        headerCount: 2,
        hasAcceptLanguage: false,
        methodVariety: 0.25,
        uaEntropy: 0.15,
        avgRequestSize: 100,
        hasReferer: false,
        sessionDuration: 5000,
        requestRate: 400,
        uniquePathRatio: 0.05
      }
    }
  ]
};

const dataset3 = {
  name: 'UNSW-NB15',
  samples: [
    {
      ip: '172.16.0.100',
      label: 'human',
      features: {
        timingCV: 0.95,
        pathDiversity: 0.85,
        requestCount: 30,
        headerCount: 15,
        hasAcceptLanguage: true,
        methodVariety: 0.75,
        uaEntropy: 0.88,
        avgRequestSize: 600,
        hasReferer: true,
        sessionDuration: 45000,
        requestRate: 0.67,
        uniquePathRatio: 0.85
      }
    }
  ]
};

// Normalize all datasets using shared statistics
const normalizedBatch = normalizer.normalizeBatch([dataset1, dataset2, dataset3]);

console.log('Normalized datasets using shared statistics:');
normalizedBatch.forEach((dataset, idx) => {
  console.log(`\nDataset ${idx + 1} (${dataset.name || 'Unknown'}):`);
  console.log(`  Sample count: ${dataset.samples.length}`);
  console.log(`  First sample timingCV: ${dataset.samples[0].features.timingCV.toFixed(4)}`);
  console.log(`  First sample requestRate: ${dataset.samples[0].features.requestRate.toFixed(4)}`);
});

console.log('\nShared normalization statistics ensure comparability across datasets!');

// Example 3: Get summary statistics
console.log('\n\n--- Example 3: Summary Statistics ---\n');

const summary = normalizer.getSummaryStats(dataset1);

console.log('Dataset Summary:');
console.log(`Total Samples: ${summary.totalSamples}`);
console.log('\nFeature Statistics:');

for (const [feature, stats] of Object.entries(summary.features)) {
  console.log(`\n${feature}:`);
  console.log(`  Min: ${stats.min.toFixed(4)}`);
  console.log(`  Max: ${stats.max.toFixed(4)}`);
  console.log(`  Mean: ${stats.mean.toFixed(4)}`);
  console.log(`  Std Dev: ${stats.stddev.toFixed(4)}`);
  console.log(`  Range: ${stats.range.toFixed(4)}`);
}

// Example 4: Denormalization
console.log('\n\n--- Example 4: Denormalization ---\n');

const normalizedFeatures = normalized1.samples[0].features;
const denormalized = normalizer.denormalize(
  normalizedFeatures,
  normalized1.normalizationStats
);

console.log('Normalized Features:');
console.log(JSON.stringify(normalizedFeatures, null, 2));
console.log('\nDenormalized Features (recovered original values):');
console.log(JSON.stringify(denormalized, null, 2));

// Example 5: Integration with FeatureExtractor
console.log('\n\n--- Example 5: Full Pipeline (Extract + Normalize) ---\n');

// Raw network trace
const rawTrace = {
  requests: [
    {
      timestamp: 1000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    },
    {
      timestamp: 2000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    }
  ]
};

// Step 1: Extract features
const extractedFeatures = extractor.extract(rawTrace);
console.log('Step 1 - Extracted Features:');
console.log(JSON.stringify(extractedFeatures, null, 2));

// Step 2: Create dataset
const pipelineDataset = {
  samples: [
    { ip: '192.168.1.1', label: 'bot', features: extractedFeatures }
  ]
};

// Step 3: Normalize
const normalizedPipeline = normalizer.normalize(pipelineDataset);
console.log('\nStep 2 - Normalized Features:');
console.log(JSON.stringify(normalizedPipeline.samples[0].features, null, 2));

console.log('\n=== Normalization Complete ===\n');
console.log('Key Benefits:');
console.log('✓ Features scaled to [0, 1] range');
console.log('✓ Comparable across different datasets');
console.log('✓ Statistics preserved for reproducibility');
console.log('✓ Boolean features remain unchanged');
console.log('✓ Ready for academic evaluation and machine learning');

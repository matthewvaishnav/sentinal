/**
 * Test script for dataset loaders
 * 
 * This script tests all three dataset loaders (CIC-DDoS2019, CAIDA, UNSW-NB15)
 * to verify they correctly implement the DatasetLoader interface.
 */

const path = require('path');
const CICDDoS2019Loader = require('./cicddos2019');
const CAIDALoader = require('./caida');
const UNSWLoader = require('./unsw');

async function testLoader(LoaderClass, datasetPath, datasetName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${datasetName} Loader`);
  console.log('='.repeat(60));
  
  try {
    const loader = new LoaderClass();
    
    // Load dataset
    console.log(`\nLoading dataset from: ${datasetPath}`);
    const dataset = await loader.load(datasetPath);
    
    // Get metadata
    const metadata = loader.getMetadata(dataset);
    
    // Display results
    console.log(`\n✓ Dataset loaded successfully: ${dataset.name}`);
    console.log(`  Total samples: ${metadata.totalSamples}`);
    console.log(`  Bot samples: ${metadata.botSamples}`);
    console.log(`  Human samples: ${metadata.humanSamples}`);
    console.log(`  Features: ${metadata.features.join(', ')}`);
    console.log(`  Source: ${metadata.source}`);
    
    // Display first sample
    if (dataset.samples.length > 0) {
      const sample = dataset.samples[0];
      console.log(`\n  First sample:`);
      console.log(`    IP: ${sample.ip}`);
      console.log(`    Label: ${sample.label}`);
      console.log(`    Timestamp: ${sample.timestamp}`);
      console.log(`    Features:`);
      for (const [key, value] of Object.entries(sample.features)) {
        const displayValue = typeof value === 'boolean' ? value : value.toFixed(4);
        console.log(`      ${key}: ${displayValue}`);
      }
    }
    
    // Test cache
    console.log(`\n  Testing cache...`);
    const cachedDataset = await loader.load(datasetPath);
    console.log(`  ✓ Cache working (loaded ${cachedDataset.samples.length} samples)`);
    
    // Clear cache
    loader.clearCache();
    console.log(`  ✓ Cache cleared`);
    
    return true;
  } catch (error) {
    console.error(`\n✗ Error testing ${datasetName} loader:`);
    console.error(`  ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Dataset Loader Test Suite');
  console.log('='.repeat(60));
  
  const results = [];
  
  // Test CIC-DDoS2019 loader
  const cicPath = path.join(__dirname, '../../../data/cicddos2019_mock.csv');
  results.push(await testLoader(CICDDoS2019Loader, cicPath, 'CIC-DDoS2019'));
  
  // Test CAIDA loader
  const caidaPath = path.join(__dirname, '../../../data/caida_mock.csv');
  results.push(await testLoader(CAIDALoader, caidaPath, 'CAIDA'));
  
  // Test UNSW-NB15 loader
  const unswPath = path.join(__dirname, '../../../data/unsw_mock.csv');
  results.push(await testLoader(UNSWLoader, unswPath, 'UNSW-NB15'));
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\nTests passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('✓ All loaders working correctly!');
    process.exit(0);
  } else {
    console.log('✗ Some loaders failed');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

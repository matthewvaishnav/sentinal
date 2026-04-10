/**
 * Multi-Dataset Loader Example
 * 
 * Demonstrates loading and comparing multiple DDoS datasets using
 * the standardized DatasetLoader interface.
 */

const path = require('path');
const CICDDoS2019Loader = require('./cicddos2019');
const CAIDALoader = require('./caida');
const UNSWLoader = require('./unsw');

async function loadAllDatasets() {
  console.log('Loading Multiple DDoS Datasets');
  console.log('='.repeat(60));
  
  const datasets = [];
  
  // Load CIC-DDoS2019
  console.log('\n1. Loading CIC-DDoS2019 dataset...');
  const cicLoader = new CICDDoS2019Loader();
  const cicPath = path.join(__dirname, '../../../data/cicddos2019_mock.csv');
  const cicDataset = await cicLoader.load(cicPath);
  datasets.push(cicDataset);
  console.log(`   ✓ Loaded ${cicDataset.samples.length} samples`);
  
  // Load CAIDA
  console.log('\n2. Loading CAIDA dataset...');
  const caidaLoader = new CAIDALoader();
  const caidaPath = path.join(__dirname, '../../../data/caida_mock.csv');
  const caidaDataset = await caidaLoader.load(caidaPath);
  datasets.push(caidaDataset);
  console.log(`   ✓ Loaded ${caidaDataset.samples.length} samples`);
  
  // Load UNSW-NB15
  console.log('\n3. Loading UNSW-NB15 dataset...');
  const unswLoader = new UNSWLoader();
  const unswPath = path.join(__dirname, '../../../data/unsw_mock.csv');
  const unswDataset = await unswLoader.load(unswPath);
  datasets.push(unswDataset);
  console.log(`   ✓ Loaded ${unswDataset.samples.length} samples`);
  
  return datasets;
}

function compareDatasets(datasets) {
  console.log('\n' + '='.repeat(60));
  console.log('Dataset Comparison');
  console.log('='.repeat(60));
  
  // Create comparison table
  console.log('\n┌─────────────────┬────────┬──────┬────────┬──────────┐');
  console.log('│ Dataset         │ Total  │ Bot  │ Human  │ Bot %    │');
  console.log('├─────────────────┼────────┼──────┼────────┼──────────┤');
  
  for (const dataset of datasets) {
    const meta = dataset.metadata;
    const botPercent = ((meta.botSamples / meta.totalSamples) * 100).toFixed(1);
    const name = dataset.name.padEnd(15);
    const total = meta.totalSamples.toString().padStart(6);
    const bot = meta.botSamples.toString().padStart(4);
    const human = meta.humanSamples.toString().padStart(6);
    const percent = `${botPercent}%`.padStart(8);
    
    console.log(`│ ${name} │ ${total} │ ${bot} │ ${human} │ ${percent} │`);
  }
  
  console.log('└─────────────────┴────────┴──────┴────────┴──────────┘');
}

function analyzeFeatureDistribution(datasets) {
  console.log('\n' + '='.repeat(60));
  console.log('Feature Distribution Analysis');
  console.log('='.repeat(60));
  
  for (const dataset of datasets) {
    console.log(`\n${dataset.name}:`);
    
    // Calculate feature statistics
    const features = dataset.metadata.features;
    const stats = {};
    
    for (const feature of features) {
      const values = dataset.samples
        .map(s => s.features[feature])
        .filter(v => typeof v === 'number');
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        stats[feature] = { mean, min, max };
      }
    }
    
    // Display statistics
    console.log('  Feature Statistics:');
    for (const [feature, stat] of Object.entries(stats)) {
      console.log(`    ${feature.padEnd(20)} mean: ${stat.mean.toFixed(4)}  range: [${stat.min.toFixed(4)}, ${stat.max.toFixed(4)}]`);
    }
  }
}

function demonstrateUnifiedInterface(datasets) {
  console.log('\n' + '='.repeat(60));
  console.log('Unified Interface Demonstration');
  console.log('='.repeat(60));
  
  console.log('\nAll datasets provide the same standardized format:');
  console.log('  - name: string');
  console.log('  - samples: Array<{ip, timestamp, features, label}>');
  console.log('  - metadata: {totalSamples, botSamples, humanSamples, features, source}');
  
  console.log('\nThis allows for dataset-agnostic processing:');
  
  // Example: Count bot vs human across all datasets
  let totalBot = 0;
  let totalHuman = 0;
  
  for (const dataset of datasets) {
    totalBot += dataset.metadata.botSamples;
    totalHuman += dataset.metadata.humanSamples;
  }
  
  console.log(`\n  Combined statistics across all datasets:`);
  console.log(`    Total bot samples: ${totalBot}`);
  console.log(`    Total human samples: ${totalHuman}`);
  console.log(`    Overall bot percentage: ${((totalBot / (totalBot + totalHuman)) * 100).toFixed(1)}%`);
}

async function main() {
  try {
    // Load all datasets
    const datasets = await loadAllDatasets();
    
    // Compare datasets
    compareDatasets(datasets);
    
    // Analyze feature distributions
    analyzeFeatureDistribution(datasets);
    
    // Demonstrate unified interface
    demonstrateUnifiedInterface(datasets);
    
    console.log('\n' + '='.repeat(60));
    console.log('✓ Multi-dataset loading complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Run example
if (require.main === module) {
  main();
}

module.exports = { loadAllDatasets, compareDatasets, analyzeFeatureDistribution };

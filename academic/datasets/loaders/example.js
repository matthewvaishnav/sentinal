/**
 * Example usage of CIC-DDoS2019 Dataset Loader
 * 
 * This script demonstrates how to load and use the CIC-DDoS2019 dataset.
 */

const CICDDoS2019Loader = require('./cicddos2019');
const path = require('path');

async function main() {
  // Create loader instance
  const loader = new CICDDoS2019Loader();
  
  // Path to the mock dataset
  const datasetPath = path.join(__dirname, '../../../data/cicddos2019_mock.csv');
  
  console.log('Loading CIC-DDoS2019 dataset...');
  
  try {
    // Load the dataset
    const dataset = await loader.load(datasetPath);
    
    // Get metadata
    const metadata = loader.getMetadata(dataset);
    
    // Display dataset information
    console.log('\n=== Dataset Information ===');
    console.log(`Name: ${dataset.name}`);
    console.log(`Total Samples: ${metadata.totalSamples}`);
    console.log(`Bot Samples: ${metadata.botSamples} (${(metadata.botSamples / metadata.totalSamples * 100).toFixed(2)}%)`);
    console.log(`Human Samples: ${metadata.humanSamples} (${(metadata.humanSamples / metadata.totalSamples * 100).toFixed(2)}%)`);
    console.log(`Features: ${metadata.features.join(', ')}`);
    
    // Display first few samples
    console.log('\n=== Sample Data (first 3) ===');
    dataset.samples.slice(0, 3).forEach((sample, idx) => {
      console.log(`\nSample ${idx + 1}:`);
      console.log(`  IP: ${sample.ip}`);
      console.log(`  Label: ${sample.label}`);
      console.log(`  Features:`);
      Object.entries(sample.features).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
    });
    
    // Calculate feature statistics
    console.log('\n=== Feature Statistics ===');
    const featureStats = {};
    metadata.features.forEach(feature => {
      const values = dataset.samples.map(s => s.features[feature]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        featureStats[feature] = { mean, min, max };
        console.log(`${feature}:`);
        console.log(`  Mean: ${mean.toFixed(4)}`);
        console.log(`  Range: [${min.toFixed(4)}, ${max.toFixed(4)}]`);
      }
    });
    
    // Compare bot vs human features
    console.log('\n=== Bot vs Human Feature Comparison ===');
    const botSamples = dataset.samples.filter(s => s.label === 'bot');
    const humanSamples = dataset.samples.filter(s => s.label === 'human');
    
    metadata.features.forEach(feature => {
      const botValues = botSamples.map(s => s.features[feature]).filter(v => typeof v === 'number');
      const humanValues = humanSamples.map(s => s.features[feature]).filter(v => typeof v === 'number');
      
      if (botValues.length > 0 && humanValues.length > 0) {
        const botMean = botValues.reduce((a, b) => a + b, 0) / botValues.length;
        const humanMean = humanValues.reduce((a, b) => a + b, 0) / humanValues.length;
        
        console.log(`${feature}:`);
        console.log(`  Bot Mean: ${botMean.toFixed(4)}`);
        console.log(`  Human Mean: ${humanMean.toFixed(4)}`);
        console.log(`  Difference: ${(botMean - humanMean).toFixed(4)}`);
      }
    });
    
    console.log('\n✓ Dataset loaded successfully!');
    
  } catch (error) {
    console.error('Error loading dataset:', error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main();
}

module.exports = main;

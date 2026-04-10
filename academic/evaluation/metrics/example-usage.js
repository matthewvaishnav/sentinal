/**
 * Example usage of ClassificationMetrics
 * 
 * This file demonstrates how to use the classification metrics calculator
 * to evaluate bot detection performance.
 */

const ClassificationMetrics = require('./classification');

// Example: Evaluate SENTINEL's bot detection performance
function evaluateDetectionPerformance() {
  const metrics = new ClassificationMetrics();

  // Sample classification results from SENTINEL
  const results = [
    // True Positives: Correctly identified bots
    { actual: 'bot', predicted: 'bot' },
    { actual: 'bot', predicted: 'bot' },
    { actual: 'bot', predicted: 'bot' },
    { actual: 'bot', predicted: 'bot' },
    { actual: 'bot', predicted: 'bot' },
    
    // True Negatives: Correctly identified humans
    { actual: 'human', predicted: 'human' },
    { actual: 'human', predicted: 'human' },
    { actual: 'human', predicted: 'human' },
    { actual: 'human', predicted: 'human' },
    
    // False Positives: Humans incorrectly flagged as bots
    { actual: 'human', predicted: 'bot' },
    
    // False Negatives: Bots that evaded detection
    { actual: 'bot', predicted: 'human' }
  ];

  // Calculate all metrics
  const allMetrics = metrics.calculate(results);

  console.log('=== SENTINEL Bot Detection Performance ===\n');
  
  console.log('Confusion Matrix:');
  console.log(`  True Positives (TP):  ${allMetrics.confusionMatrix.tp}`);
  console.log(`  True Negatives (TN):  ${allMetrics.confusionMatrix.tn}`);
  console.log(`  False Positives (FP): ${allMetrics.confusionMatrix.fp}`);
  console.log(`  False Negatives (FN): ${allMetrics.confusionMatrix.fn}\n`);

  console.log('Classification Metrics:');
  console.log(`  Accuracy:    ${(allMetrics.accuracy * 100).toFixed(2)}%`);
  console.log(`  Precision:   ${(allMetrics.precision * 100).toFixed(2)}%`);
  console.log(`  Recall:      ${(allMetrics.recall * 100).toFixed(2)}%`);
  console.log(`  F1-Score:    ${(allMetrics.f1Score * 100).toFixed(2)}%`);
  console.log(`  Specificity: ${(allMetrics.specificity * 100).toFixed(2)}%\n`);

  // Interpretation
  console.log('Interpretation:');
  console.log(`  - ${allMetrics.confusionMatrix.tp} out of ${allMetrics.confusionMatrix.tp + allMetrics.confusionMatrix.fn} bots were detected`);
  console.log(`  - ${allMetrics.confusionMatrix.tn} out of ${allMetrics.confusionMatrix.tn + allMetrics.confusionMatrix.fp} humans were correctly allowed`);
  console.log(`  - ${allMetrics.confusionMatrix.fp} legitimate users were incorrectly blocked`);
  console.log(`  - ${allMetrics.confusionMatrix.fn} bots evaded detection\n`);

  return allMetrics;
}

// Example: Compare metrics across different datasets
function compareDatasets() {
  const metrics = new ClassificationMetrics();

  const datasets = {
    'CIC-DDoS2019': [
      { actual: 'bot', predicted: 'bot' },
      { actual: 'bot', predicted: 'bot' },
      { actual: 'human', predicted: 'human' },
      { actual: 'human', predicted: 'bot' }
    ],
    'CAIDA': [
      { actual: 'bot', predicted: 'bot' },
      { actual: 'bot', predicted: 'human' },
      { actual: 'human', predicted: 'human' },
      { actual: 'human', predicted: 'human' }
    ],
    'UNSW-NB15': [
      { actual: 'bot', predicted: 'bot' },
      { actual: 'bot', predicted: 'bot' },
      { actual: 'bot', predicted: 'bot' },
      { actual: 'human', predicted: 'human' }
    ]
  };

  console.log('=== Multi-Dataset Performance Comparison ===\n');
  console.log('Dataset         | Accuracy | Precision | Recall | F1-Score');
  console.log('----------------|----------|-----------|--------|----------');

  for (const [name, results] of Object.entries(datasets)) {
    const m = metrics.calculate(results);
    console.log(
      `${name.padEnd(15)} | ` +
      `${(m.accuracy * 100).toFixed(1).padStart(6)}% | ` +
      `${(m.precision * 100).toFixed(1).padStart(7)}% | ` +
      `${(m.recall * 100).toFixed(1).padStart(4)}% | ` +
      `${(m.f1Score * 100).toFixed(1).padStart(6)}%`
    );
  }
  console.log();
}

// Run examples if executed directly
if (require.main === module) {
  evaluateDetectionPerformance();
  console.log('\n' + '='.repeat(50) + '\n');
  compareDatasets();
}

module.exports = {
  evaluateDetectionPerformance,
  compareDatasets
};

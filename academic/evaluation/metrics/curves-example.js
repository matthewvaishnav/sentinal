/**
 * Example usage of ROC and PR curve generation
 * 
 * This example demonstrates how to generate ROC curves, PR curves,
 * and calculate AUC metrics for classifier evaluation.
 */

const CurveMetrics = require('./curves');

// Example 1: Basic ROC curve generation
function exampleROC() {
  console.log('=== Example 1: ROC Curve Generation ===\n');
  
  const curves = new CurveMetrics();
  
  // Simulated classification results with scores
  const results = [
    { score: 0.95, actual: 'bot' },
    { score: 0.88, actual: 'bot' },
    { score: 0.82, actual: 'bot' },
    { score: 0.75, actual: 'bot' },
    { score: 0.45, actual: 'human' },
    { score: 0.38, actual: 'human' },
    { score: 0.22, actual: 'human' },
    { score: 0.15, actual: 'human' }
  ];
  
  const roc = curves.generateROC(results);
  
  console.log(`Generated ${roc.points.length} ROC curve points`);
  console.log(`Area Under Curve (AUC): ${roc.auc.toFixed(4)}`);
  console.log('\nSample ROC points:');
  console.log('Threshold | TPR   | FPR');
  console.log('----------|-------|-------');
  
  // Show a few sample points
  for (let i = 0; i < roc.points.length; i += 20) {
    const p = roc.points[i];
    console.log(`${p.threshold.toFixed(2)}        | ${p.tpr.toFixed(3)} | ${p.fpr.toFixed(3)}`);
  }
  
  console.log('\n');
}

// Example 2: Precision-Recall curve generation
function examplePR() {
  console.log('=== Example 2: Precision-Recall Curve ===\n');
  
  const curves = new CurveMetrics();
  
  // Simulated classification results
  const results = [
    { score: 0.92, actual: 'bot' },
    { score: 0.85, actual: 'bot' },
    { score: 0.78, actual: 'bot' },
    { score: 0.65, actual: 'bot' },
    { score: 0.55, actual: 'human' },
    { score: 0.42, actual: 'human' },
    { score: 0.35, actual: 'human' },
    { score: 0.18, actual: 'human' }
  ];
  
  const pr = curves.generatePRCurve(results);
  
  console.log(`Generated ${pr.points.length} PR curve points`);
  console.log(`Average Precision: ${pr.averagePrecision.toFixed(4)}`);
  console.log('\nSample PR points:');
  console.log('Threshold | Precision | Recall');
  console.log('----------|-----------|-------');
  
  // Show a few sample points
  for (let i = 0; i < pr.points.length; i += 20) {
    const p = pr.points[i];
    console.log(`${p.threshold.toFixed(2)}        | ${p.precision.toFixed(3)}     | ${p.recall.toFixed(3)}`);
  }
  
  console.log('\n');
}

// Example 3: Comparing multiple classifiers
function exampleComparison() {
  console.log('=== Example 3: Comparing Multiple Classifiers ===\n');
  
  const curves = new CurveMetrics();
  
  // Classifier 1: Good performance
  const classifier1 = [
    { score: 0.95, actual: 'bot' },
    { score: 0.90, actual: 'bot' },
    { score: 0.85, actual: 'bot' },
    { score: 0.25, actual: 'human' },
    { score: 0.20, actual: 'human' },
    { score: 0.15, actual: 'human' }
  ];
  
  // Classifier 2: Moderate performance
  const classifier2 = [
    { score: 0.75, actual: 'bot' },
    { score: 0.70, actual: 'bot' },
    { score: 0.65, actual: 'bot' },
    { score: 0.55, actual: 'human' },
    { score: 0.50, actual: 'human' },
    { score: 0.45, actual: 'human' }
  ];
  
  const roc1 = curves.generateROC(classifier1);
  const roc2 = curves.generateROC(classifier2);
  
  const pr1 = curves.generatePRCurve(classifier1);
  const pr2 = curves.generatePRCurve(classifier2);
  
  console.log('Classifier Performance Comparison:');
  console.log('-----------------------------------');
  console.log(`Classifier 1 - AUC: ${roc1.auc.toFixed(4)}, AP: ${pr1.averagePrecision.toFixed(4)}`);
  console.log(`Classifier 2 - AUC: ${roc2.auc.toFixed(4)}, AP: ${pr2.averagePrecision.toFixed(4)}`);
  console.log('\n');
}

// Example 4: Finding optimal threshold
function exampleOptimalThreshold() {
  console.log('=== Example 4: Finding Optimal Threshold ===\n');
  
  const curves = new CurveMetrics();
  
  const results = [
    { score: 0.92, actual: 'bot' },
    { score: 0.87, actual: 'bot' },
    { score: 0.81, actual: 'bot' },
    { score: 0.76, actual: 'bot' },
    { score: 0.68, actual: 'bot' },
    { score: 0.55, actual: 'human' },
    { score: 0.48, actual: 'human' },
    { score: 0.42, actual: 'human' },
    { score: 0.35, actual: 'human' },
    { score: 0.28, actual: 'human' }
  ];
  
  const roc = curves.generateROC(results);
  
  // Find threshold that maximizes TPR - FPR (Youden's J statistic)
  let bestThreshold = 0;
  let bestJ = -1;
  
  for (const point of roc.points) {
    const j = point.tpr - point.fpr;
    if (j > bestJ) {
      bestJ = j;
      bestThreshold = point.threshold;
    }
  }
  
  console.log(`Optimal threshold (Youden's J): ${bestThreshold.toFixed(2)}`);
  console.log(`J statistic: ${bestJ.toFixed(4)}`);
  
  // Find threshold for 95% TPR
  let threshold95TPR = 1.0;
  for (const point of roc.points) {
    if (point.tpr >= 0.95) {
      threshold95TPR = point.threshold;
      break;
    }
  }
  
  console.log(`\nThreshold for 95% TPR: ${threshold95TPR.toFixed(2)}`);
  console.log('\n');
}

// Example 5: Handling imbalanced datasets
function exampleImbalanced() {
  console.log('=== Example 5: Imbalanced Dataset ===\n');
  
  const curves = new CurveMetrics();
  
  // Highly imbalanced: 90% bots, 10% humans
  const results = [];
  
  // 90 bots with high scores
  for (let i = 0; i < 90; i++) {
    results.push({ score: 0.7 + Math.random() * 0.3, actual: 'bot' });
  }
  
  // 10 humans with low scores
  for (let i = 0; i < 10; i++) {
    results.push({ score: Math.random() * 0.4, actual: 'human' });
  }
  
  const roc = curves.generateROC(results);
  const pr = curves.generatePRCurve(results);
  
  console.log('Imbalanced Dataset (90% bots, 10% humans):');
  console.log(`ROC AUC: ${roc.auc.toFixed(4)}`);
  console.log(`Average Precision: ${pr.averagePrecision.toFixed(4)}`);
  console.log('\nNote: PR curves are more informative for imbalanced datasets');
  console.log('      as they focus on the positive class performance.\n');
}

// Run all examples
if (require.main === module) {
  exampleROC();
  examplePR();
  exampleComparison();
  exampleOptimalThreshold();
  exampleImbalanced();
}

module.exports = {
  exampleROC,
  examplePR,
  exampleComparison,
  exampleOptimalThreshold,
  exampleImbalanced
};

/**
 * Integration example showing how to use classification metrics and curves together
 */

const ClassificationMetrics = require('./classification');
const CurveMetrics = require('./curves');

function integratedEvaluation() {
  console.log('=== Integrated Evaluation Example ===\n');
  
  // Simulated classifier results with scores
  const resultsWithScores = [
    { score: 0.95, actual: 'bot', predicted: 'bot' },
    { score: 0.88, actual: 'bot', predicted: 'bot' },
    { score: 0.82, actual: 'bot', predicted: 'bot' },
    { score: 0.75, actual: 'bot', predicted: 'bot' },
    { score: 0.68, actual: 'bot', predicted: 'bot' },
    { score: 0.55, actual: 'human', predicted: 'bot' },  // False positive
    { score: 0.45, actual: 'human', predicted: 'human' },
    { score: 0.38, actual: 'human', predicted: 'human' },
    { score: 0.22, actual: 'human', predicted: 'human' },
    { score: 0.15, actual: 'human', predicted: 'human' }
  ];
  
  // Calculate classification metrics
  const classMetrics = new ClassificationMetrics();
  const metrics = classMetrics.calculate(resultsWithScores);
  
  console.log('Classification Metrics:');
  console.log('----------------------');
  console.log(`Accuracy:    ${metrics.accuracy.toFixed(4)}`);
  console.log(`Precision:   ${metrics.precision.toFixed(4)}`);
  console.log(`Recall:      ${metrics.recall.toFixed(4)}`);
  console.log(`F1-Score:    ${metrics.f1Score.toFixed(4)}`);
  console.log(`Specificity: ${metrics.specificity.toFixed(4)}`);
  console.log('\nConfusion Matrix:');
  console.log(`TP: ${metrics.confusionMatrix.tp}, FP: ${metrics.confusionMatrix.fp}`);
  console.log(`FN: ${metrics.confusionMatrix.fn}, TN: ${metrics.confusionMatrix.tn}`);
  
  // Generate curves
  const curves = new CurveMetrics();
  const roc = curves.generateROC(resultsWithScores);
  const pr = curves.generatePRCurve(resultsWithScores);
  
  console.log('\nCurve Metrics:');
  console.log('--------------');
  console.log(`ROC AUC:           ${roc.auc.toFixed(4)}`);
  console.log(`Average Precision: ${pr.averagePrecision.toFixed(4)}`);
  
  console.log('\nInterpretation:');
  console.log('---------------');
  if (roc.auc > 0.9) {
    console.log('✓ Excellent classifier (AUC > 0.9)');
  } else if (roc.auc > 0.8) {
    console.log('✓ Good classifier (AUC > 0.8)');
  } else if (roc.auc > 0.7) {
    console.log('○ Fair classifier (AUC > 0.7)');
  } else {
    console.log('✗ Poor classifier (AUC < 0.7)');
  }
  
  if (metrics.f1Score > 0.9) {
    console.log('✓ High F1-score (> 0.9)');
  } else if (metrics.f1Score > 0.8) {
    console.log('✓ Good F1-score (> 0.8)');
  } else {
    console.log('○ Moderate F1-score');
  }
  
  console.log('\n');
}

if (require.main === module) {
  integratedEvaluation();
}

module.exports = { integratedEvaluation };

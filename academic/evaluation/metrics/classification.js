/**
 * Classification Metrics Calculator
 * 
 * Provides comprehensive classification metrics for binary classification
 * (bot vs human detection). All metrics are calculated from confusion matrix
 * components (TP, TN, FP, FN).
 * 
 * @module academic/evaluation/metrics/classification
 */

class ClassificationMetrics {
  /**
   * Calculate confusion matrix from classification results
   * @param {Array<{predicted: string, actual: string}>} results - Classification results
   * @returns {{tp: number, tn: number, fp: number, fn: number}} Confusion matrix
   */
  confusionMatrix(results) {
    let tp = 0; // True Positives: actual bot, predicted bot
    let tn = 0; // True Negatives: actual human, predicted human
    let fp = 0; // False Positives: actual human, predicted bot
    let fn = 0; // False Negatives: actual bot, predicted human

    for (const result of results) {
      if (result.actual === 'bot' && result.predicted === 'bot') {
        tp++;
      } else if (result.actual === 'human' && result.predicted === 'human') {
        tn++;
      } else if (result.actual === 'human' && result.predicted === 'bot') {
        fp++;
      } else if (result.actual === 'bot' && result.predicted === 'human') {
        fn++;
      }
    }

    return { tp, tn, fp, fn };
  }

  /**
   * Calculate accuracy: (TP + TN) / (TP + TN + FP + FN)
   * @param {{tp: number, tn: number, fp: number, fn: number}} cm - Confusion matrix
   * @returns {number} Accuracy in range [0, 1]
   */
  accuracy(cm) {
    const total = cm.tp + cm.tn + cm.fp + cm.fn;
    if (total === 0) return 0;
    return (cm.tp + cm.tn) / total;
  }

  /**
   * Calculate precision: TP / (TP + FP)
   * Measures how many predicted bots are actually bots
   * @param {{tp: number, tn: number, fp: number, fn: number}} cm - Confusion matrix
   * @returns {number} Precision in range [0, 1]
   */
  precision(cm) {
    const denominator = cm.tp + cm.fp;
    if (denominator === 0) return 0;
    return cm.tp / denominator;
  }

  /**
   * Calculate recall (sensitivity, true positive rate): TP / (TP + FN)
   * Measures how many actual bots are correctly identified
   * @param {{tp: number, tn: number, fp: number, fn: number}} cm - Confusion matrix
   * @returns {number} Recall in range [0, 1]
   */
  recall(cm) {
    const denominator = cm.tp + cm.fn;
    if (denominator === 0) return 0;
    return cm.tp / denominator;
  }

  /**
   * Calculate F1-score: 2 * (precision * recall) / (precision + recall)
   * Harmonic mean of precision and recall
   * @param {{tp: number, tn: number, fp: number, fn: number}} cm - Confusion matrix
   * @returns {number} F1-score in range [0, 1]
   */
  f1Score(cm) {
    const prec = this.precision(cm);
    const rec = this.recall(cm);
    
    if (prec + rec === 0) return 0;
    return 2 * (prec * rec) / (prec + rec);
  }

  /**
   * Calculate specificity (true negative rate): TN / (TN + FP)
   * Measures how many actual humans are correctly identified
   * @param {{tp: number, tn: number, fp: number, fn: number}} cm - Confusion matrix
   * @returns {number} Specificity in range [0, 1]
   */
  specificity(cm) {
    const denominator = cm.tn + cm.fp;
    if (denominator === 0) return 0;
    return cm.tn / denominator;
  }

  /**
   * Calculate all classification metrics from results
   * @param {Array<{predicted: string, actual: string}>} results - Classification results
   * @returns {Object} All metrics including confusion matrix
   */
  calculate(results) {
    const cm = this.confusionMatrix(results);
    
    return {
      confusionMatrix: cm,
      accuracy: this.accuracy(cm),
      precision: this.precision(cm),
      recall: this.recall(cm),
      f1Score: this.f1Score(cm),
      specificity: this.specificity(cm)
    };
  }
}

module.exports = ClassificationMetrics;

/**
 * ROC and Precision-Recall Curve Generation
 * 
 * Provides functionality for generating ROC curves, PR curves, and calculating
 * Area Under Curve (AUC) metrics for binary classification evaluation.
 * 
 * @module academic/evaluation/metrics/curves
 */

class CurveMetrics {
  /**
   * Generate ROC curve data by sweeping through thresholds
   * @param {Array<{score: number, actual: string}>} results - Classification results with scores
   * @returns {{points: Array<{threshold: number, tpr: number, fpr: number}>, auc: number}}
   */
  generateROC(results) {
    if (!results || results.length === 0) {
      return { points: [], auc: 0 };
    }

    // Sort by score descending (highest scores first)
    const sorted = [...results].sort((a, b) => b.score - a.score);
    
    // Count total positives and negatives
    const totalPositives = results.filter(r => r.actual === 'bot').length;
    const totalNegatives = results.filter(r => r.actual === 'human').length;
    
    if (totalPositives === 0 || totalNegatives === 0) {
      return { points: [], auc: 0 };
    }

    const points = [];
    
    // Generate points by sweeping thresholds from 0 to 1 (101 points)
    for (let i = 0; i <= 100; i++) {
      const threshold = i / 100;
      let tp = 0, fp = 0, fn = 0, tn = 0;
      
      for (const result of sorted) {
        const predicted = result.score >= threshold ? 'bot' : 'human';
        
        if (result.actual === 'bot' && predicted === 'bot') {
          tp++;
        } else if (result.actual === 'human' && predicted === 'human') {
          tn++;
        } else if (result.actual === 'human' && predicted === 'bot') {
          fp++;
        } else if (result.actual === 'bot' && predicted === 'human') {
          fn++;
        }
      }
      
      const tpr = tp / totalPositives; // True Positive Rate (Recall)
      const fpr = fp / totalNegatives; // False Positive Rate
      
      points.push({ threshold, tpr, fpr });
    }
    
    // Calculate AUC using trapezoidal rule
    const auc = this.calculateAUC(points);
    
    return { points, auc };
  }

  /**
   * Calculate Area Under Curve using trapezoidal rule
   * @param {Array<{fpr: number, tpr: number}>} points - ROC curve points
   * @returns {number} AUC value in range [0, 1]
   */
  calculateAUC(points) {
    if (!points || points.length < 2) {
      return 0;
    }

    // Sort by FPR to ensure correct integration
    const sorted = [...points].sort((a, b) => a.fpr - b.fpr);
    
    let auc = 0;
    
    // Trapezoidal rule: sum of trapezoid areas
    for (let i = 1; i < sorted.length; i++) {
      const width = sorted[i].fpr - sorted[i - 1].fpr;
      const height = (sorted[i].tpr + sorted[i - 1].tpr) / 2;
      auc += width * height;
    }
    
    return auc;
  }

  /**
   * Generate Precision-Recall curve data
   * @param {Array<{score: number, actual: string}>} results - Classification results with scores
   * @returns {{points: Array<{threshold: number, precision: number, recall: number}>, averagePrecision: number}}
   */
  generatePRCurve(results) {
    if (!results || results.length === 0) {
      return { points: [], averagePrecision: 0 };
    }

    // Sort by score descending
    const sorted = [...results].sort((a, b) => b.score - a.score);
    
    const totalPositives = results.filter(r => r.actual === 'bot').length;
    
    if (totalPositives === 0) {
      return { points: [], averagePrecision: 0 };
    }

    const points = [];
    
    // Generate points by sweeping thresholds (101 points)
    for (let i = 0; i <= 100; i++) {
      const threshold = i / 100;
      let tp = 0, fp = 0, fn = 0;
      
      for (const result of sorted) {
        const predicted = result.score >= threshold ? 'bot' : 'human';
        
        if (result.actual === 'bot' && predicted === 'bot') {
          tp++;
        } else if (result.actual === 'human' && predicted === 'bot') {
          fp++;
        } else if (result.actual === 'bot' && predicted === 'human') {
          fn++;
        }
      }
      
      const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
      const recall = tp / totalPositives;
      
      points.push({ threshold, precision, recall });
    }
    
    // Calculate Average Precision
    const averagePrecision = this.calculateAveragePrecision(points);
    
    return { points, averagePrecision };
  }

  /**
   * Calculate Average Precision score
   * Average Precision is the area under the precision-recall curve
   * @param {Array<{recall: number, precision: number}>} points - PR curve points
   * @returns {number} Average Precision in range [0, 1]
   */
  calculateAveragePrecision(points) {
    if (!points || points.length < 2) {
      return 0;
    }

    // Sort by recall ascending
    const sorted = [...points].sort((a, b) => a.recall - b.recall);
    
    let ap = 0;
    
    // Trapezoidal rule for area under PR curve
    for (let i = 1; i < sorted.length; i++) {
      const recallDelta = sorted[i].recall - sorted[i - 1].recall;
      const avgPrecision = (sorted[i].precision + sorted[i - 1].precision) / 2;
      ap += recallDelta * avgPrecision;
    }
    
    return ap;
  }
}

module.exports = CurveMetrics;

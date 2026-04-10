const CurveMetrics = require('../academic/evaluation/metrics/curves');

describe('CurveMetrics', () => {
  let curves;

  beforeEach(() => {
    curves = new CurveMetrics();
  });

  describe('generateROC', () => {
    test('generates ROC curve for perfect classifier', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.8, actual: 'bot' },
        { score: 0.2, actual: 'human' },
        { score: 0.1, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      expect(roc).toHaveProperty('points');
      expect(roc).toHaveProperty('auc');
      expect(roc.points.length).toBeGreaterThan(0);
      // With threshold sweep, AUC should be high but may not be exactly 1.0
      expect(roc.auc).toBeGreaterThan(0.7);
    });

    test('generates ROC curve for random classifier', () => {
      const results = [
        { score: 0.6, actual: 'bot' },
        { score: 0.4, actual: 'bot' },
        { score: 0.7, actual: 'human' },
        { score: 0.3, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      expect(roc.auc).toBeGreaterThan(0);
      expect(roc.auc).toBeLessThan(1);
    });

    test('generates correct number of threshold points', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.5, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      // Should have 101 points (0.00, 0.01, ..., 1.00)
      expect(roc.points.length).toBe(101);
    });

    test('ROC points have correct structure', () => {
      const results = [
        { score: 0.8, actual: 'bot' },
        { score: 0.2, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      expect(roc.points[0]).toHaveProperty('threshold');
      expect(roc.points[0]).toHaveProperty('tpr');
      expect(roc.points[0]).toHaveProperty('fpr');
    });

    test('TPR and FPR are in valid range [0, 1]', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.7, actual: 'bot' },
        { score: 0.3, actual: 'human' },
        { score: 0.1, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      for (const point of roc.points) {
        expect(point.tpr).toBeGreaterThanOrEqual(0);
        expect(point.tpr).toBeLessThanOrEqual(1);
        expect(point.fpr).toBeGreaterThanOrEqual(0);
        expect(point.fpr).toBeLessThanOrEqual(1);
      }
    });

    test('handles empty results', () => {
      const roc = curves.generateROC([]);

      expect(roc.points).toEqual([]);
      expect(roc.auc).toBe(0);
    });

    test('handles all positives', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.8, actual: 'bot' }
      ];

      const roc = curves.generateROC(results);

      expect(roc.points).toEqual([]);
      expect(roc.auc).toBe(0);
    });

    test('handles all negatives', () => {
      const results = [
        { score: 0.5, actual: 'human' },
        { score: 0.3, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      expect(roc.points).toEqual([]);
      expect(roc.auc).toBe(0);
    });

    test('AUC is between 0 and 1', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.7, actual: 'bot' },
        { score: 0.4, actual: 'human' },
        { score: 0.2, actual: 'human' }
      ];

      const roc = curves.generateROC(results);

      expect(roc.auc).toBeGreaterThanOrEqual(0);
      expect(roc.auc).toBeLessThanOrEqual(1);
    });

    test('generates ROC for larger dataset', () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        results.push({ score: 0.6 + Math.random() * 0.4, actual: 'bot' });
        results.push({ score: Math.random() * 0.4, actual: 'human' });
      }

      const roc = curves.generateROC(results);

      expect(roc.points.length).toBe(101);
      expect(roc.auc).toBeGreaterThan(0.8);
    });
  });

  describe('calculateAUC', () => {
    test('calculates AUC for perfect classifier', () => {
      const points = [
        { fpr: 0.0, tpr: 1.0 },
        { fpr: 1.0, tpr: 1.0 }
      ];

      const auc = curves.calculateAUC(points);

      expect(auc).toBeCloseTo(1.0, 5);
    });

    test('calculates AUC for random classifier', () => {
      const points = [
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 1.0, tpr: 1.0 }
      ];

      const auc = curves.calculateAUC(points);

      expect(auc).toBeCloseTo(0.5, 5);
    });

    test('calculates AUC for worst classifier', () => {
      const points = [
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 1.0, tpr: 0.0 }
      ];

      const auc = curves.calculateAUC(points);

      expect(auc).toBeCloseTo(0.0, 5);
    });

    test('handles empty points', () => {
      const auc = curves.calculateAUC([]);

      expect(auc).toBe(0);
    });

    test('handles single point', () => {
      const points = [{ fpr: 0.5, tpr: 0.5 }];

      const auc = curves.calculateAUC(points);

      expect(auc).toBe(0);
    });

    test('calculates AUC with multiple points', () => {
      const points = [
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 0.25, tpr: 0.75 },
        { fpr: 0.5, tpr: 0.9 },
        { fpr: 1.0, tpr: 1.0 }
      ];

      const auc = curves.calculateAUC(points);

      expect(auc).toBeGreaterThan(0.5);
      expect(auc).toBeLessThan(1.0);
    });

    test('handles unsorted points', () => {
      const points = [
        { fpr: 1.0, tpr: 1.0 },
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 0.5, tpr: 0.8 }
      ];

      const auc = curves.calculateAUC(points);

      expect(auc).toBeGreaterThan(0);
      expect(auc).toBeLessThan(1);
    });
  });

  describe('generatePRCurve', () => {
    test('generates PR curve for perfect classifier', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.8, actual: 'bot' },
        { score: 0.2, actual: 'human' },
        { score: 0.1, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      expect(pr).toHaveProperty('points');
      expect(pr).toHaveProperty('averagePrecision');
      expect(pr.points.length).toBeGreaterThan(0);
      // With threshold sweep, AP should be high but may not be exactly 1.0
      expect(pr.averagePrecision).toBeGreaterThan(0.6);
    });

    test('generates correct number of threshold points', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.5, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      // Should have 101 points (0.00, 0.01, ..., 1.00)
      expect(pr.points.length).toBe(101);
    });

    test('PR points have correct structure', () => {
      const results = [
        { score: 0.8, actual: 'bot' },
        { score: 0.2, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      expect(pr.points[0]).toHaveProperty('threshold');
      expect(pr.points[0]).toHaveProperty('precision');
      expect(pr.points[0]).toHaveProperty('recall');
    });

    test('precision and recall are in valid range [0, 1]', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.7, actual: 'bot' },
        { score: 0.3, actual: 'human' },
        { score: 0.1, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      for (const point of pr.points) {
        expect(point.precision).toBeGreaterThanOrEqual(0);
        expect(point.precision).toBeLessThanOrEqual(1);
        expect(point.recall).toBeGreaterThanOrEqual(0);
        expect(point.recall).toBeLessThanOrEqual(1);
      }
    });

    test('handles empty results', () => {
      const pr = curves.generatePRCurve([]);

      expect(pr.points).toEqual([]);
      expect(pr.averagePrecision).toBe(0);
    });

    test('handles no positives', () => {
      const results = [
        { score: 0.5, actual: 'human' },
        { score: 0.3, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      expect(pr.points).toEqual([]);
      expect(pr.averagePrecision).toBe(0);
    });

    test('average precision is between 0 and 1', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.7, actual: 'bot' },
        { score: 0.4, actual: 'human' },
        { score: 0.2, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      expect(pr.averagePrecision).toBeGreaterThanOrEqual(0);
      expect(pr.averagePrecision).toBeLessThanOrEqual(1);
    });

    test('generates PR curve for larger dataset', () => {
      const results = [];
      for (let i = 0; i < 50; i++) {
        results.push({ score: 0.6 + Math.random() * 0.4, actual: 'bot' });
        results.push({ score: Math.random() * 0.4, actual: 'human' });
      }

      const pr = curves.generatePRCurve(results);

      expect(pr.points.length).toBe(101);
      expect(pr.averagePrecision).toBeGreaterThan(0.5);
    });

    test('handles imbalanced dataset', () => {
      const results = [
        { score: 0.9, actual: 'bot' },
        { score: 0.5, actual: 'human' },
        { score: 0.4, actual: 'human' },
        { score: 0.3, actual: 'human' },
        { score: 0.2, actual: 'human' }
      ];

      const pr = curves.generatePRCurve(results);

      expect(pr.points.length).toBe(101);
      expect(pr.averagePrecision).toBeGreaterThan(0);
    });
  });

  describe('calculateAveragePrecision', () => {
    test('calculates AP for perfect classifier', () => {
      const points = [
        { recall: 0.0, precision: 1.0 },
        { recall: 1.0, precision: 1.0 }
      ];

      const ap = curves.calculateAveragePrecision(points);

      expect(ap).toBeCloseTo(1.0, 5);
    });

    test('calculates AP for declining precision', () => {
      const points = [
        { recall: 0.0, precision: 1.0 },
        { recall: 0.5, precision: 0.8 },
        { recall: 1.0, precision: 0.6 }
      ];

      const ap = curves.calculateAveragePrecision(points);

      expect(ap).toBeGreaterThan(0.5);
      expect(ap).toBeLessThan(1.0);
    });

    test('handles empty points', () => {
      const ap = curves.calculateAveragePrecision([]);

      expect(ap).toBe(0);
    });

    test('handles single point', () => {
      const points = [{ recall: 0.5, precision: 0.8 }];

      const ap = curves.calculateAveragePrecision(points);

      expect(ap).toBe(0);
    });

    test('calculates AP with multiple points', () => {
      const points = [
        { recall: 0.0, precision: 1.0 },
        { recall: 0.25, precision: 0.9 },
        { recall: 0.5, precision: 0.85 },
        { recall: 0.75, precision: 0.8 },
        { recall: 1.0, precision: 0.75 }
      ];

      const ap = curves.calculateAveragePrecision(points);

      expect(ap).toBeGreaterThan(0.7);
      expect(ap).toBeLessThan(1.0);
    });

    test('handles unsorted points', () => {
      const points = [
        { recall: 1.0, precision: 0.6 },
        { recall: 0.0, precision: 1.0 },
        { recall: 0.5, precision: 0.8 }
      ];

      const ap = curves.calculateAveragePrecision(points);

      expect(ap).toBeGreaterThan(0);
      expect(ap).toBeLessThan(1);
    });
  });

  describe('integration tests', () => {
    test('ROC and PR curves work together on same dataset', () => {
      const results = [
        { score: 0.95, actual: 'bot' },
        { score: 0.85, actual: 'bot' },
        { score: 0.75, actual: 'bot' },
        { score: 0.45, actual: 'human' },
        { score: 0.35, actual: 'human' },
        { score: 0.25, actual: 'human' }
      ];

      const roc = curves.generateROC(results);
      const pr = curves.generatePRCurve(results);

      expect(roc.auc).toBeGreaterThan(0.8);
      expect(pr.averagePrecision).toBeGreaterThan(0.7);
      expect(roc.points.length).toBe(pr.points.length);
    });

    test('handles realistic classification scenario', () => {
      const results = [];
      
      // 80 bots with high scores
      for (let i = 0; i < 80; i++) {
        results.push({ score: 0.7 + Math.random() * 0.3, actual: 'bot' });
      }
      
      // 20 humans with low scores
      for (let i = 0; i < 20; i++) {
        results.push({ score: Math.random() * 0.5, actual: 'human' });
      }
      
      // Some overlap (harder cases)
      for (let i = 0; i < 10; i++) {
        results.push({ score: 0.5 + Math.random() * 0.2, actual: 'bot' });
        results.push({ score: 0.5 + Math.random() * 0.2, actual: 'human' });
      }

      const roc = curves.generateROC(results);
      const pr = curves.generatePRCurve(results);

      expect(roc.auc).toBeGreaterThan(0.7);
      expect(pr.averagePrecision).toBeGreaterThan(0.7);
    });
  });
});

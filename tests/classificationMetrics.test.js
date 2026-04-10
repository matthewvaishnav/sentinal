const ClassificationMetrics = require('../academic/evaluation/metrics/classification');

describe('ClassificationMetrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new ClassificationMetrics();
  });

  describe('confusionMatrix', () => {
    test('calculates confusion matrix correctly for perfect classification', () => {
      const results = [
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'bot' },
        { actual: 'human', predicted: 'human' },
        { actual: 'human', predicted: 'human' }
      ];

      const cm = metrics.confusionMatrix(results);

      expect(cm).toEqual({
        tp: 2,
        tn: 2,
        fp: 0,
        fn: 0
      });
    });

    test('calculates confusion matrix with false positives and false negatives', () => {
      const results = [
        { actual: 'bot', predicted: 'bot' },      // TP
        { actual: 'bot', predicted: 'human' },    // FN
        { actual: 'human', predicted: 'bot' },    // FP
        { actual: 'human', predicted: 'human' }   // TN
      ];

      const cm = metrics.confusionMatrix(results);

      expect(cm).toEqual({
        tp: 1,
        tn: 1,
        fp: 1,
        fn: 1
      });
    });

    test('handles empty results', () => {
      const cm = metrics.confusionMatrix([]);

      expect(cm).toEqual({
        tp: 0,
        tn: 0,
        fp: 0,
        fn: 0
      });
    });

    test('handles all bots correctly classified', () => {
      const results = [
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'bot' }
      ];

      const cm = metrics.confusionMatrix(results);

      expect(cm).toEqual({
        tp: 3,
        tn: 0,
        fp: 0,
        fn: 0
      });
    });

    test('handles all humans correctly classified', () => {
      const results = [
        { actual: 'human', predicted: 'human' },
        { actual: 'human', predicted: 'human' }
      ];

      const cm = metrics.confusionMatrix(results);

      expect(cm).toEqual({
        tp: 0,
        tn: 2,
        fp: 0,
        fn: 0
      });
    });
  });

  describe('accuracy', () => {
    test('calculates 100% accuracy for perfect classification', () => {
      const cm = { tp: 50, tn: 50, fp: 0, fn: 0 };
      expect(metrics.accuracy(cm)).toBe(1.0);
    });

    test('calculates 50% accuracy for half correct', () => {
      const cm = { tp: 25, tn: 25, fp: 25, fn: 25 };
      expect(metrics.accuracy(cm)).toBe(0.5);
    });

    test('calculates 0% accuracy for all wrong', () => {
      const cm = { tp: 0, tn: 0, fp: 50, fn: 50 };
      expect(metrics.accuracy(cm)).toBe(0);
    });

    test('handles zero total samples', () => {
      const cm = { tp: 0, tn: 0, fp: 0, fn: 0 };
      expect(metrics.accuracy(cm)).toBe(0);
    });

    test('calculates accuracy with realistic values', () => {
      const cm = { tp: 90, tn: 85, fp: 5, fn: 10 };
      const expected = (90 + 85) / (90 + 85 + 5 + 10);
      expect(metrics.accuracy(cm)).toBeCloseTo(expected, 5);
    });
  });

  describe('precision', () => {
    test('calculates 100% precision when no false positives', () => {
      const cm = { tp: 50, tn: 50, fp: 0, fn: 10 };
      expect(metrics.precision(cm)).toBe(1.0);
    });

    test('calculates 50% precision', () => {
      const cm = { tp: 50, tn: 40, fp: 50, fn: 10 };
      expect(metrics.precision(cm)).toBe(0.5);
    });

    test('calculates 0% precision when all predictions are false positives', () => {
      const cm = { tp: 0, tn: 50, fp: 50, fn: 0 };
      expect(metrics.precision(cm)).toBe(0);
    });

    test('handles zero predicted positives', () => {
      const cm = { tp: 0, tn: 100, fp: 0, fn: 50 };
      expect(metrics.precision(cm)).toBe(0);
    });

    test('calculates precision with realistic values', () => {
      const cm = { tp: 90, tn: 85, fp: 5, fn: 10 };
      const expected = 90 / (90 + 5);
      expect(metrics.precision(cm)).toBeCloseTo(expected, 5);
    });
  });

  describe('recall', () => {
    test('calculates 100% recall when no false negatives', () => {
      const cm = { tp: 50, tn: 40, fp: 10, fn: 0 };
      expect(metrics.recall(cm)).toBe(1.0);
    });

    test('calculates 50% recall', () => {
      const cm = { tp: 50, tn: 40, fp: 10, fn: 50 };
      expect(metrics.recall(cm)).toBe(0.5);
    });

    test('calculates 0% recall when all actual positives are missed', () => {
      const cm = { tp: 0, tn: 50, fp: 10, fn: 50 };
      expect(metrics.recall(cm)).toBe(0);
    });

    test('handles zero actual positives', () => {
      const cm = { tp: 0, tn: 100, fp: 50, fn: 0 };
      expect(metrics.recall(cm)).toBe(0);
    });

    test('calculates recall with realistic values', () => {
      const cm = { tp: 90, tn: 85, fp: 5, fn: 10 };
      const expected = 90 / (90 + 10);
      expect(metrics.recall(cm)).toBeCloseTo(expected, 5);
    });
  });

  describe('f1Score', () => {
    test('calculates 100% F1-score for perfect classification', () => {
      const cm = { tp: 50, tn: 50, fp: 0, fn: 0 };
      expect(metrics.f1Score(cm)).toBe(1.0);
    });

    test('calculates F1-score as harmonic mean of precision and recall', () => {
      const cm = { tp: 80, tn: 70, fp: 20, fn: 10 };
      const precision = 80 / (80 + 20); // 0.8
      const recall = 80 / (80 + 10);    // 0.888...
      const expected = 2 * (precision * recall) / (precision + recall);
      expect(metrics.f1Score(cm)).toBeCloseTo(expected, 5);
    });

    test('calculates 0 F1-score when precision and recall are 0', () => {
      const cm = { tp: 0, tn: 50, fp: 50, fn: 50 };
      expect(metrics.f1Score(cm)).toBe(0);
    });

    test('handles edge case where precision is 0 but recall is not', () => {
      const cm = { tp: 0, tn: 50, fp: 50, fn: 0 };
      expect(metrics.f1Score(cm)).toBe(0);
    });

    test('handles edge case where recall is 0 but precision is not', () => {
      const cm = { tp: 0, tn: 50, fp: 0, fn: 50 };
      expect(metrics.f1Score(cm)).toBe(0);
    });

    test('calculates F1-score with realistic values', () => {
      const cm = { tp: 90, tn: 85, fp: 5, fn: 10 };
      const precision = 90 / 95;
      const recall = 90 / 100;
      const expected = 2 * (precision * recall) / (precision + recall);
      expect(metrics.f1Score(cm)).toBeCloseTo(expected, 5);
    });
  });

  describe('specificity', () => {
    test('calculates 100% specificity when no false positives', () => {
      const cm = { tp: 50, tn: 50, fp: 0, fn: 10 };
      expect(metrics.specificity(cm)).toBe(1.0);
    });

    test('calculates 50% specificity', () => {
      const cm = { tp: 50, tn: 50, fp: 50, fn: 10 };
      expect(metrics.specificity(cm)).toBe(0.5);
    });

    test('calculates 0% specificity when all humans misclassified', () => {
      const cm = { tp: 50, tn: 0, fp: 50, fn: 0 };
      expect(metrics.specificity(cm)).toBe(0);
    });

    test('handles zero actual negatives', () => {
      const cm = { tp: 100, tn: 0, fp: 0, fn: 50 };
      expect(metrics.specificity(cm)).toBe(0);
    });

    test('calculates specificity with realistic values', () => {
      const cm = { tp: 90, tn: 85, fp: 5, fn: 10 };
      const expected = 85 / (85 + 5);
      expect(metrics.specificity(cm)).toBeCloseTo(expected, 5);
    });
  });

  describe('calculate', () => {
    test('calculates all metrics from results', () => {
      const results = [
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'human' },
        { actual: 'human', predicted: 'human' },
        { actual: 'human', predicted: 'human' },
        { actual: 'human', predicted: 'bot' }
      ];

      const allMetrics = metrics.calculate(results);

      expect(allMetrics).toHaveProperty('confusionMatrix');
      expect(allMetrics).toHaveProperty('accuracy');
      expect(allMetrics).toHaveProperty('precision');
      expect(allMetrics).toHaveProperty('recall');
      expect(allMetrics).toHaveProperty('f1Score');
      expect(allMetrics).toHaveProperty('specificity');

      expect(allMetrics.confusionMatrix).toEqual({
        tp: 2,
        tn: 2,
        fp: 1,
        fn: 1
      });

      expect(allMetrics.accuracy).toBeCloseTo(4 / 6, 5);
      expect(allMetrics.precision).toBeCloseTo(2 / 3, 5);
      expect(allMetrics.recall).toBeCloseTo(2 / 3, 5);
      expect(allMetrics.specificity).toBeCloseTo(2 / 3, 5);
    });

    test('handles perfect classification', () => {
      const results = [
        { actual: 'bot', predicted: 'bot' },
        { actual: 'bot', predicted: 'bot' },
        { actual: 'human', predicted: 'human' },
        { actual: 'human', predicted: 'human' }
      ];

      const allMetrics = metrics.calculate(results);

      expect(allMetrics.accuracy).toBe(1.0);
      expect(allMetrics.precision).toBe(1.0);
      expect(allMetrics.recall).toBe(1.0);
      expect(allMetrics.f1Score).toBe(1.0);
      expect(allMetrics.specificity).toBe(1.0);
    });

    test('handles empty results', () => {
      const allMetrics = metrics.calculate([]);

      expect(allMetrics.confusionMatrix).toEqual({
        tp: 0,
        tn: 0,
        fp: 0,
        fn: 0
      });

      expect(allMetrics.accuracy).toBe(0);
      expect(allMetrics.precision).toBe(0);
      expect(allMetrics.recall).toBe(0);
      expect(allMetrics.f1Score).toBe(0);
      expect(allMetrics.specificity).toBe(0);
    });
  });
});

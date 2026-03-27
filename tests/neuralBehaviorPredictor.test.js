const NeuralBehaviorPredictor = require('../src/neuralBehaviorPredictor');

describe('NeuralBehaviorPredictor', () => {
  let predictor;
  
  beforeEach(() => {
    predictor = new NeuralBehaviorPredictor();
  });
  
  describe('predict()', () => {
    test('returns prediction for new IP', () => {
      const features = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      const prediction = predictor.predict('1.2.3.4', features);
      
      expect(prediction).toHaveProperty('botProbability');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.botProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.botProbability).toBeLessThanOrEqual(1);
    });
    
    test('caches predictions', () => {
      const features = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      predictor.predict('1.2.3.4', features);
      
      const stats = predictor.getStats();
      expect(stats.totalPredictions).toBe(1);
    });
  });
  
  describe('learn()', () => {
    test('updates weights when learning bot', () => {
      const botFeatures = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      // Make prediction
      predictor.predict('1.2.3.4', botFeatures);
      
      // Learn that it's a bot
      predictor.learn('1.2.3.4', true);
      
      const stats = predictor.getStats();
      expect(stats.totalLearned).toBe(1);
    });
    
    test('improves accuracy with learning', () => {
      const botFeatures = {
        timingCV: 0.05,
        uaEntropy: 0.5,
        pathDiversity: 0.3,
        headerCount: 2,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.1
      };
      
      const humanFeatures = {
        timingCV: 0.9,
        uaEntropy: 6.5,
        pathDiversity: 5.0,
        headerCount: 15,
        acceptLangRate: 1.0,
        methodVariety: 4.0,
        sizeVariance: 3.0
      };
      
      // Train on multiple examples
      for (let i = 0; i < 20; i++) {
        const botIP = `1.2.3.${i}`;
        const humanIP = `5.6.7.${i}`;
        
        predictor.predict(botIP, botFeatures);
        predictor.learn(botIP, true);
        
        predictor.predict(humanIP, humanFeatures);
        predictor.learn(humanIP, false);
      }
      
      // Test on new examples
      const botPred = predictor.predict('10.0.0.1', botFeatures);
      const humanPred = predictor.predict('10.0.0.2', humanFeatures);
      
      // Bot should have high probability
      expect(botPred.botProbability).toBeGreaterThan(0.5);
      
      // Human should have low probability
      expect(humanPred.botProbability).toBeLessThan(0.5);
    });
  });
  
  describe('getStats()', () => {
    test('tracks prediction statistics', () => {
      const features = {
        timingCV: 0.5,
        uaEntropy: 3.0,
        pathDiversity: 2.0,
        headerCount: 8,
        acceptLangRate: 0.5,
        methodVariety: 2.0,
        sizeVariance: 1.0
      };
      
      predictor.predict('1.2.3.4', features);
      predictor.learn('1.2.3.4', true);
      
      const stats = predictor.getStats();
      
      expect(stats).toHaveProperty('totalPredictions');
      expect(stats).toHaveProperty('totalLearned');
      expect(stats).toHaveProperty('avgConfidence');
      expect(stats.totalPredictions).toBeGreaterThan(0);
      expect(stats.totalLearned).toBeGreaterThan(0);
    });
  });
  
  describe('full backpropagation', () => {
    test('updates all layers (W1, b1, W2, b2)', () => {
      const features = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      // Get initial weights (copy)
      const initialW1 = JSON.stringify(predictor.W1);
      const initialb1 = JSON.stringify(predictor.b1);
      
      // Train
      predictor.predict('1.2.3.4', features);
      predictor.learn('1.2.3.4', true);
      
      // Weights should have changed
      const finalW1 = JSON.stringify(predictor.W1);
      const finalb1 = JSON.stringify(predictor.b1);
      
      expect(finalW1).not.toBe(initialW1);
      expect(finalb1).not.toBe(initialb1);
    });
  });
});

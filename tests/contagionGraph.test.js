const BehavioralContagionGraph = require('../src/contagionGraph');

describe('BehavioralContagionGraph', () => {
  let graph;
  
  beforeEach(() => {
    graph = new BehavioralContagionGraph();
  });
  
  describe('update()', () => {
    test('adds new IP to graph', () => {
      const behavior = {
        timingCV: 0.1,
        uaEntropy: 2.0,
        pathDiversity: 1.5,
        headerCount: 5,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.5
      };
      
      graph.update('1.2.3.4', behavior);
      
      const stats = graph.getGraphStats();
      expect(stats.totalNodes).toBe(1);
    });
    
    test('creates edges between similar IPs', () => {
      const botBehavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      // Add two similar bots
      graph.update('1.2.3.4', botBehavior);
      graph.update('1.2.3.5', { ...botBehavior, timingCV: 0.12 });
      
      const stats = graph.getGraphStats();
      expect(stats.totalNodes).toBe(2);
      expect(stats.totalEdges).toBeGreaterThan(0);
    });
    
    test('does not create edges between dissimilar IPs', () => {
      const botBehavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      const humanBehavior = {
        timingCV: 0.8,
        uaEntropy: 6.0,
        pathDiversity: 4.5,
        headerCount: 12,
        acceptLangRate: 1.0,
        methodVariety: 3.0,
        sizeVariance: 2.5
      };
      
      graph.update('1.2.3.4', botBehavior);
      graph.update('5.6.7.8', humanBehavior);
      
      const stats = graph.getGraphStats();
      expect(stats.totalNodes).toBe(2);
      expect(stats.totalEdges).toBe(0);
    });
  });
  
  describe('confirmBot()', () => {
    test('marks IP as confirmed bot', () => {
      const behavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      graph.update('1.2.3.4', behavior);
      graph.confirmBot('1.2.3.4');
      
      const stats = graph.getGraphStats();
      expect(stats.confirmedBots).toBe(1);
    });
    
    test('spreads suspicion to neighbors', () => {
      const botBehavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      // Create cluster of similar IPs
      graph.update('1.2.3.4', botBehavior);
      graph.update('1.2.3.5', { ...botBehavior, timingCV: 0.11 });
      graph.update('1.2.3.6', { ...botBehavior, timingCV: 0.12 });
      
      // Confirm one as bot
      graph.confirmBot('1.2.3.4');
      
      // Check if suspicion spread
      const clusters = graph.getClusters();
      expect(clusters.length).toBeGreaterThan(0);
    });
  });
  
  describe('getSuspicionScore()', () => {
    test('returns 0 for unknown IP', () => {
      const score = graph.getSuspicionScore('1.2.3.4');
      expect(score).toBe(0);
    });
    
    test('returns higher score for IPs near confirmed bots', () => {
      const botBehavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      graph.update('1.2.3.4', botBehavior);
      graph.update('1.2.3.5', { ...botBehavior, timingCV: 0.11 });
      
      graph.confirmBot('1.2.3.4');
      
      const score = graph.getSuspicionScore('1.2.3.5');
      expect(score).toBeGreaterThan(0);
    });
  });
  
  describe('getClusters()', () => {
    test('identifies behavioral clusters', () => {
      const botBehavior = {
        timingCV: 0.1,
        uaEntropy: 1.0,
        pathDiversity: 0.5,
        headerCount: 3,
        acceptLangRate: 0.0,
        methodVariety: 1.0,
        sizeVariance: 0.2
      };
      
      // Create cluster
      for (let i = 0; i < 5; i++) {
        graph.update(`1.2.3.${i}`, { ...botBehavior, timingCV: 0.1 + i * 0.01 });
      }
      
      const clusters = graph.getClusters();
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].size).toBeGreaterThanOrEqual(3);
    });
  });
  
  describe('LSH optimization', () => {
    test('handles large graphs efficiently', () => {
      const behavior = {
        timingCV: 0.5,
        uaEntropy: 3.0,
        pathDiversity: 2.0,
        headerCount: 8,
        acceptLangRate: 0.5,
        methodVariety: 2.0,
        sizeVariance: 1.0
      };
      
      const startTime = Date.now();
      
      // Add 200 IPs (should use LSH after 100)
      for (let i = 0; i < 200; i++) {
        graph.update(`1.2.${Math.floor(i / 256)}.${i % 256}`, {
          ...behavior,
          timingCV: 0.5 + Math.random() * 0.1
        });
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete in reasonable time even with 200 nodes
      expect(duration).toBeLessThan(5000);
      
      const stats = graph.getGraphStats();
      expect(stats.totalNodes).toBe(200);
    });
  });
});

const fs = require('fs').promises;
const path = require('path');
const mathPool = require('./workers/pool');

class NeuralBehaviorPredictor {
  constructor({ inputDim = 7, hiddenDim = 24, learningRate = 0.01, modelPath = null } = {}) {
    this.inputDim = inputDim;
    this.hiddenDim = hiddenDim;
    this.learningRate = learningRate;
    this.modelPath = modelPath || path.join(process.cwd(), 'data', 'neural-model.json');
    
    // Initialize weights randomly (will be overwritten if model is loaded)
    this.W1 = this._randomMatrix(inputDim, hiddenDim);
    this.b1 = this._randomVector(hiddenDim);
    this.W2 = this._randomMatrix(hiddenDim, 1);
    this.b2 = [Math.random() - 0.5];
    
    this.predictions = new Map();
    this.stats = {
      predictions: 0,
      correct: 0,
      accuracy: 0,
      totalPredictions: 0,
      totalLearned: 0,
      totalConfidence: 0,
      avgConfidence: 0,
    };

    this.learnedBotCount = 0;
    this.learnedHumanCount = 0;
    this.meanBot = new Array(this.inputDim).fill(0);
    this.meanHuman = new Array(this.inputDim).fill(0);
    
    // Attempt to load saved model
    this._loadModel().catch(() => {
      // Silently fail - will use random initialization
    });
  }
  
  /**
   * Save model weights to disk
   */
  async saveModel() {
    try {
      const modelData = {
        W1: this.W1,
        b1: this.b1,
        W2: this.W2,
        b2: this.b2,
        stats: this.stats,
        learnedBotCount: this.learnedBotCount,
        learnedHumanCount: this.learnedHumanCount,
        meanBot: this.meanBot,
        meanHuman: this.meanHuman,
        savedAt: Date.now()
      };
      
      // Ensure data directory exists
      const dir = path.dirname(this.modelPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.modelPath, JSON.stringify(modelData), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to save neural model:', err.message);
      return false;
    }
  }
  
  /**
   * Load model weights from disk
   */
  async _loadModel() {
    try {
      const data = await fs.readFile(this.modelPath, 'utf8');
      const model = JSON.parse(data);
      
      // Validate dimensions match
      if (model.W1?.length === this.inputDim && model.W1[0]?.length === this.hiddenDim) {
        this.W1 = model.W1;
        this.b1 = model.b1;
        this.W2 = model.W2;
        this.b2 = model.b2;
        
        // Restore training stats
        if (model.stats) this.stats = { ...this.stats, ...model.stats };
        if (model.learnedBotCount) this.learnedBotCount = model.learnedBotCount;
        if (model.learnedHumanCount) this.learnedHumanCount = model.learnedHumanCount;
        if (model.meanBot) this.meanBot = model.meanBot;
        if (model.meanHuman) this.meanHuman = model.meanHuman;
        
        console.log(`Neural model loaded from ${this.modelPath} (trained on ${model.stats?.totalLearned || 0} samples)`);
        return true;
      }
    } catch (err) {
      // No saved model exists - using random initialization
    }
    return false;
  }

  async predict(ip, features) {
    const x = this._normalizeFeatures(features);
    
    // Offload heavy feedforward matrix operations to background thread
    const { a2 } = await mathPool.exec('neuralForward', {
      input: x,
      W1: this.W1,
      b1: this.b1,
      W2: this.W2,
      b2: this.b2
    });

    let output = a2[0];

    // Distance-based clustering booster
    if (this.learnedBotCount > 0 && this.learnedHumanCount > 0) {
      const dist = (vector, center) => Math.sqrt(vector.reduce((sum, v, i) => sum + Math.pow(v - center[i], 2), 0));
      const dBot = dist(x, this.meanBot);
      const dHuman = dist(x, this.meanHuman);
      const centroidProb = 1 / (1 + Math.exp(dBot - dHuman));
      output = 0.5 * output + 0.5 * centroidProb; // Weighted ensemble voting
    }

    const confidence = Math.abs(output - 0.5) * 2;
    this.predictions.set(ip, { score: output, features: x, ts: Date.now() });
    this.stats.predictions++;
    this.stats.totalPredictions++;
    this.stats.totalConfidence += confidence;
    this.stats.avgConfidence = this.stats.totalConfidence / this.stats.totalPredictions;

    return {
      botProbability: output,
      confidence,
      verdict: output > 0.5 ? 'bot' : 'human',
    };
  }

  async learn(ip, isBot) {
    const pred = this.predictions.get(ip);
    if (!pred) return;
    
    const target = isBot ? 1 : 0;
    const x = pred.features;
    
    // Pass 1: We must re-run a forward pass to get intermediate cache values for true backprop
    const { a1, a2 } = await mathPool.exec('neuralForward', {
      input: x,
      W1: this.W1,
      b1: this.b1,
      W2: this.W2,
      b2: this.b2
    });

    // Pass 2: Calculate gradients entirely in background thread to unblock Node loop
    const deltas = await mathPool.exec('neuralBackward', {
      input: x,
      a1, a2,
      W2: this.W2,
      target,
      learningRate: this.learningRate,
      W1: this.W1,
      b1: this.b1,
      b2: this.b2
    });
    
    // Apply thread-calculated gradients (Gradient Descent Step)
    for (let i = 0; i < this.inputDim; i++) {
      for (let j = 0; j < this.hiddenDim; j++) {
        this.W1[i][j] += deltas.updateW1[i][j];
      }
    }
    for (let i = 0; i < this.hiddenDim; i++) {
        this.b1[i] += deltas.updateb1[i];
    }
    for (let i = 0; i < this.hiddenDim; i++) {
      this.W2[i][0] += deltas.updateW2[i][0];
    }
    this.b2[0] += deltas.updateb2[0];
    
    // Track stats normally
    this.stats.totalLearned++;
    if ((a2[0] > 0.5 && isBot) || (a2[0] <= 0.5 && !isBot)) {
      this.stats.correct++;
    }
    this.stats.accuracy = this.stats.correct / (this.stats.totalLearned || 1);

    if (isBot) {
      this.learnedBotCount++;
      for (let i = 0; i < x.length; i++) {
        this.meanBot[i] = ((this.meanBot[i] * (this.learnedBotCount - 1)) + x[i]) / this.learnedBotCount;
      }
    } else {
      this.learnedHumanCount++;
      for (let i = 0; i < x.length; i++) {
        this.meanHuman[i] = ((this.meanHuman[i] * (this.learnedHumanCount - 1)) + x[i]) / this.learnedHumanCount;
      }
    }
  }

  _normalizeFeatures(features) {
    return Object.values(features).map(v => Math.min(1, Math.max(0, v)));
  }

  _randomMatrix(rows, cols) {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.1)
    );
  }

  _randomVector(size) {
    return Array.from({ length: size }, () => (Math.random() - 0.5) * 0.1);
  }

  getStats() {
    return this.stats;
  }
  
  /**
   * Graceful shutdown - saves model before exit
   */
  async shutdown() {
    return this.saveModel();
  }
}

module.exports = NeuralBehaviorPredictor;

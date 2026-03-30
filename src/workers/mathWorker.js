/**
 * SENTINEL — Math Worker Thread (Hardened)
 */

const { parentPort } = require('worker_threads');

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
function relu(z) { return Math.max(0, z); }

const Tasks = {
  neuralForward: ({ input, W1, b1, W2, b2 }) => {
    const hiddenDim = b1.length;
    const inputDim = input.length;
    const a1 = [];
    for (let j = 0; j < hiddenDim; j++) {
      let sum = b1[j];
      for (let i = 0; i < inputDim; i++) {
        sum += input[i] * W1[i][j];
      }
      a1.push(relu(sum));
    }
    const a2 = [];
    for (let k = 0; k < b2.length; k++) {
      let sum = b2[k];
      for (let j = 0; j < hiddenDim; j++) {
        sum += a1[j] * W2[j][k];
      }
      a2.push(sigmoid(sum));
    }
    return { a1, a2 };
  },

  neuralBackward: ({ input, a1, a2, W2, target, learningRate, W1, b1, b2 }) => {
    const outputDim = b2.length;
    const hiddenDim = b1.length;
    const inputDim = input.length;
    const dz2 = [a2[0] - target];
    const updateW2 = Array.from({ length: hiddenDim }, () => []);
    const updateb2 = [-learningRate * dz2[0]];
    for (let j = 0; j < hiddenDim; j++) {
      updateW2[j].push(-learningRate * (a1[j] * dz2[0]));
    }
    const dz1 = [];
    for (let j = 0; j < hiddenDim; j++) {
      let sum = dz2[0] * W2[j][0];
      dz1.push(a1[j] > 0 ? sum : 0);
    }
    const updateW1 = Array.from({ length: inputDim }, () => Array(hiddenDim).fill(0));
    const updateb1 = Array(hiddenDim).fill(0);
    for (let i = 0; i < inputDim; i++) {
      for (let j = 0; j < hiddenDim; j++) {
        updateW1[i][j] = -learningRate * (input[i] * dz1[j]);
      }
    }
    for (let j = 0; j < hiddenDim; j++) {
      updateb1[j] = -learningRate * dz1[j];
    }
    return { updateW1, updateb1, updateW2, updateb2 };
  },

  cosineSimilarity: ({ vecA, vecB }) => {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        nA += vecA[i] * vecA[i];
        nB += vecB[i] * vecB[i];
    }
    return nA === 0 || nB === 0 ? 0 : dot / (Math.sqrt(nA) * Math.sqrt(nB));
  },

  fftAmplitude: ({ realIn, imagIn }) => {
    const n = realIn.length;
    const realOut = new Array(n).fill(0);
    const imagOut = new Array(n).fill(0);
    for (let k = 0; k < n; k++) {
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * t * k) / n;
        realOut[k] += realIn[t] * Math.cos(angle) - imagIn[t] * Math.sin(angle);
        imagOut[k] -= realIn[t] * Math.sin(angle) + imagIn[t] * Math.cos(angle);
      }
    }
    const amplitudes = [];
    for (let i = 0; i < Math.floor(n / 2); i++) {
      amplitudes.push(Math.sqrt(realOut[i]**2 + imagOut[i]**2));
    }
    return amplitudes;
  }
};

if (parentPort) {
  parentPort.on('message', (msg) => {
    const { id, task, payload } = msg;
    try {
      if (!Tasks[task]) throw new Error(`Unknown task ${task}`);
      const result = Tasks[task](payload);
      parentPort.postMessage({ id, result });
    } catch (err) {
      parentPort.postMessage({ id, error: err.message });
    }
  });
}

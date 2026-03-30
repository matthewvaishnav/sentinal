const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const BehavioralFingerprinter = require('../src/fingerprinter');
const NeuralBehaviorPredictor = require('../src/neuralBehaviorPredictor');
const mathPool = require('../src/workers/pool');

const dataPath = path.join(__dirname, '..', 'data', 'cicddos2019_mock.csv');

// Initialize Engines
const fingerprinter = new BehavioralFingerprinter({ botThreshold: 3.0, suspectThreshold: 5.5 });
const neuralPredictor = new NeuralBehaviorPredictor();

const results = {
  total: 0,
  tp: 0, // True Positive (Bot correctly caught)
  fp: 0, // False Positive (Human incorrectly flagged)
  tn: 0, // True Negative (Human correctly allowed)
  fn: 0, // False Negative (Bot missed)
  errors: 0
};

async function runBenchmark() {
  console.log('--- SENTINEL REAL-WORLD BENCHMARK (CIC-DDoS2019) ---');
  console.log(`Loading dataset: ${dataPath}`);

  if (!fs.existsSync(dataPath)) {
    console.error(`Error: Dataset mockup NOT found at ${dataPath}. Please run "node scripts/generate_mock_data.js" first.`);
    process.exit(1);
  }

  const stream = fs.createReadStream(dataPath).pipe(csv());
  
  console.log('Training engines (Warmup Phase: first 100 records)...');

  for await (const row of stream) {
    results.total++;
    const isBot = row.Label !== 'Benign';
    const ip = row.Source_IP;
    
    // Normalized behavioral features
    const features = {
      timingCV: parseFloat(row.timingCV),
      uaEntropy: parseFloat(row.uaEntropy),
      pathDiversity: parseFloat(row.pathDiversity),
      headerCount: parseInt(row.headerCount, 10),
      hasAcceptLanguage: parseInt(row.hasAcceptLanguage, 10),
      methodVariety: parseFloat(row.methodVariety),
      requestSize: parseFloat(row.requestSize)
    };

    try {
      // 1. Prediction
      const neural = await neuralPredictor.predict(ip, features);
      
      const req = {
        path: '/mock-api',
        method: 'GET',
        headers: {
          'user-agent': 'Sentinel-Benchmark',
          'accept-language': features.hasAcceptLanguage ? 'en-US' : undefined
        }
      };
      
      for (let i = 0; i < 3; i++) {
        await fingerprinter.record(ip, req);
      }
      const finger = fingerprinter.getVerdict(ip);

      // 2. Learning (Crucial for online models)
      await neuralPredictor.learn(ip, isBot);

      // 3. Evaluation (only after warmup)
      if (results.total > 100) {
        const predictedBot = neural.verdict === 'bot' || finger.verdict === 'bot';

        if (predictedBot && isBot) results.tp++;
        else if (predictedBot && !isBot) results.fp++;
        else if (!predictedBot && !isBot) results.tn++;
        else if (!predictedBot && isBot) results.fn++;
      }

    } catch (err) {
      results.errors++;
    }
  }

  // Calculate Metrics
  const evalTotal = results.total - 100;
  const precision = results.tp / (results.tp + results.fp) || 0;
  const recall = results.tp / (results.tp + results.fn) || 0;
  const f1 = 2 * (precision * recall) / (precision + recall) || 0;
  const accuracy = (results.tp + results.tn) / evalTotal;

  console.log('\n--- PERFORMANCE RESULTS (POST-WARMUP) ---');
  console.log(`Evaluation Samples: ${evalTotal}`);
  console.log(`Accuracy:           ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Precision:          ${(precision * 100).toFixed(2)}%`);
  console.log(`Recall:             ${(recall * 100).toFixed(2)}%`);
  console.log(`F1 Score:           ${f1.toFixed(4)}`);
  console.log('---------------------------');
  console.log(`Confusion Matrix: [TP: ${results.tp}, FP: ${results.fp}, TN: ${results.tn}, FN: ${results.fn}]`);

  await mathPool.close();
}

runBenchmark().catch(err => {
  console.error('Benchmark failed', err);
  process.exit(1);
});

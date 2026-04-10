/**
 * Example Usage of FeatureExtractor
 * 
 * Demonstrates how to extract behavioral features from raw network traces
 */

const FeatureExtractor = require('./featureExtractor');

// Create an instance of the feature extractor
const extractor = new FeatureExtractor();

// Example 1: Bot-like traffic pattern
console.log('=== Example 1: Bot-like Traffic ===\n');

const botTrace = {
  requests: [
    {
      timestamp: 1000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    },
    {
      timestamp: 2000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    },
    {
      timestamp: 3000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    },
    {
      timestamp: 4000,
      path: '/api/data',
      method: 'GET',
      headers: {
        'user-agent': 'Bot/1.0',
        'host': 'example.com'
      }
    }
  ]
};

const botFeatures = extractor.extract(botTrace);
console.log('Bot Features:');
console.log(JSON.stringify(botFeatures, null, 2));
console.log('\nBot Characteristics:');
console.log(`- Low timing CV (${botFeatures.timingCV.toFixed(3)}): Regular intervals`);
console.log(`- Low path diversity (${botFeatures.pathDiversity.toFixed(3)}): Same endpoint`);
console.log(`- No Accept-Language: ${!botFeatures.hasAcceptLanguage}`);
console.log(`- Low method variety (${botFeatures.methodVariety.toFixed(3)}): Single method`);
console.log(`- Low UA entropy (${botFeatures.uaEntropy.toFixed(3)}): Simple user agent`);
console.log(`- High request rate (${botFeatures.requestRate.toFixed(2)} req/s)`);

// Example 2: Human-like traffic pattern
console.log('\n\n=== Example 2: Human-like Traffic ===\n');

const humanTrace = {
  requests: [
    {
      timestamp: 1000,
      path: '/home',
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://google.com',
        'accept': 'text/html,application/xhtml+xml',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'max-age=0',
        'content-length': '0'
      }
    },
    {
      timestamp: 3500,
      path: '/about',
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://example.com/home',
        'accept': 'text/html,application/xhtml+xml',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'max-age=0',
        'content-length': '0'
      }
    },
    {
      timestamp: 8200,
      path: '/products',
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://example.com/about',
        'accept': 'text/html,application/xhtml+xml',
        'accept-encoding': 'gzip, deflate, br',
        'cache-control': 'max-age=0',
        'content-length': '0'
      }
    },
    {
      timestamp: 12000,
      path: '/contact',
      method: 'POST',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://example.com/products',
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br',
        'content-type': 'application/json',
        'content-length': '256'
      }
    }
  ]
};

const humanFeatures = extractor.extract(humanTrace);
console.log('Human Features:');
console.log(JSON.stringify(humanFeatures, null, 2));
console.log('\nHuman Characteristics:');
console.log(`- High timing CV (${humanFeatures.timingCV.toFixed(3)}): Irregular intervals`);
console.log(`- High path diversity (${humanFeatures.pathDiversity.toFixed(3)}): Varied pages`);
console.log(`- Has Accept-Language: ${humanFeatures.hasAcceptLanguage}`);
console.log(`- Higher method variety (${humanFeatures.methodVariety.toFixed(3)}): Mixed methods`);
console.log(`- High UA entropy (${humanFeatures.uaEntropy.toFixed(3)}): Complex user agent`);
console.log(`- Has Referer: ${humanFeatures.hasReferer}`);
console.log(`- Lower request rate (${humanFeatures.requestRate.toFixed(2)} req/s)`);

// Example 3: Batch processing multiple traces
console.log('\n\n=== Example 3: Batch Processing ===\n');

const traces = [botTrace, humanTrace];
const batchFeatures = extractor.extractBatch(traces);

console.log(`Processed ${batchFeatures.length} traces`);
console.log('\nComparison:');
console.log('Feature              | Bot      | Human');
console.log('---------------------|----------|----------');
console.log(`Timing CV            | ${batchFeatures[0].timingCV.toFixed(3).padEnd(8)} | ${batchFeatures[1].timingCV.toFixed(3)}`);
console.log(`Path Diversity       | ${batchFeatures[0].pathDiversity.toFixed(3).padEnd(8)} | ${batchFeatures[1].pathDiversity.toFixed(3)}`);
console.log(`Request Count        | ${batchFeatures[0].requestCount.toString().padEnd(8)} | ${batchFeatures[1].requestCount}`);
console.log(`Header Count         | ${batchFeatures[0].headerCount.toFixed(1).padEnd(8)} | ${batchFeatures[1].headerCount.toFixed(1)}`);
console.log(`Has Accept-Language  | ${batchFeatures[0].hasAcceptLanguage.toString().padEnd(8)} | ${batchFeatures[1].hasAcceptLanguage}`);
console.log(`Method Variety       | ${batchFeatures[0].methodVariety.toFixed(3).padEnd(8)} | ${batchFeatures[1].methodVariety.toFixed(3)}`);
console.log(`UA Entropy           | ${batchFeatures[0].uaEntropy.toFixed(3).padEnd(8)} | ${batchFeatures[1].uaEntropy.toFixed(3)}`);
console.log(`Avg Request Size     | ${batchFeatures[0].avgRequestSize.toFixed(1).padEnd(8)} | ${batchFeatures[1].avgRequestSize.toFixed(1)}`);
console.log(`Has Referer          | ${batchFeatures[0].hasReferer.toString().padEnd(8)} | ${batchFeatures[1].hasReferer}`);
console.log(`Session Duration (ms)| ${batchFeatures[0].sessionDuration.toString().padEnd(8)} | ${batchFeatures[1].sessionDuration}`);
console.log(`Request Rate (req/s) | ${batchFeatures[0].requestRate.toFixed(2).padEnd(8)} | ${batchFeatures[1].requestRate.toFixed(2)}`);
console.log(`Unique Path Ratio    | ${batchFeatures[0].uniquePathRatio.toFixed(3).padEnd(8)} | ${batchFeatures[1].uniquePathRatio.toFixed(3)}`);

console.log('\n=== Feature Extraction Complete ===\n');

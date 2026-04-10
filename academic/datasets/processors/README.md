# Dataset Processors

This module contains processors for extracting and normalizing behavioral features from raw network traces. It includes:

1. **FeatureExtractor** - Extracts behavioral features from raw network traces
2. **DatasetNormalizer** - Normalizes features to [0, 1] range for cross-dataset comparability

## Feature Extractor

The `FeatureExtractor` class extracts behavioral features from raw network traces to match SENTINEL's fingerprinting logic. It converts raw request data into the 12 behavioral features used for bot detection.

## Features Extracted

The `FeatureExtractor` class extracts the following 12 behavioral features:

1. **timingCV** - Coefficient of variation of inter-request times
   - Measures timing regularity
   - Bots: Low CV (regular, metronomic intervals)
   - Humans: High CV (irregular, varied intervals)

2. **pathDiversity** - Unique paths / total requests
   - Measures endpoint variety
   - Bots: Low diversity (hammer same endpoint)
   - Humans: High diversity (browse different pages)

3. **requestCount** - Total number of requests
   - Simple count of requests in the trace

4. **headerCount** - Average number of headers per request
   - Bots: Fewer headers
   - Humans: More headers (browsers send many)

5. **hasAcceptLanguage** - Boolean presence of Accept-Language header
   - Bots: Usually absent
   - Humans: Almost always present (browsers send it)

6. **methodVariety** - Variety of HTTP methods used
   - Measured as Shannon entropy of method distribution
   - Bots: Low variety (usually just GET)
   - Humans: Higher variety (GET, POST, PUT, etc.)

7. **uaEntropy** - Shannon entropy of User-Agent string
   - Measures User-Agent complexity
   - Bots: Low entropy (short, simple strings)
   - Humans: High entropy (complex browser strings)

8. **avgRequestSize** - Average request size in bytes
   - Calculated from Content-Length header or size field

9. **hasReferer** - Boolean presence of Referer header
   - Bots: Usually absent
   - Humans: Often present (navigation between pages)

10. **sessionDuration** - Total time span of requests (milliseconds)
    - Time between first and last request

11. **requestRate** - Requests per second
    - Bots: Often higher rates
    - Humans: Lower, more varied rates

12. **uniquePathRatio** - Same as pathDiversity (for compatibility)
    - Included for compatibility with dataset loaders

## Usage

### Basic Usage

```javascript
const FeatureExtractor = require('./featureExtractor');

const extractor = new FeatureExtractor();

const trace = {
  requests: [
    {
      timestamp: 1000,
      path: '/home',
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://example.com',
        'content-length': '500'
      }
    },
    // ... more requests
  ]
};

const features = extractor.extract(trace);
console.log(features);
```

### Batch Processing

```javascript
const traces = [trace1, trace2, trace3];
const features = extractor.extractBatch(traces);
```

## Input Format

The `extract()` method expects a trace object with the following structure:

```javascript
{
  requests: [
    {
      timestamp: number,      // Unix timestamp in milliseconds
      path: string,           // Request path (e.g., '/api/data')
      method: string,         // HTTP method (e.g., 'GET', 'POST')
      headers: {              // Request headers object
        'user-agent': string,
        'accept-language': string,
        'referer': string,
        'content-length': string,
        // ... other headers
      }
    },
    // ... more requests
  ],
  // Optional pre-extracted arrays (if not provided, extracted from requests)
  timestamps: [number],       // Array of timestamps
  paths: [string],            // Array of paths
  userAgents: [string]        // Array of user agents
}
```

## Output Format

The `extract()` method returns a feature object:

```javascript
{
  timingCV: number,           // 0-2+ range
  pathDiversity: number,      // 0-1 range
  requestCount: number,       // Integer count
  headerCount: number,        // Average count
  hasAcceptLanguage: boolean, // true/false
  methodVariety: number,      // 0-1 range
  uaEntropy: number,          // 0-1 range (normalized)
  avgRequestSize: number,     // Bytes
  hasReferer: boolean,        // true/false
  sessionDuration: number,    // Milliseconds
  requestRate: number,        // Requests per second
  uniquePathRatio: number     // 0-1 range (same as pathDiversity)
}
```

## Integration with Dataset Loaders

The feature extractor is designed to work with the dataset loaders in `academic/datasets/loaders/`:

```javascript
const CICDDoS2019Loader = require('../loaders/cicddos2019');
const FeatureExtractor = require('./featureExtractor');

const loader = new CICDDoS2019Loader();
const extractor = new FeatureExtractor();

// Load dataset
const dataset = await loader.load('data/cicddos2019_mock.csv');

// Extract features from raw traces (if needed)
// Note: CIC-DDoS2019 already has features, but you can re-extract
const traces = convertDatasetToTraces(dataset);
const features = extractor.extractBatch(traces);
```

## Matching SENTINEL's Fingerprinting

The feature extraction logic matches `src/fingerprinter.js`:

- **Timing CV**: Same calculation as `_timingEntropy()` in fingerprinter
- **Path Diversity**: Same calculation as `_pathDiversity()` in fingerprinter
- **UA Entropy**: Same Shannon entropy calculation as `_uaEntropy()` in fingerprinter
- **Method Variety**: Same entropy calculation as `_methodEntropy()` in fingerprinter
- **Header/Accept-Language/Referer**: Same presence checks as fingerprinter

This ensures that features extracted for academic evaluation match the features used by SENTINEL in production.

## Testing

Run the test suite:

```bash
npm test -- tests/featureExtractor.test.js
```

Run the example usage script:

```bash
node academic/datasets/processors/example-usage.js
```

## Implementation Notes

1. **Neutral Values**: When insufficient data is available (e.g., single request), neutral values are returned (typically 0.5 for normalized features)

2. **Majority Voting**: Boolean features like `hasAcceptLanguage` and `hasReferer` use majority voting (>50% of requests must have the header)

3. **Shannon Entropy**: Entropy calculations use base-2 logarithm and are normalized to 0-1 range

4. **Coefficient of Variation**: CV = stddev / mean, measures relative variability

5. **Flexible Input**: The extractor can work with pre-extracted arrays (timestamps, paths, userAgents) or extract them from request objects

## References

- SENTINEL Fingerprinter: `src/fingerprinter.js`
- Dataset Loaders: `academic/datasets/loaders/`
- Requirements: `.kiro/specs/academic-enhancements/requirements.md` (Requirements 2.3, 2.4, 2.7)
- Design: `.kiro/specs/academic-enhancements/design.md`

---

## Dataset Normalizer

The `DatasetNormalizer` class normalizes behavioral features to [0, 1] range using min-max normalization. This ensures features are comparable across different datasets (CIC-DDoS2019, CAIDA, UNSW-NB15) where feature scales may differ.

### Why Normalization?

Different datasets may have different scales for the same features:
- CIC-DDoS2019 might have request rates from 1-100 req/s
- CAIDA might have request rates from 10-1000 req/s
- UNSW-NB15 might have request rates from 0.1-50 req/s

Without normalization, these scale differences would bias machine learning models and make cross-dataset comparisons invalid.

### Normalization Method

**Min-Max Normalization** to [0, 1] range:

```
normalized_value = (value - min) / (max - min)
```

Where:
- `min` = minimum value of the feature across all samples
- `max` = maximum value of the feature across all samples

### Statistics Calculated

For each numeric feature, the normalizer calculates and stores:
- **min**: Minimum value
- **max**: Maximum value
- **mean**: Average value
- **stddev**: Standard deviation
- **count**: Number of samples

These statistics are essential for:
1. Reproducibility (can denormalize back to original values)
2. Understanding feature distributions
3. Detecting outliers or data quality issues

### Usage

#### Basic Normalization

```javascript
const DatasetNormalizer = require('./normalizer');

const normalizer = new DatasetNormalizer();

const dataset = {
  samples: [
    { 
      ip: '192.168.1.1',
      label: 'bot',
      features: { 
        timingCV: 0.1, 
        requestCount: 100,
        hasAcceptLanguage: false 
      } 
    },
    { 
      ip: '192.168.1.2',
      label: 'human',
      features: { 
        timingCV: 0.9, 
        requestCount: 50,
        hasAcceptLanguage: true 
      } 
    }
  ]
};

const normalized = normalizer.normalize(dataset);

console.log(normalized.samples[0].features);
// { timingCV: 0, requestCount: 1, hasAcceptLanguage: false }

console.log(normalized.normalizationStats);
// { timingCV: { min: 0.1, max: 0.9, mean: 0.5, stddev: 0.4, count: 2 }, ... }
```

#### Multi-Dataset Normalization

For academic evaluation, you often need to normalize multiple datasets using **shared statistics** to ensure fair comparison:

```javascript
const dataset1 = { /* CIC-DDoS2019 samples */ };
const dataset2 = { /* CAIDA samples */ };
const dataset3 = { /* UNSW-NB15 samples */ };

// Normalize all datasets using global min/max across all datasets
const normalizedDatasets = normalizer.normalizeBatch([dataset1, dataset2, dataset3]);

// All datasets now use the same normalization statistics
// This ensures features are comparable across datasets
```

#### Denormalization

Recover original values from normalized features:

```javascript
const denormalized = normalizer.denormalize(
  normalizedFeatures,
  normalizationStats
);

// Original values are recovered
```

#### Summary Statistics

Get comprehensive statistics for a dataset:

```javascript
const summary = normalizer.getSummaryStats(dataset);

console.log(summary);
// {
//   totalSamples: 100,
//   features: {
//     timingCV: { min: 0.05, max: 0.95, mean: 0.5, stddev: 0.25, range: 0.9 },
//     requestCount: { min: 10, max: 1000, mean: 200, stddev: 150, range: 990 },
//     ...
//   }
// }
```

### Input Format

The `normalize()` method expects a dataset object:

```javascript
{
  samples: [
    {
      ip: string,           // IP address (optional)
      label: string,        // 'bot' or 'human' (optional)
      features: {
        timingCV: number,
        pathDiversity: number,
        requestCount: number,
        headerCount: number,
        hasAcceptLanguage: boolean,  // Boolean features are NOT normalized
        methodVariety: number,
        uaEntropy: number,
        avgRequestSize: number,
        hasReferer: boolean,         // Boolean features are NOT normalized
        sessionDuration: number,
        requestRate: number,
        uniquePathRatio: number
      }
    },
    // ... more samples
  ]
}
```

### Output Format

The `normalize()` method returns:

```javascript
{
  samples: [
    {
      ip: string,
      label: string,
      features: {
        // All numeric features normalized to [0, 1]
        timingCV: number,           // 0-1 range
        pathDiversity: number,      // 0-1 range
        requestCount: number,       // 0-1 range
        // ... other numeric features normalized
        
        // Boolean features remain unchanged
        hasAcceptLanguage: boolean,
        hasReferer: boolean
      }
    },
    // ... more samples
  ],
  normalizationStats: {
    timingCV: { min, max, mean, stddev, count },
    pathDiversity: { min, max, mean, stddev, count },
    // ... stats for all numeric features
  }
}
```

### Edge Cases

1. **Constant Features** (min === max): Normalized to 0.5 (middle of range)
2. **Boolean Features**: Left unchanged (not normalized)
3. **Missing Features**: Skipped (no normalization applied)

### Integration with Feature Extractor

Complete pipeline from raw traces to normalized features:

```javascript
const FeatureExtractor = require('./featureExtractor');
const DatasetNormalizer = require('./normalizer');

const extractor = new FeatureExtractor();
const normalizer = new DatasetNormalizer();

// Step 1: Extract features from raw traces
const rawTraces = [trace1, trace2, trace3];
const extractedFeatures = extractor.extractBatch(rawTraces);

// Step 2: Create dataset
const dataset = {
  samples: extractedFeatures.map((features, idx) => ({
    ip: `192.168.1.${idx}`,
    label: labels[idx],
    features
  }))
};

// Step 3: Normalize features
const normalized = normalizer.normalize(dataset);

// Ready for evaluation or machine learning!
```

### Testing

Run the test suite:

```bash
npm test -- tests/normalizer.test.js
```

Run the example usage script:

```bash
node academic/datasets/processors/normalizer-example.js
```

### Implementation Notes

1. **Min-Max Normalization**: Simple, interpretable, preserves relationships
2. **Statistics Storage**: All statistics stored for reproducibility
3. **Batch Normalization**: Use `normalizeBatch()` for multi-dataset evaluation
4. **Denormalization**: Can recover original values exactly
5. **Boolean Preservation**: Boolean features (hasAcceptLanguage, hasReferer) are not normalized

### Academic Use Cases

1. **Multi-Dataset Evaluation**: Normalize CIC-DDoS2019, CAIDA, UNSW-NB15 together
2. **Train/Test Splits**: Use `normalizeBatch()` to ensure consistent normalization
3. **Baseline Comparisons**: Ensure all methods use the same normalized features
4. **Ablation Studies**: Normalized features enable fair component comparisons
5. **Statistical Testing**: Normalized features improve statistical test validity

### References

- Requirements: `.kiro/specs/academic-enhancements/requirements.md` (Requirements 2.4, 2.7)
- Design: `.kiro/specs/academic-enhancements/design.md` (Dataset Normalization section)
- Feature Extractor: `academic/datasets/processors/featureExtractor.js`
- Dataset Loaders: `academic/datasets/loaders/`

# Dataset Loaders

This directory contains dataset loaders that implement a standardized interface for loading and parsing various DDoS detection datasets.

## Available Loaders

### CIC-DDoS2019 Loader

The `cicddos2019.js` loader handles the CIC-DDoS2019 dataset format.

**Features:**
- CSV parsing with error handling
- Label mapping (Benign → human, DoS/DDoS → bot)
- In-memory and disk caching
- Standardized output format
- Comprehensive metadata extraction

**Usage:**

```javascript
const CICDDoS2019Loader = require('./cicddos2019');
const path = require('path');

const loader = new CICDDoS2019Loader();
const datasetPath = path.join(__dirname, '../../../data/cicddos2019_mock.csv');

// Load dataset
const dataset = await loader.load(datasetPath);

// Get metadata
const metadata = loader.getMetadata(dataset);

console.log(`Loaded ${metadata.totalSamples} samples`);
console.log(`Bot: ${metadata.botSamples}, Human: ${metadata.humanSamples}`);

// Access samples
dataset.samples.forEach(sample => {
  console.log(`IP: ${sample.ip}, Label: ${sample.label}`);
  console.log(`Features:`, sample.features);
});
```

**CSV Format:**

```csv
Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label
192.168.1.1,0.6570,0.6355,0.8863,16,1,0.5358,0.6923,Benign
192.168.1.2,1.6000,0.2239,0.4944,12,0,0.2402,0.2207,DoS
```

### CAIDA DDoS Loader

The `caida.js` loader handles the CAIDA DDoS Attack 2007 dataset format.

**Features:**
- Packet-level data parsing
- Behavioral feature extraction from packet characteristics
- Label mapping (Normal → human, Attack → bot)
- In-memory and disk caching
- Standardized output format

**Usage:**

```javascript
const CAIDALoader = require('./caida');
const path = require('path');

const loader = new CAIDALoader();
const datasetPath = path.join(__dirname, '../../../data/caida_mock.csv');

// Load dataset
const dataset = await loader.load(datasetPath);

// Get metadata
const metadata = loader.getMetadata(dataset);

console.log(`Loaded ${metadata.totalSamples} samples from CAIDA dataset`);
console.log(`Bot: ${metadata.botSamples}, Human: ${metadata.humanSamples}`);
```

**CSV Format:**

```csv
timestamp,src_ip,dst_ip,protocol,packet_size,flags,inter_arrival_time,Label
1175568000,192.168.1.1,10.0.0.1,TCP,1200,SYN,0.05,Normal
1175568001,192.168.1.2,10.0.0.1,UDP,64,NONE,0.001,Attack
```

**Feature Mapping:**
- `timingCV`: Estimated from inter-arrival time patterns
- `uaEntropy`: Estimated based on protocol type
- `pathDiversity`: Derived from attack category
- `headerCount`: Estimated from protocol
- `hasAcceptLanguage`: Probabilistic based on label
- `methodVariety`: Estimated from protocol
- `requestSize`: Normalized packet size

### UNSW-NB15 Loader

The `unsw.js` loader handles the UNSW-NB15 network intrusion dataset format.

**Features:**
- Network flow data parsing
- Behavioral feature extraction from flow statistics
- Label mapping (0 → human, 1 → bot)
- Attack category awareness (DoS, DDoS, Reconnaissance, etc.)
- In-memory and disk caching
- Standardized output format

**Usage:**

```javascript
const UNSWLoader = require('./unsw');
const path = require('path');

const loader = new UNSWLoader();
const datasetPath = path.join(__dirname, '../../../data/unsw_mock.csv');

// Load dataset
const dataset = await loader.load(datasetPath);

// Get metadata
const metadata = loader.getMetadata(dataset);

console.log(`Loaded ${metadata.totalSamples} samples from UNSW-NB15 dataset`);
console.log(`Bot: ${metadata.botSamples}, Human: ${metadata.humanSamples}`);
```

**CSV Format:**

```csv
srcip,sport,dstip,dsport,proto,state,dur,sbytes,dbytes,sttl,dttl,sloss,dloss,service,sload,dload,spkts,dpkts,attack_cat,label
192.168.1.1,49152,10.0.0.1,80,tcp,FIN,2.5,1500,3000,64,64,0,0,http,600,1200,10,15,Normal,0
192.168.1.2,49153,10.0.0.1,80,tcp,INT,0.1,500,100,64,64,0,0,http,5000,1000,50,10,DoS,1
```

**Feature Mapping:**
- `timingCV`: Estimated from flow duration and packet count
- `uaEntropy`: Derived from service type and attack category
- `pathDiversity`: Based on attack category patterns
- `headerCount`: Estimated from service type
- `hasAcceptLanguage`: Probabilistic based on attack category
- `methodVariety`: Derived from service and attack category
- `requestSize`: Normalized from bytes per packet ratio

## DatasetLoader Interface

All dataset loaders implement the following interface:

```javascript
class DatasetLoader {
  /**
   * Load dataset from file or URL
   * @param {string} source - Path or URL to dataset
   * @returns {Promise<ParsedDataset>}
   */
  async load(source) {}
  
  /**
   * Parse dataset into standardized format
   * @param {string|Buffer} raw - Raw dataset content
   * @param {string} source - Source identifier
   * @returns {Promise<ParsedDataset>}
   */
  async parse(raw, source) {}
  
  /**
   * Get dataset metadata
   * @param {ParsedDataset} dataset - Parsed dataset
   * @returns {DatasetMetadata}
   */
  getMetadata(dataset) {}
  
  /**
   * Clear caches
   */
  clearCache() {}
}
```

## Standardized Dataset Format

All loaders produce datasets in this format:

```javascript
{
  name: string,              // Dataset name (e.g., "CIC-DDoS2019")
  samples: Array<{
    ip: string,              // Source IP address
    timestamp: number,       // Unix timestamp (milliseconds)
    features: {
      timingCV: number,      // Timing coefficient of variation
      uaEntropy: number,     // User-Agent entropy
      pathDiversity: number, // Path diversity ratio
      headerCount: number,   // Number of headers
      hasAcceptLanguage: boolean,
      methodVariety: number, // HTTP method variety
      requestSize: number    // Average request size
    },
    label: 'bot' | 'human'   // Classification label
  }>,
  metadata: {
    totalSamples: number,    // Total number of samples
    botSamples: number,      // Number of bot samples
    humanSamples: number,    // Number of human samples
    features: string[],      // List of feature names
    source: string           // Source file/URL
  }
}
```

## Caching

Loaders support two levels of caching:

1. **In-Memory Cache**: Fast access for repeated loads within the same process
2. **Disk Cache**: Persistent cache in `academic/datasets/cache/` directory

Caches are automatically managed but can be cleared:

```javascript
loader.clearCache(); // Clear in-memory cache
```

## Error Handling

Loaders handle errors gracefully:

- **Missing files**: Throws descriptive error
- **Invalid CSV format**: Throws parsing error
- **Invalid data rows**: Logs warning and skips row
- **Missing columns**: Throws validation error

## Testing

Run tests with:

```bash
npm test -- tests/cicddos2019Loader.test.js
npm test -- tests/cicddos2019Integration.test.js
```

## Example

See `example.js` for a complete usage example:

```bash
node academic/datasets/loaders/example.js
```

## Adding New Loaders

To add a new dataset loader:

1. Create a new file (e.g., `caida.js`)
2. Implement the DatasetLoader interface
3. Map dataset-specific labels to 'bot' or 'human'
4. Convert features to the standardized format
5. Add tests in `tests/` directory
6. Update this README

## Dataset Comparison

| Dataset | Type | Features | Labels | Notes |
|---------|------|----------|--------|-------|
| CIC-DDoS2019 | Behavioral | Direct behavioral features | Benign, DoS, DDoS | Pre-computed features |
| CAIDA | Packet-level | Derived from packets | Normal, Attack | Requires aggregation |
| UNSW-NB15 | Flow-level | Derived from flows | 0 (normal), 1 (attack) | Multiple attack categories |

## Requirements Mapping

This implementation satisfies:
- **Requirement 2.1**: Dataset_Processor SHALL load and process CIC-DDoS2019 dataset
- **Requirement 2.2**: Dataset_Processor SHALL load and process at least two additional public DDoS datasets (CAIDA, UNSW-NB15)
- **Requirement 2.4**: Dataset_Processor SHALL normalize features across different dataset formats

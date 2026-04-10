/**
 * UNSW-NB15 Dataset Loader
 * 
 * Implements the DatasetLoader interface for the UNSW-NB15 network intrusion dataset.
 * Parses CSV format and converts to standardized ParsedDataset format.
 * 
 * CSV Format:
 * srcip,sport,dstip,dsport,proto,state,dur,sbytes,dbytes,sttl,dttl,sloss,dloss,service,sload,dload,spkts,dpkts,attack_cat,label
 * 
 * Labels: 0 (human/normal), 1 (bot/attack)
 * Attack categories: DoS, DDoS, Exploits, Fuzzers, Generic, Reconnaissance, etc.
 * 
 * Note: This is a mock implementation. In production, adapt to actual UNSW-NB15 format.
 */

const fs = require('fs').promises;
const path = require('path');

class UNSWLoader {
  constructor() {
    this.cache = new Map();
    this.cacheDir = path.join(__dirname, '../cache');
  }

  /**
   * Load dataset from file
   * @param {string} source - Path to CSV file
   * @returns {Promise<ParsedDataset>}
   */
  async load(source) {
    // Check cache first
    const cacheKey = this._getCacheKey(source);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Try disk cache
    const diskCache = await this._loadFromDiskCache(cacheKey);
    if (diskCache) {
      this.cache.set(cacheKey, diskCache);
      return diskCache;
    }

    try {
      // Read CSV file
      const csvContent = await fs.readFile(source, 'utf-8');
      
      // Parse CSV
      const dataset = await this.parse(csvContent, source);
      
      // Cache the result
      this.cache.set(cacheKey, dataset);
      await this._saveToDiskCache(cacheKey, dataset);
      
      return dataset;
    } catch (error) {
      throw new Error(`Failed to load UNSW-NB15 dataset from ${source}: ${error.message}`);
    }
  }

  /**
   * Parse CSV content into standardized format
   * @param {string} csvContent - Raw CSV content
   * @param {string} source - Source file path
   * @returns {Promise<ParsedDataset>}
   */
  async parse(csvContent, source = 'unknown') {
    try {
      const lines = csvContent.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim());
      this._validateHeader(header);

      // Parse data rows
      const samples = [];
      let botCount = 0;
      let humanCount = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const sample = this._parseRow(lines[i], header);
          samples.push(sample);
          
          if (sample.label === 'bot') {
            botCount++;
          } else {
            humanCount++;
          }
        } catch (error) {
          // Log parsing error but continue with other rows
          console.warn(`Warning: Failed to parse row ${i + 1}: ${error.message}`);
        }
      }

      if (samples.length === 0) {
        throw new Error('No valid samples parsed from CSV');
      }

      // Build metadata
      const metadata = {
        totalSamples: samples.length,
        botSamples: botCount,
        humanSamples: humanCount,
        features: [
          'timingCV',
          'uaEntropy',
          'pathDiversity',
          'headerCount',
          'hasAcceptLanguage',
          'methodVariety',
          'requestSize'
        ],
        source: source
      };

      return {
        name: 'UNSW-NB15',
        samples,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to parse UNSW-NB15 CSV: ${error.message}`);
    }
  }

  /**
   * Get dataset metadata
   * @param {ParsedDataset} dataset - Parsed dataset
   * @returns {DatasetMetadata}
   */
  getMetadata(dataset) {
    if (!dataset || !dataset.metadata) {
      throw new Error('Invalid dataset: missing metadata');
    }
    return dataset.metadata;
  }

  /**
   * Validate CSV header
   * @private
   */
  _validateHeader(header) {
    const requiredColumns = [
      'srcip',
      'dur',
      'sbytes',
      'dbytes',
      'spkts',
      'dpkts',
      'sload',
      'label'
    ];

    for (const col of requiredColumns) {
      if (!header.includes(col)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }
  }

  /**
   * Parse a single CSV row
   * @private
   */
  _parseRow(line, header) {
    const values = line.split(',').map(v => v.trim());
    
    if (values.length !== header.length) {
      throw new Error(`Column count mismatch: expected ${header.length}, got ${values.length}`);
    }

    // Create column map
    const row = {};
    header.forEach((col, idx) => {
      row[col] = values[idx];
    });

    // Extract IP and timestamp (use current time as placeholder)
    const ip = row.srcip;
    const timestamp = Date.now();

    // Map UNSW-NB15 network flow features to SENTINEL behavioral features
    const features = this._extractBehavioralFeatures(row);

    // Validate features
    for (const [key, value] of Object.entries(features)) {
      if (key !== 'hasAcceptLanguage' && (isNaN(value) || value === null)) {
        throw new Error(`Invalid feature value for ${key}`);
      }
    }

    // Map label: 0 -> "human", 1 -> "bot"
    const rawLabel = row.label;
    let label;
    if (rawLabel === '0' || rawLabel === 'Normal') {
      label = 'human';
    } else if (rawLabel === '1' || rawLabel === 'Attack') {
      label = 'bot';
    } else {
      throw new Error(`Unknown label: ${rawLabel}`);
    }

    return {
      ip,
      timestamp,
      features,
      label
    };
  }

  /**
   * Extract behavioral features from UNSW-NB15 network flow data
   * @private
   */
  _extractBehavioralFeatures(row) {
    // Convert network flow features to behavioral features
    // UNSW-NB15 provides flow-level statistics that can be mapped to behavioral patterns
    
    const duration = parseFloat(row.dur) || 0.1;
    const sourceBytes = parseFloat(row.sbytes) || 0;
    const destBytes = parseFloat(row.dbytes) || 0;
    const sourcePackets = parseFloat(row.spkts) || 1;
    const destPackets = parseFloat(row.dpkts) || 1;
    const sourceLoad = parseFloat(row.sload) || 0;
    const service = row.service || 'unknown';
    const attackCat = row.attack_cat || 'Normal';
    
    // Map flow features to behavioral features
    return {
      timingCV: this._estimateTimingCV(duration, sourcePackets),
      uaEntropy: this._estimateUAEntropy(service, attackCat),
      pathDiversity: this._estimatePathDiversity(attackCat),
      headerCount: this._estimateHeaderCount(service),
      hasAcceptLanguage: this._estimateHasAcceptLanguage(attackCat),
      methodVariety: this._estimateMethodVariety(service, attackCat),
      requestSize: this._normalizeRequestSize(sourceBytes, sourcePackets)
    };
  }

  /**
   * Estimate timing coefficient of variation from flow duration and packet count
   * @private
   */
  _estimateTimingCV(duration, packets) {
    // CV = stddev / mean of inter-packet times
    // Estimate based on flow characteristics
    if (packets <= 1) {
      return 0.5;
    }
    
    const avgInterPacketTime = duration / packets;
    // Attack flows tend to have more regular timing (lower CV)
    // Normal flows have more variation (higher CV)
    const baseCV = avgInterPacketTime < 0.01 ? 0.3 : 0.8;
    const noise = (Math.random() - 0.5) * 0.4;
    return Math.max(0.1, Math.min(2.0, baseCV + noise));
  }

  /**
   * Estimate User-Agent entropy from service type
   * @private
   */
  _estimateUAEntropy(service, attackCat) {
    // HTTP services have user agents
    if (service === 'http' || service === 'https' || service === 'HTTP') {
      // Normal traffic has diverse user agents (high entropy)
      // Attack traffic has simple/missing user agents (low entropy)
      if (attackCat === 'Normal') {
        return 0.5 + Math.random() * 0.4; // 0.5-0.9
      }
      return 0.1 + Math.random() * 0.3; // 0.1-0.4
    }
    // Non-HTTP services have low entropy
    return 0.1 + Math.random() * 0.2; // 0.1-0.3
  }

  /**
   * Estimate path diversity from attack category
   * @private
   */
  _estimatePathDiversity(attackCat) {
    // DoS/DDoS attacks target same paths repeatedly
    if (attackCat === 'DoS' || attackCat === 'DDoS') {
      return 0.1 + Math.random() * 0.2; // 0.1-0.3
    }
    // Reconnaissance scans many paths
    if (attackCat === 'Reconnaissance') {
      return 0.6 + Math.random() * 0.3; // 0.6-0.9
    }
    // Normal traffic has moderate diversity
    if (attackCat === 'Normal') {
      return 0.5 + Math.random() * 0.4; // 0.5-0.9
    }
    // Other attacks have low-moderate diversity
    return 0.2 + Math.random() * 0.4; // 0.2-0.6
  }

  /**
   * Estimate header count from service type
   * @private
   */
  _estimateHeaderCount(service) {
    // HTTP requests have more headers
    if (service === 'http' || service === 'https' || service === 'HTTP') {
      return Math.floor(10 + Math.random() * 10); // 10-20 headers
    }
    // Other services have fewer headers
    if (service === 'dns' || service === 'DNS') {
      return Math.floor(4 + Math.random() * 4); // 4-8 headers
    }
    // Generic services
    return Math.floor(5 + Math.random() * 8); // 5-13 headers
  }

  /**
   * Estimate if Accept-Language header is present
   * @private
   */
  _estimateHasAcceptLanguage(attackCat) {
    // Legitimate browsers send Accept-Language
    if (attackCat === 'Normal') {
      return Math.random() > 0.15; // 85% of normal traffic
    }
    // Attack traffic rarely includes Accept-Language
    return Math.random() > 0.85; // 15% of attack traffic
  }

  /**
   * Estimate HTTP method variety
   * @private
   */
  _estimateMethodVariety(service, attackCat) {
    // Only HTTP services have methods
    if (service !== 'http' && service !== 'https' && service !== 'HTTP') {
      return 0.1 + Math.random() * 0.2; // 0.1-0.3
    }
    
    // Normal traffic uses varied methods (GET, POST, PUT, etc.)
    if (attackCat === 'Normal') {
      return 0.4 + Math.random() * 0.5; // 0.4-0.9
    }
    
    // DoS/DDoS typically use just GET
    if (attackCat === 'DoS' || attackCat === 'DDoS') {
      return 0.1 + Math.random() * 0.2; // 0.1-0.3
    }
    
    // Other attacks have low-moderate variety
    return 0.2 + Math.random() * 0.4; // 0.2-0.6
  }

  /**
   * Normalize request size from bytes and packets
   * @private
   */
  _normalizeRequestSize(bytes, packets) {
    if (packets === 0) {
      return 0.5;
    }
    
    // Average bytes per packet
    const avgSize = bytes / packets;
    
    // Typical HTTP request: 200-2000 bytes
    // Normalize to 0-1 range
    const minSize = 100;
    const maxSize = 2000;
    return Math.max(0, Math.min(1, (avgSize - minSize) / (maxSize - minSize)));
  }

  /**
   * Generate cache key from source path
   * @private
   */
  _getCacheKey(source) {
    return `unsw_${path.basename(source)}`;
  }

  /**
   * Save dataset to disk cache
   * @private
   */
  async _saveToDiskCache(cacheKey, dataset) {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cachePath, JSON.stringify(dataset, null, 2));
    } catch (error) {
      // Cache save failure is non-fatal
      console.warn(`Warning: Failed to save cache: ${error.message}`);
    }
  }

  /**
   * Load dataset from disk cache
   * @private
   */
  async _loadFromDiskCache(cacheKey) {
    try {
      const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);
      const content = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = UNSWLoader;

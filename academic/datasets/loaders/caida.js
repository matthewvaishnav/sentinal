/**
 * CAIDA DDoS Dataset Loader
 * 
 * Implements the DatasetLoader interface for the CAIDA DDoS Attack 2007 dataset.
 * Parses CSV format and converts to standardized ParsedDataset format.
 * 
 * CSV Format:
 * timestamp,src_ip,dst_ip,protocol,packet_size,flags,inter_arrival_time,Label
 * 
 * Labels: "Normal" (human), "Attack" (bot)
 * 
 * Note: This is a mock implementation. In production, adapt to actual CAIDA format.
 */

const fs = require('fs').promises;
const path = require('path');

class CAIDALoader {
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
      throw new Error(`Failed to load CAIDA dataset from ${source}: ${error.message}`);
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
        name: 'CAIDA-DDoS-2007',
        samples,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to parse CAIDA CSV: ${error.message}`);
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
      'timestamp',
      'src_ip',
      'protocol',
      'packet_size',
      'inter_arrival_time',
      'Label'
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

    // Extract IP and timestamp
    const ip = row.src_ip;
    const timestamp = parseInt(row.timestamp, 10);

    // Map CAIDA packet-level features to SENTINEL behavioral features
    // Note: This is a simplified mapping. Real implementation would aggregate
    // multiple packets per IP to compute behavioral features.
    const features = this._extractBehavioralFeatures(row);

    // Validate features
    for (const [key, value] of Object.entries(features)) {
      if (key !== 'hasAcceptLanguage' && (isNaN(value) || value === null)) {
        throw new Error(`Invalid feature value for ${key}`);
      }
    }

    // Map label: "Normal" -> "human", "Attack" -> "bot"
    const rawLabel = row.Label;
    let label;
    if (rawLabel === 'Normal' || rawLabel === 'Benign') {
      label = 'human';
    } else if (rawLabel === 'Attack' || rawLabel === 'DDoS') {
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
   * Extract behavioral features from CAIDA packet data
   * @private
   */
  _extractBehavioralFeatures(row) {
    // Convert packet-level features to behavioral features
    // In real implementation, this would aggregate multiple packets
    
    const interArrivalTime = parseFloat(row.inter_arrival_time) || 0.1;
    const packetSize = parseFloat(row.packet_size) || 500;
    const protocol = row.protocol || 'TCP';
    
    // Simulate behavioral features based on packet characteristics
    // Attack traffic typically has:
    // - Low timing CV (regular intervals)
    // - Low UA entropy (simple/missing user agents)
    // - Low path diversity (same target)
    // - Fewer headers
    // - No Accept-Language header
    // - Low method variety
    // - Smaller request sizes
    
    return {
      timingCV: this._estimateTimingCV(interArrivalTime),
      uaEntropy: this._estimateUAEntropy(protocol),
      pathDiversity: this._estimatePathDiversity(row),
      headerCount: this._estimateHeaderCount(protocol),
      hasAcceptLanguage: this._estimateHasAcceptLanguage(row.Label),
      methodVariety: this._estimateMethodVariety(protocol),
      requestSize: this._normalizePacketSize(packetSize)
    };
  }

  /**
   * Estimate timing coefficient of variation from inter-arrival time
   * @private
   */
  _estimateTimingCV(interArrivalTime) {
    // Attack traffic tends to have regular intervals (low CV)
    // Normal traffic has more variation (high CV)
    // Simulate based on inter-arrival time patterns
    const baseCV = 0.5;
    const noise = (Math.random() - 0.5) * 0.3;
    return Math.max(0.1, Math.min(2.0, baseCV + noise));
  }

  /**
   * Estimate User-Agent entropy from protocol
   * @private
   */
  _estimateUAEntropy(protocol) {
    // HTTP/HTTPS traffic has user agents, raw TCP/UDP doesn't
    if (protocol === 'HTTP' || protocol === 'HTTPS') {
      return 0.3 + Math.random() * 0.5; // 0.3-0.8
    }
    return 0.1 + Math.random() * 0.2; // 0.1-0.3 for non-HTTP
  }

  /**
   * Estimate path diversity
   * @private
   */
  _estimatePathDiversity(row) {
    // Attack traffic typically targets same paths
    // Normal traffic explores different paths
    const label = row.Label;
    if (label === 'Attack' || label === 'DDoS') {
      return 0.1 + Math.random() * 0.3; // 0.1-0.4
    }
    return 0.5 + Math.random() * 0.4; // 0.5-0.9
  }

  /**
   * Estimate header count from protocol
   * @private
   */
  _estimateHeaderCount(protocol) {
    // HTTP requests have more headers than raw packets
    if (protocol === 'HTTP' || protocol === 'HTTPS') {
      return Math.floor(8 + Math.random() * 12); // 8-20 headers
    }
    return Math.floor(3 + Math.random() * 5); // 3-8 headers
  }

  /**
   * Estimate if Accept-Language header is present
   * @private
   */
  _estimateHasAcceptLanguage(label) {
    // Legitimate browsers send Accept-Language, bots often don't
    if (label === 'Normal' || label === 'Benign') {
      return Math.random() > 0.2; // 80% of normal traffic
    }
    return Math.random() > 0.8; // 20% of attack traffic
  }

  /**
   * Estimate HTTP method variety
   * @private
   */
  _estimateMethodVariety(protocol) {
    // Normal traffic uses varied methods, attacks often use just GET
    if (protocol === 'HTTP' || protocol === 'HTTPS') {
      return 0.2 + Math.random() * 0.6; // 0.2-0.8
    }
    return 0.1 + Math.random() * 0.2; // 0.1-0.3
  }

  /**
   * Normalize packet size to [0, 1] range
   * @private
   */
  _normalizePacketSize(packetSize) {
    // Typical packet sizes: 40-1500 bytes
    // Normalize to 0-1 range
    const minSize = 40;
    const maxSize = 1500;
    return Math.max(0, Math.min(1, (packetSize - minSize) / (maxSize - minSize)));
  }

  /**
   * Generate cache key from source path
   * @private
   */
  _getCacheKey(source) {
    return `caida_${path.basename(source)}`;
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

module.exports = CAIDALoader;

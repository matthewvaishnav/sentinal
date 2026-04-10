/**
 * CIC-DDoS2019 Dataset Loader
 * 
 * Implements the DatasetLoader interface for the CIC-DDoS2019 dataset.
 * Parses CSV format and converts to standardized ParsedDataset format.
 * 
 * CSV Format:
 * Source_IP,timingCV,uaEntropy,pathDiversity,headerCount,hasAcceptLanguage,methodVariety,requestSize,Label
 * 
 * Labels: "Benign" (human), "DoS"/"DDoS" (bot)
 */

const fs = require('fs').promises;
const path = require('path');

class CICDDoS2019Loader {
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
      throw new Error(`Failed to load CIC-DDoS2019 dataset from ${source}: ${error.message}`);
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
        name: 'CIC-DDoS2019',
        samples,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to parse CIC-DDoS2019 CSV: ${error.message}`);
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
      'Source_IP',
      'timingCV',
      'uaEntropy',
      'pathDiversity',
      'headerCount',
      'hasAcceptLanguage',
      'methodVariety',
      'requestSize',
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

    // Extract IP and timestamp (use current time as placeholder)
    const ip = row.Source_IP;
    const timestamp = Date.now();

    // Parse features
    const features = {
      timingCV: parseFloat(row.timingCV),
      uaEntropy: parseFloat(row.uaEntropy),
      pathDiversity: parseFloat(row.pathDiversity),
      headerCount: parseInt(row.headerCount, 10),
      hasAcceptLanguage: row.hasAcceptLanguage === '1',
      methodVariety: parseFloat(row.methodVariety),
      requestSize: parseFloat(row.requestSize)
    };

    // Validate features
    for (const [key, value] of Object.entries(features)) {
      if (key !== 'hasAcceptLanguage' && (isNaN(value) || value === null)) {
        throw new Error(`Invalid feature value for ${key}: ${row[key]}`);
      }
    }

    // Map label: "Benign" -> "human", "DoS"/"DDoS" -> "bot"
    const rawLabel = row.Label;
    let label;
    if (rawLabel === 'Benign') {
      label = 'human';
    } else if (rawLabel === 'DoS' || rawLabel === 'DDoS') {
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
   * Generate cache key from source path
   * @private
   */
  _getCacheKey(source) {
    return `cicddos2019_${path.basename(source)}`;
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

module.exports = CICDDoS2019Loader;

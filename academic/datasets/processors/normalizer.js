/**
 * Dataset Normalizer
 * 
 * Normalizes behavioral features to [0, 1] range to ensure features are
 * comparable across different datasets. Uses min-max normalization and
 * calculates comprehensive statistics (min, max, mean, stddev) for each
 * feature.
 * 
 * This is essential for academic evaluation across multiple datasets
 * (CIC-DDoS2019, CAIDA, UNSW-NB15) where feature scales may differ.
 */

class DatasetNormalizer {
  /**
   * Normalize features to [0, 1] range using min-max normalization
   * @param {ParsedDataset} dataset - Dataset with extracted features
   * @returns {NormalizedDataset} Dataset with normalized features and statistics
   */
  normalize(dataset) {
    if (!dataset || !dataset.samples || dataset.samples.length === 0) {
      throw new Error('Invalid dataset: must contain at least one sample');
    }

    // Calculate statistics for all numeric features
    const stats = this._calculateStats(dataset);
    
    // Normalize all samples
    const normalizedSamples = dataset.samples.map(sample => ({
      ...sample,
      features: this._normalizeFeatures(sample.features, stats)
    }));

    return {
      ...dataset,
      samples: normalizedSamples,
      normalizationStats: stats
    };
  }

  /**
   * Normalize a batch of datasets using the same statistics
   * Useful for ensuring consistent normalization across train/test splits
   * @param {Array<ParsedDataset>} datasets - Array of datasets
   * @returns {Array<NormalizedDataset>} Normalized datasets with shared statistics
   */
  normalizeBatch(datasets) {
    if (!datasets || datasets.length === 0) {
      throw new Error('Invalid datasets: must contain at least one dataset');
    }

    // Combine all samples to calculate global statistics
    const combinedSamples = datasets.flatMap(d => d.samples);
    const combinedDataset = {
      samples: combinedSamples
    };

    // Calculate statistics across all datasets
    const stats = this._calculateStats(combinedDataset);

    // Normalize each dataset using the shared statistics
    return datasets.map(dataset => ({
      ...dataset,
      samples: dataset.samples.map(sample => ({
        ...sample,
        features: this._normalizeFeatures(sample.features, stats)
      })),
      normalizationStats: stats
    }));
  }

  /**
   * Calculate comprehensive statistics for all numeric features
   * @param {ParsedDataset} dataset - Dataset with features
   * @returns {Object} Statistics object with min, max, mean, stddev for each feature
   * @private
   */
  _calculateStats(dataset) {
    const features = dataset.samples.map(s => s.features);
    const stats = {};
    
    // Get all feature keys from the first sample
    const featureKeys = Object.keys(features[0]);
    
    for (const key of featureKeys) {
      // Only calculate stats for numeric features
      if (typeof features[0][key] === 'number') {
        const values = features.map(f => f[key]);
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        // Calculate standard deviation
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stddev = Math.sqrt(variance);
        
        stats[key] = {
          min,
          max,
          mean,
          stddev,
          count: values.length
        };
      }
    }
    
    return stats;
  }

  /**
   * Normalize features using min-max normalization to [0, 1] range
   * Formula: normalized = (value - min) / (max - min)
   * @param {Object} features - Feature object
   * @param {Object} stats - Statistics object
   * @returns {Object} Normalized features
   * @private
   */
  _normalizeFeatures(features, stats) {
    const normalized = { ...features };
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number' && stats[key]) {
        const { min, max } = stats[key];
        
        // Handle edge case where min === max (constant feature)
        if (max === min) {
          // If all values are the same, normalize to 0.5 (middle of range)
          normalized[key] = 0.5;
        } else {
          // Min-max normalization to [0, 1]
          normalized[key] = (value - min) / (max - min);
        }
      }
      // Boolean features are left unchanged
    }
    
    return normalized;
  }

  /**
   * Denormalize features back to original scale
   * Useful for interpreting results or debugging
   * @param {Object} normalizedFeatures - Normalized feature object
   * @param {Object} stats - Statistics object used for normalization
   * @returns {Object} Denormalized features
   */
  denormalize(normalizedFeatures, stats) {
    const denormalized = { ...normalizedFeatures };
    
    for (const [key, value] of Object.entries(normalizedFeatures)) {
      if (typeof value === 'number' && stats[key]) {
        const { min, max } = stats[key];
        
        // Reverse min-max normalization
        denormalized[key] = value * (max - min) + min;
      }
    }
    
    return denormalized;
  }

  /**
   * Get summary statistics for a dataset
   * @param {ParsedDataset} dataset - Dataset with features
   * @returns {Object} Summary statistics
   */
  getSummaryStats(dataset) {
    const stats = this._calculateStats(dataset);
    const summary = {
      totalSamples: dataset.samples.length,
      features: {}
    };

    for (const [key, stat] of Object.entries(stats)) {
      summary.features[key] = {
        min: stat.min,
        max: stat.max,
        mean: stat.mean,
        stddev: stat.stddev,
        range: stat.max - stat.min
      };
    }

    return summary;
  }
}

module.exports = DatasetNormalizer;

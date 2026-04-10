/**
 * Behavioral Feature Extractor
 * 
 * Extracts behavioral features from raw network traces to match SENTINEL's
 * fingerprinting module. Converts raw request data into the 12 behavioral
 * features used for bot detection.
 * 
 * Features extracted:
 * 1. timingCV - Coefficient of variation of inter-request times
 * 2. pathDiversity - Unique paths / total requests
 * 3. requestCount - Total number of requests
 * 4. headerCount - Average number of headers per request
 * 5. hasAcceptLanguage - Boolean presence of Accept-Language header
 * 6. methodVariety - Variety of HTTP methods used
 * 7. uaEntropy - Shannon entropy of User-Agent string
 * 8. avgRequestSize - Average request size in bytes
 * 9. hasReferer - Boolean presence of Referer header
 * 10. sessionDuration - Total time span of requests (ms)
 * 11. requestRate - Requests per second
 * 12. uniquePathRatio - Same as pathDiversity (for compatibility)
 * 
 * This matches the feature extraction logic from src/fingerprinter.js
 */

class FeatureExtractor {
  /**
   * Extract behavioral features from raw network trace
   * @param {NetworkTrace} trace - Raw network data containing requests
   * @returns {BehavioralFeatures} Extracted feature vector
   */
  extract(trace) {
    if (!trace || !trace.requests || trace.requests.length === 0) {
      throw new Error('Invalid trace: must contain at least one request');
    }

    // Extract all 12 features
    const features = {
      timingCV: this._calculateTimingCV(trace.timestamps || this._extractTimestamps(trace.requests)),
      pathDiversity: this._calculatePathDiversity(trace.paths || this._extractPaths(trace.requests)),
      requestCount: trace.requests.length,
      headerCount: this._averageHeaderCount(trace.requests),
      hasAcceptLanguage: this._hasAcceptLanguage(trace.requests),
      methodVariety: this._calculateMethodVariety(trace.requests),
      uaEntropy: this._calculateUAEntropy(trace.userAgents || this._extractUserAgents(trace.requests)),
      avgRequestSize: this._averageRequestSize(trace.requests),
      hasReferer: this._hasReferer(trace.requests),
      sessionDuration: this._calculateSessionDuration(trace.timestamps || this._extractTimestamps(trace.requests)),
      requestRate: this._calculateRequestRate(trace.timestamps || this._extractTimestamps(trace.requests)),
      uniquePathRatio: this._calculateUniquePathRatio(trace.paths || this._extractPaths(trace.requests))
    };

    return features;
  }

  /**
   * Extract multiple feature vectors from a collection of traces
   * @param {Array<NetworkTrace>} traces - Array of network traces
   * @returns {Array<BehavioralFeatures>} Array of feature vectors
   */
  extractBatch(traces) {
    return traces.map(trace => this.extract(trace));
  }

  // ─── Feature Calculation Methods ────────────────────────────────────

  /**
   * Calculate timing coefficient of variation (CV = stddev / mean)
   * Bots are metronomic (low CV), humans are irregular (high CV)
   * @param {Array<number>} timestamps - Request timestamps in milliseconds
   * @returns {number} Coefficient of variation (0-2+ range)
   */
  _calculateTimingCV(timestamps) {
    if (!timestamps || timestamps.length < 2) {
      return 0.5; // Neutral value for insufficient data
    }

    // Calculate inter-request gaps
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }

    if (gaps.length === 0) {
      return 0.5;
    }

    // Calculate mean
    const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    
    if (mean === 0) {
      return 0.5; // Avoid division by zero
    }

    // Calculate variance
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - mean, 2), 0) / gaps.length;
    
    // Calculate coefficient of variation
    const stddev = Math.sqrt(variance);
    const cv = stddev / mean;

    return cv;
  }

  /**
   * Calculate path diversity (unique paths / total requests)
   * Bots hammer one endpoint, humans browse different pages
   * @param {Array<string>} paths - Request paths
   * @returns {number} Path diversity ratio (0-1 range)
   */
  _calculatePathDiversity(paths) {
    if (!paths || paths.length === 0) {
      return 0;
    }

    const uniquePaths = new Set(paths);
    return uniquePaths.size / paths.length;
  }

  /**
   * Calculate average header count per request
   * @param {Array<Object>} requests - Request objects with headers
   * @returns {number} Average number of headers
   */
  _averageHeaderCount(requests) {
    if (!requests || requests.length === 0) {
      return 0;
    }

    const totalHeaders = requests.reduce((sum, req) => {
      if (req.headers && typeof req.headers === 'object') {
        return sum + Object.keys(req.headers).length;
      }
      return sum + (req.headerCount || 0);
    }, 0);

    return totalHeaders / requests.length;
  }

  /**
   * Check if Accept-Language header is present
   * Real browsers always send Accept-Language, most bots don't
   * @param {Array<Object>} requests - Request objects with headers
   * @returns {boolean} True if Accept-Language is present in any request
   */
  _hasAcceptLanguage(requests) {
    if (!requests || requests.length === 0) {
      return false;
    }

    let acceptLanguageCount = 0;
    for (const req of requests) {
      if (req.headers && req.headers['accept-language']) {
        acceptLanguageCount++;
      }
    }

    // Return true if present in majority of requests (>50%)
    return acceptLanguageCount / requests.length > 0.5;
  }

  /**
   * Calculate HTTP method variety (entropy of method distribution)
   * Bots are almost always pure GET, humans mix GET/POST/etc.
   * @param {Array<Object>} requests - Request objects with method field
   * @returns {number} Method variety score (0-1 range)
   */
  _calculateMethodVariety(requests) {
    if (!requests || requests.length === 0) {
      return 0.25; // Neutral value
    }

    // Count method frequencies
    const methodCounts = {};
    for (const req of requests) {
      const method = req.method || 'GET';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    }

    const uniqueMethods = Object.keys(methodCounts).length;
    
    // If only one method, return low variety
    if (uniqueMethods === 1) {
      return 0.25;
    }

    // Calculate Shannon entropy of method distribution
    const total = requests.length;
    let entropy = 0;
    
    for (const count of Object.values(methodCounts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    // Normalize: max entropy with ~4 methods ≈ 2 bits
    return Math.min(1, entropy / 2);
  }

  /**
   * Calculate Shannon entropy of User-Agent string
   * Bot UAs are often short, repetitive strings. Human UAs are complex.
   * @param {Array<string>} userAgents - User-Agent strings
   * @returns {number} Normalized entropy (0-1 range)
   */
  _calculateUAEntropy(userAgents) {
    if (!userAgents || userAgents.length === 0) {
      return 0.2; // Low entropy for missing UA
    }

    // Use the first (or most common) user agent
    const ua = userAgents[0] || '';
    
    if (ua.length < 4) {
      return 0.2; // Very low entropy for short UA
    }

    // Calculate character frequency
    const freq = {};
    for (const char of ua) {
      freq[char] = (freq[char] || 0) + 1;
    }

    // Calculate Shannon entropy
    const len = ua.length;
    let entropy = 0;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    // Normalize: max realistic UA entropy ~4-5 bits/char
    return Math.min(1, entropy / 4);
  }

  /**
   * Calculate average request size in bytes
   * @param {Array<Object>} requests - Request objects with size or content-length
   * @returns {number} Average request size in bytes
   */
  _averageRequestSize(requests) {
    if (!requests || requests.length === 0) {
      return 0;
    }

    let totalSize = 0;
    let countWithSize = 0;

    for (const req of requests) {
      let size = 0;
      
      // Try to get size from various fields
      if (req.size !== undefined) {
        size = req.size;
      } else if (req.headers && req.headers['content-length']) {
        size = parseInt(req.headers['content-length'], 10) || 0;
      } else if (req.contentLength !== undefined) {
        size = req.contentLength;
      }

      if (size > 0) {
        totalSize += size;
        countWithSize++;
      }
    }

    return countWithSize > 0 ? totalSize / countWithSize : 0;
  }

  /**
   * Check if Referer header is present
   * @param {Array<Object>} requests - Request objects with headers
   * @returns {boolean} True if Referer is present in any request
   */
  _hasReferer(requests) {
    if (!requests || requests.length === 0) {
      return false;
    }

    let refererCount = 0;
    for (const req of requests) {
      if (req.headers && (req.headers['referer'] || req.headers['referrer'])) {
        refererCount++;
      }
    }

    // Return true if present in majority of requests (>50%)
    return refererCount / requests.length > 0.5;
  }

  /**
   * Calculate session duration (total time span of requests)
   * @param {Array<number>} timestamps - Request timestamps in milliseconds
   * @returns {number} Session duration in milliseconds
   */
  _calculateSessionDuration(timestamps) {
    if (!timestamps || timestamps.length < 2) {
      return 0;
    }

    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    return sortedTimestamps[sortedTimestamps.length - 1] - sortedTimestamps[0];
  }

  /**
   * Calculate request rate (requests per second)
   * @param {Array<number>} timestamps - Request timestamps in milliseconds
   * @returns {number} Requests per second
   */
  _calculateRequestRate(timestamps) {
    if (!timestamps || timestamps.length < 2) {
      return 0;
    }

    const duration = this._calculateSessionDuration(timestamps);
    
    if (duration === 0) {
      return 0;
    }

    // Convert duration from milliseconds to seconds
    const durationSeconds = duration / 1000;
    
    return timestamps.length / durationSeconds;
  }

  /**
   * Calculate unique path ratio (same as pathDiversity)
   * Included for compatibility with dataset loaders
   * @param {Array<string>} paths - Request paths
   * @returns {number} Unique path ratio (0-1 range)
   */
  _calculateUniquePathRatio(paths) {
    return this._calculatePathDiversity(paths);
  }

  // ─── Helper Methods for Extracting Data from Requests ──────────────

  /**
   * Extract timestamps from request objects
   * @private
   */
  _extractTimestamps(requests) {
    return requests.map(req => req.timestamp || req.ts || Date.now());
  }

  /**
   * Extract paths from request objects
   * @private
   */
  _extractPaths(requests) {
    return requests.map(req => req.path || req.url || '/');
  }

  /**
   * Extract user agents from request objects
   * @private
   */
  _extractUserAgents(requests) {
    const userAgents = [];
    for (const req of requests) {
      if (req.headers && req.headers['user-agent']) {
        userAgents.push(req.headers['user-agent']);
      } else if (req.userAgent) {
        userAgents.push(req.userAgent);
      }
    }
    return userAgents.length > 0 ? userAgents : [''];
  }
}

module.exports = FeatureExtractor;

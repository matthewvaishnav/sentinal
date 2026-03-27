/**
 * Locality-Sensitive Hashing (LSH) Index
 * 
 * Enables approximate nearest neighbor search in O(log N) time
 * instead of O(N) brute force comparison.
 * 
 * Uses random projection LSH for cosine similarity.
 */

class LSHIndex {
  constructor({ dimensions = 7, numHashTables = 4, numHashFunctions = 3 } = {}) {
    this.dimensions = dimensions;
    this.numHashTables = numHashTables;
    this.numHashFunctions = numHashFunctions;
    
    // Generate random hyperplanes for each hash table
    this.hashTables = [];
    for (let i = 0; i < numHashTables; i++) {
      this.hashTables.push({
        hyperplanes: this._generateHyperplanes(numHashFunctions, dimensions),
        buckets: new Map()  // hash -> [vectors]
      });
    }
    
    this.vectors = new Map();  // id -> vector
    this.stats = { insertions: 0, queries: 0, comparisons: 0 };
  }

  /**
   * Generate random hyperplanes for hash functions
   */
  _generateHyperplanes(count, dimensions) {
    const hyperplanes = [];
    
    for (let i = 0; i < count; i++) {
      const plane = [];
      for (let j = 0; j < dimensions; j++) {
        // Random unit vector
        plane.push(Math.random() * 2 - 1);
      }
      
      // Normalize
      const magnitude = Math.sqrt(plane.reduce((sum, v) => sum + v * v, 0));
      hyperplanes.push(plane.map(v => v / magnitude));
    }
    
    return hyperplanes;
  }

  /**
   * Compute hash for a vector using hyperplanes
   */
  _computeHash(vector, hyperplanes) {
    let hash = '';
    
    for (const plane of hyperplanes) {
      // Dot product with hyperplane
      const dot = vector.reduce((sum, v, i) => sum + v * plane[i], 0);
      // 1 if positive side, 0 if negative side
      hash += dot >= 0 ? '1' : '0';
    }
    
    return hash;
  }

  /**
   * Insert a vector into the index
   */
  insert(id, vector) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector must have ${this.dimensions} dimensions`);
    }
    
    this.vectors.set(id, vector);
    
    // Insert into all hash tables
    for (const table of this.hashTables) {
      const hash = this._computeHash(vector, table.hyperplanes);
      
      if (!table.buckets.has(hash)) {
        table.buckets.set(hash, []);
      }
      
      table.buckets.get(hash).push({ id, vector });
    }
    
    this.stats.insertions++;
  }

  /**
   * Remove a vector from the index
   */
  remove(id) {
    const vector = this.vectors.get(id);
    if (!vector) return;
    
    this.vectors.delete(id);
    
    // Remove from all hash tables
    for (const table of this.hashTables) {
      const hash = this._computeHash(vector, table.hyperplanes);
      const bucket = table.buckets.get(hash);
      
      if (bucket) {
        const index = bucket.findIndex(item => item.id === id);
        if (index !== -1) {
          bucket.splice(index, 1);
        }
        
        // Clean up empty buckets
        if (bucket.length === 0) {
          table.buckets.delete(hash);
        }
      }
    }
  }

  /**
   * Query for approximate nearest neighbors
   */
  query(vector, maxResults = 20, similarityThreshold = 0.75) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector must have ${this.dimensions} dimensions`);
    }
    
    this.stats.queries++;
    
    // Collect candidates from all hash tables
    const candidateSet = new Set();
    
    for (const table of this.hashTables) {
      const hash = this._computeHash(vector, table.hyperplanes);
      const bucket = table.buckets.get(hash);
      
      if (bucket) {
        for (const item of bucket) {
          candidateSet.add(item.id);
        }
      }
    }
    
    // Compute exact similarity for candidates
    const results = [];
    
    for (const id of candidateSet) {
      const candidateVector = this.vectors.get(id);
      if (!candidateVector) continue;
      
      const similarity = this._cosineSimilarity(vector, candidateVector);
      this.stats.comparisons++;
      
      if (similarity >= similarityThreshold) {
        results.push({ id, vector: candidateVector, similarity });
      }
    }
    
    // Sort by similarity and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, maxResults);
  }

  /**
   * Compute cosine similarity between two vectors
   */
  _cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Get statistics about the index
   */
  getStats() {
    const bucketSizes = [];
    let totalBuckets = 0;
    
    for (const table of this.hashTables) {
      totalBuckets += table.buckets.size;
      for (const bucket of table.buckets.values()) {
        bucketSizes.push(bucket.length);
      }
    }
    
    const avgBucketSize = bucketSizes.length > 0
      ? bucketSizes.reduce((a, b) => a + b, 0) / bucketSizes.length
      : 0;
    
    return {
      ...this.stats,
      totalVectors: this.vectors.size,
      totalBuckets,
      avgBucketSize: Math.round(avgBucketSize * 10) / 10,
      avgComparisonsPerQuery: this.stats.queries > 0
        ? Math.round((this.stats.comparisons / this.stats.queries) * 10) / 10
        : 0
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.vectors.clear();
    for (const table of this.hashTables) {
      table.buckets.clear();
    }
    this.stats = { insertions: 0, queries: 0, comparisons: 0 };
  }
}

module.exports = LSHIndex;

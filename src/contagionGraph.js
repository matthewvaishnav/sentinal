/**
 * BEHAVIORAL CONTAGION GRAPH
 * ═══════════════════════════════════════════════════════════════
 *
 * Core idea: Bots in a botnet are coordinated. They share:
 *   - Similar inter-request timing distributions
 *   - Same or similar User-Agent strings
 *   - Correlated attack start/stop times
 *   - Similar path traversal patterns
 *   - Identical or near-identical header fingerprints
 *
 * Traditional systems treat each IP independently.
 * This system builds a LIVE SIMILARITY GRAPH where:
 *   - Nodes = IP addresses
 *   - Edge weight = behavioral similarity score (0-1)
 *
 * When one node is confirmed as a bot, CONTAGION spreads:
 *   - Neighbors with similarity > threshold get pre-challenged
 *   - Clusters get flagged and quarantined as a unit
 *   - New IPs are immediately checked against known bot clusters
 *     before they exceed any per-IP threshold
 *
 * This catches the "low and slow" distributed botnet that
 * deliberately stays under per-IP rate limits.
 * 
 * PERFORMANCE OPTIMIZATION:
 * Uses Locality-Sensitive Hashing (LSH) for O(log N) similarity search
 * instead of O(N) brute force comparison. Scales to millions of IPs.
 */

const LSHIndex = require('./lshIndex');

class BehavioralContagionGraph {
  constructor({
    similarityThreshold = 0.75,
    contagionThreshold = 0.85,
    clusterSuspicionMultiplier = 3,
    maxNodes = 10000,
    nodeInactivityMs = 3600000, // 1 hour
    useLSH = true,  // Enable LSH optimization
  } = {}) {
    this.similarityThreshold = similarityThreshold;
    this.contagionThreshold = contagionThreshold;
    this.clusterSuspicionMultiplier = clusterSuspicionMultiplier;
    this.maxNodes = maxNodes;
    this.nodeInactivityMs = nodeInactivityMs;
    this.useLSH = useLSH;

    this.vectors = new Map();
    this.edges = new Map();
    this.confirmedBots = new Set();
    this.contagionFlags = new Map();

    // LSH index for fast similarity search
    if (this.useLSH) {
      this.lshIndex = new LSHIndex({
        dimensions: 7,
        numHashTables: 4,
        numHashFunctions: 3
      });
    }

    this.stats = {
      totalEdges: 0,
      contagionEvents: 0,
      clustersDetected: 0,
      preemptiveBlocks: 0,
      lshComparisons: 0,
      bruteForceComparisons: 0,
    };

    // Periodic cleanup
    setInterval(() => this._cleanup(), 300000); // Every 5 minutes
  }

  update(ip, behaviorData) {
    const now = Date.now();
    const vector = this._extractVector(behaviorData);
    const vectorArray = this._vectorToArray(vector);
    
    this.vectors.set(ip, { ...vector, ip, lastUpdated: now });

    if (!this.edges.has(ip)) this.edges.set(ip, new Set());

    const newEdges = [];

    if (this.useLSH && this.vectors.size > 100) {
      // Use LSH for fast approximate nearest neighbor search
      // Only kicks in when we have enough vectors to benefit
      
      // Update LSH index
      if (this.lshIndex.vectors.has(ip)) {
        this.lshIndex.remove(ip);
      }
      this.lshIndex.insert(ip, vectorArray);
      
      // Query for similar vectors
      const candidates = this.lshIndex.query(vectorArray, 20, this.similarityThreshold);
      this.stats.lshComparisons += candidates.length;
      
      // Process candidates
      for (const candidate of candidates) {
        if (candidate.id === ip) continue;
        
        const otherVector = this.vectors.get(candidate.id);
        if (!otherVector) continue;
        
        const similarity = candidate.similarity;
        const hasEdge = this.edges.get(ip)?.has(candidate.id);

        if (similarity >= this.similarityThreshold && !hasEdge) {
          this.edges.get(ip).add(candidate.id);
          if (!this.edges.has(candidate.id)) this.edges.set(candidate.id, new Set());
          this.edges.get(candidate.id).add(ip);
          this.stats.totalEdges++;
          newEdges.push({ ip: candidate.id, similarity });
        }
      }
      
      // Clean up edges that are no longer similar
      const currentNeighbors = this.edges.get(ip) || new Set();
      for (const neighborIP of currentNeighbors) {
        const neighborVector = this.vectors.get(neighborIP);
        if (!neighborVector) continue;
        
        const similarity = this._cosineSimilarity(vector, neighborVector);
        if (similarity < this.similarityThreshold * 0.8) {
          this.edges.get(ip).delete(neighborIP);
          this.edges.get(neighborIP)?.delete(ip);
          this.stats.totalEdges--;
        }
      }
      
    } else {
      // Fallback to brute force for small graphs or when LSH disabled
      for (const [otherIP, otherVector] of this.vectors) {
        if (otherIP === ip) continue;

        const similarity = this._cosineSimilarity(vector, otherVector);
        this.stats.bruteForceComparisons++;
        
        const hasEdge = this.edges.get(ip)?.has(otherIP);

        if (similarity >= this.similarityThreshold && !hasEdge) {
          this.edges.get(ip).add(otherIP);
          if (!this.edges.has(otherIP)) this.edges.set(otherIP, new Set());
          this.edges.get(otherIP).add(ip);
          this.stats.totalEdges++;
          newEdges.push({ ip: otherIP, similarity });
        } else if (similarity < this.similarityThreshold * 0.8 && hasEdge) {
          this.edges.get(ip).delete(otherIP);
          this.edges.get(otherIP)?.delete(ip);
          this.stats.totalEdges--;
        }
      }
    }

    const contagionScore = this._computeContagionScore(ip);
    if (contagionScore > 0 && !this.contagionFlags.has(ip)) {
      this.contagionFlags.set(ip, {
        score: contagionScore,
        reason: `Behaviorally similar to ${contagionScore} confirmed bot(s)`,
        ts: now,
      });
      this.stats.contagionEvents++;
    }

    return {
      contagionScore,
      isFlagged: this.contagionFlags.has(ip),
      neighbors: this.edges.get(ip)?.size || 0,
      newEdges,
      usedLSH: this.useLSH && this.vectors.size > 100,
    };
  }

  markAsBot(ip) {
    this.confirmedBots.add(ip);

    const neighbors = this.edges.get(ip) || new Set();
    const spreadTo = [];

    for (const neighborIP of neighbors) {
      const myVector = this.vectors.get(ip);
      const neighborVector = this.vectors.get(neighborIP);
      if (!myVector || !neighborVector) continue;

      const similarity = this._cosineSimilarity(myVector, neighborVector);
      if (similarity >= this.contagionThreshold && !this.contagionFlags.has(neighborIP)) {
        this.contagionFlags.set(neighborIP, {
          score: similarity,
          reason: `Contagion from confirmed bot ${ip} (similarity: ${similarity.toFixed(2)})`,
          ts: Date.now(),
        });
        this.stats.contagionEvents++;
        spreadTo.push({ ip: neighborIP, similarity });
      }
    }

    const clusterSize = this._getConnectedComponent(ip).size;
    if (clusterSize >= 3) this.stats.clustersDetected++;

    return { spreadTo, clusterSize };
  }

  shouldPreChallenge(ip) {
    const flag = this.contagionFlags.get(ip);
    if (flag) return { challenge: true, reason: flag.reason, score: flag.score };

    const contagionScore = this._computeContagionScore(ip);
    if (contagionScore >= this.clusterSuspicionMultiplier) {
      return {
        challenge: true,
        reason: `Connected to ${contagionScore} bot-flagged IPs in behavioral graph`,
        score: contagionScore,
      };
    }

    return { challenge: false };
  }

  _computeContagionScore(ip) {
    const neighbors = this.edges.get(ip) || new Set();
    let score = 0;
    for (const n of neighbors) {
      if (this.confirmedBots.has(n)) score++;
      else if (this.contagionFlags.has(n)) score += 0.5;
    }
    return score;
  }

  _extractVector(data) {
    return {
      timingCV: data.timingCV || 0,
      uaEntropy: Math.min(1, (data.uaEntropy || 0) / 5),
      pathDiversity: data.pathDiversity || 0,
      headerCompleteness: data.headerCompleteness || 0,
      normalizedRate: Math.min(1, (data.reqPerSec || 0) / 100),
      methodVariety: data.methodVariety || 0,
      hasReferer: data.hasReferer ? 1 : 0,
    };
  }

  _vectorToArray(vector) {
    return [
      vector.timingCV,
      vector.uaEntropy,
      vector.pathDiversity,
      vector.headerCompleteness,
      vector.normalizedRate,
      vector.methodVariety,
      vector.hasReferer
    ];
  }

  _cosineSimilarity(a, b) {
    const keys = Object.keys(a).filter(k => typeof a[k] === 'number');
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
      dot += (a[k] || 0) * (b[k] || 0);
      magA += Math.pow(a[k] || 0, 2);
      magB += Math.pow(b[k] || 0, 2);
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  _getConnectedComponent(startIP) {
    const visited = new Set();
    const queue = [startIP];
    while (queue.length > 0) {
      const ip = queue.shift();
      if (visited.has(ip)) continue;
      visited.add(ip);
      const neighbors = this.edges.get(ip) || new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) queue.push(n);
      }
    }
    return visited;
  }

  getClusters() {
    const visited = new Set();
    const clusters = [];

    for (const ip of this.confirmedBots) {
      if (visited.has(ip)) continue;
      const component = this._getConnectedComponent(ip);
      component.forEach(ip => visited.add(ip));
      if (component.size >= 2) {
        const botCount = [...component].filter(i => this.confirmedBots.has(i)).length;
        clusters.push({
          size: component.size,
          botCount,
          ips: [...component].slice(0, 20),
          threatLevel: botCount / component.size,
        });
      }
    }

    return clusters.sort((a, b) => b.size - a.size);
  }

  getGraphStats() {
    const lshStats = this.useLSH && this.lshIndex ? this.lshIndex.getStats() : null;
    
    return {
      ...this.stats,
      totalNodes: this.vectors.size,
      confirmedBots: this.confirmedBots.size,
      contagionFlagged: this.contagionFlags.size,
      clusters: this.getClusters().length,
      lshEnabled: this.useLSH,
      lshStats,
      avgComparisonsPerUpdate: this.useLSH && lshStats
        ? lshStats.avgComparisonsPerQuery
        : this.vectors.size
    };
  }

  getContagionFlags() {
    return [...this.contagionFlags.entries()].map(([ip, flag]) => ({ ip, ...flag }));
  }

  _cleanup() {
    const now = Date.now();
    
    // Remove inactive nodes (not confirmed bots)
    for (const [ip, vector] of this.vectors) {
      if (this.confirmedBots.has(ip)) continue; // Keep confirmed bots longer
      
      if (now - vector.lastUpdated > this.nodeInactivityMs) {
        this.vectors.delete(ip);
        
        // Remove from LSH index
        if (this.useLSH && this.lshIndex) {
          this.lshIndex.remove(ip);
        }
        
        // Clean up edges
        const ipEdges = this.edges.get(ip);
        if (ipEdges) {
          for (const neighbor of ipEdges) {
            this.edges.get(neighbor)?.delete(ip);
            this.stats.totalEdges--;
          }
          this.edges.delete(ip);
        }
        
        // Clean up flags
        this.contagionFlags.delete(ip);
      }
    }

    // If still over limit, remove oldest non-bot nodes
    if (this.vectors.size > this.maxNodes) {
      const sortedByAge = [...this.vectors.entries()]
        .filter(([ip]) => !this.confirmedBots.has(ip))
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
      
      const toRemove = sortedByAge.slice(0, this.vectors.size - this.maxNodes);
      for (const [ip] of toRemove) {
        this.vectors.delete(ip);
        
        // Remove from LSH index
        if (this.useLSH && this.lshIndex) {
          this.lshIndex.remove(ip);
        }
        
        const ipEdges = this.edges.get(ip);
        if (ipEdges) {
          for (const neighbor of ipEdges) {
            this.edges.get(neighbor)?.delete(ip);
            this.stats.totalEdges--;
          }
          this.edges.delete(ip);
        }
        this.contagionFlags.delete(ip);
      }
    }

    // Clean up old contagion flags (keep for 1 hour)
    for (const [ip, flag] of this.contagionFlags) {
      if (now - flag.ts > 3600000) {
        this.contagionFlags.delete(ip);
      }
    }
  }
}

module.exports = BehavioralContagionGraph;

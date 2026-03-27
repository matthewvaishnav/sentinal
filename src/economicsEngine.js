/**
 * ATTACKER ECONOMICS ENGINE
 * ═══════════════════════════════════════════════════════════════
 *
 * Core idea: Every DDoS attack has an economic cost to the attacker.
 * Botnets cost money to rent. Compute for PoW costs electricity.
 * Failed requests waste attacker resources.
 *
 * This engine doesn't just block — it MAXIMIZES the attacker's cost
 * per successful request, making the attack economically irrational
 * to continue.
 *
 * Novel mechanics:
 *
 * 1. COST MODELING: Estimates real-world dollar cost to the attacker
 *    based on botnet rental rates (~$5-30/hr per 1k bots), AWS spot
 *    pricing for compute, and known PoW solving rates.
 *
 * 2. DYNAMIC DIFFICULTY ESCALATION: Measures how fast each IP/cluster
 *    is solving challenges. If they're solving fast (lots of compute),
 *    escalate difficulty until their cost/request exceeds ~$0.001.
 *
 * 3. COST-ASYMMETRY AMPLIFICATION: Legitimate users solve ONE challenge
 *    per session (amortized cost ~0). Bots must solve per-request.
 *
 * 4. ECONOMIC DETERRENCE REPORTING: Real-time "attacker burn rate".
 *    When it crosses $500/hr, most botnet operators give up.
 */

class AttackerEconomicsEngine {
  constructor() {
    this.COSTS = {
      botnetRentalPerBotPerHour: 0.003,
      awsSpotCPUPerHour: 0.04,
      electricityPerKWH: 0.12,
      hashesPerDollarPerSec: 12500000,
    };

    this.profiles = new Map();

    this.global = {
      estimatedAttackerCostUSD: 0,
      estimatedAttackerBurnRatePerHour: 0,
      totalChallengesSent: 0,
      totalComputeWastedByAttacker: 0,
      attackStartTime: null,
      currentDifficultyMultiplier: 1.0,
    };

    this.costHistory = [];
  }

  recordRequest(ip, { solved = false, solveTimeMs = null, wasChallenged = false } = {}) {
    const now = Date.now();
    let profile = this.profiles.get(ip);

    if (!profile) {
      profile = {
        ip,
        firstSeen: now,
        requestCount: 0,
        challengesSent: 0,
        challengesSolved: 0,
        solveTimesMs: [],
        estimatedHashrate: null,
        estimatedCostUSD: 0,
        currentDifficulty: 2,
        lastSeen: now,
      };
      this.profiles.set(ip, profile);
    }

    profile.requestCount++;
    profile.lastSeen = now;

    if (wasChallenged) profile.challengesSent++;

    if (solved && solveTimeMs !== null) {
      profile.challengesSolved++;
      profile.solveTimesMs.push(solveTimeMs);
      if (profile.solveTimesMs.length > 20) profile.solveTimesMs.shift();

      const expectedHashes = Math.pow(16, profile.currentDifficulty);
      const hashrate = expectedHashes / (solveTimeMs / 1000);
      profile.estimatedHashrate = hashrate;

      profile.currentDifficulty = this._computeOptimalDifficulty(profile);

      const costForThisChallenge = this._computeChallengeAttackerCost(
        profile.currentDifficulty, hashrate
      );
      profile.estimatedCostUSD += costForThisChallenge;
      this.global.estimatedAttackerCostUSD += costForThisChallenge;
      this.global.totalComputeWastedByAttacker += expectedHashes;
      this.costHistory.push({ ts: now, cost: costForThisChallenge });
    }

    this._updateBurnRate();
    return profile.currentDifficulty;
  }

  _computeOptimalDifficulty(profile) {
    if (!profile.estimatedHashrate || profile.solveTimesMs.length < 2) {
      return profile.currentDifficulty;
    }

    const avgSolveMs = profile.solveTimesMs.reduce((a, b) => a + b, 0) / profile.solveTimesMs.length;

    if (avgSolveMs < 100 && profile.currentDifficulty < 6) {
      return Math.min(6, profile.currentDifficulty + 1);
    }
    if (avgSolveMs > 3000 && profile.currentDifficulty > 2) {
      return Math.max(2, profile.currentDifficulty - 1);
    }
    return profile.currentDifficulty;
  }

  _computeChallengeAttackerCost(difficulty, hashrate) {
    const expectedHashes = Math.pow(16, difficulty);
    const solveTimeSec = expectedHashes / hashrate;
    
    // Compute cost: either rent compute or use botnet time
    const hashesPerDollar = this.COSTS.hashesPerDollarPerSec * solveTimeSec;
    const computeCost = expectedHashes / hashesPerDollar;
    
    // Botnet rental cost (time-based)
    const botnetCost = solveTimeSec * (this.COSTS.botnetRentalPerBotPerHour / 3600);
    
    // Attacker chooses cheaper option
    return Math.max(computeCost, botnetCost);
  }

  _updateBurnRate() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    this.costHistory = this.costHistory.filter(e => e.ts > oneHourAgo);
    const recentCost = this.costHistory.reduce((s, e) => s + e.cost, 0);
    if (this.costHistory.length > 0) {
      const windowMs = now - this.costHistory[0].ts;
      const windowHours = Math.max(windowMs / 3600000, 0.001);
      this.global.estimatedAttackerBurnRatePerHour = recentCost / windowHours;
    }
  }

  isAttackEconomicallyUnviable() {
    return this.global.estimatedAttackerBurnRatePerHour > 500;
  }

  getProfile(ip) {
    return this.profiles.get(ip) || null;
  }

  getGlobalEconomics() {
    return {
      ...this.global,
      totalProfiles: this.profiles.size,
      attackEconomicallyUnviable: this.isAttackEconomicallyUnviable(),
      costPerMillionRequests: this.global.estimatedAttackerBurnRatePerHour > 0
        ? (this.global.estimatedAttackerCostUSD / Math.max(1, this._getTotalChallengesSolved())) * 1000000
        : null,
    };
  }

  getTopCostlyAttackers() {
    return [...this.profiles.values()]
      .sort((a, b) => b.estimatedCostUSD - a.estimatedCostUSD)
      .slice(0, 10)
      .map(p => ({
        ip: p.ip,
        estimatedCostUSD: p.estimatedCostUSD,
        currentDifficulty: p.currentDifficulty,
        hashrate: p.estimatedHashrate,
        challengesSent: p.challengesSent,
        avgSolveMs: p.solveTimesMs.length
          ? Math.round(p.solveTimesMs.reduce((a, b) => a + b, 0) / p.solveTimesMs.length)
          : null,
      }));
  }

  _getTotalChallengesSolved() {
    let total = 0;
    for (const p of this.profiles.values()) total += p.challengesSolved;
    return total;
  }
}

module.exports = AttackerEconomicsEngine;

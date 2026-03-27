/**
 * Behavioral Fingerprinter
 *
 * Computes a Shannon entropy score across 7 behavioral signals per IP.
 * Low entropy = highly predictable = bot behaviour.
 * High entropy = varied, irregular = human behaviour.
 *
 * Score ranges:
 *   < 3.0  → bot
 *   < 5.5  → suspect
 *   ≥ 5.5  → human
 *
 * Signals measured:
 *   1. Inter-request timing coefficient of variation
 *   2. User-Agent character entropy
 *   3. Request path diversity
 *   4. HTTP header count consistency
 *   5. Accept-Language presence rate
 *   6. HTTP method distribution
 *   7. Request size variance
 */

class BehavioralFingerprinter {
  constructor({ botThreshold = 3.0, suspectThreshold = 5.5 } = {}) {
    this.botThreshold = botThreshold;
    this.suspectThreshold = suspectThreshold;

    // Map<ip, Profile>
    this.profiles = new Map();
  }

  /**
   * Record a request and update the profile for this IP.
   * Returns the current profile (including verdict) after recording.
   */
  record(ip, req) {
    const now = Date.now();
    let profile = this.profiles.get(ip);

    if (!profile) {
      profile = {
        ip,
        firstSeen: now,
        lastSeen: now,
        requests: [],         // last 100 request snapshots
        timestamps: [],       // last 100 arrival timestamps
        paths: new Set(),
        userAgents: new Set(),
        methods: {},
        headerCounts: [],
        acceptLanguageCount: 0,
        requestSizes: [],
        score: null,
        verdict: 'pending',
      };
      this.profiles.set(ip, profile);
    }

    // Snapshot this request
    const snapshot = {
      ts: now,
      path: req.path,
      method: req.method,
      ua: req.headers['user-agent'] || '',
      headerCount: Object.keys(req.headers).length,
      hasAcceptLanguage: !!req.headers['accept-language'],
      contentLength: parseInt(req.headers['content-length'] || '0', 10),
    };

    profile.requests.push(snapshot);
    profile.timestamps.push(now);
    if (profile.requests.length > 100) profile.requests.shift();
    if (profile.timestamps.length > 100) profile.timestamps.shift();

    profile.paths.add(req.path);
    profile.userAgents.add(snapshot.ua);
    profile.methods[req.method] = (profile.methods[req.method] || 0) + 1;
    profile.headerCounts.push(snapshot.headerCount);
    if (snapshot.hasAcceptLanguage) profile.acceptLanguageCount++;
    if (snapshot.contentLength > 0) profile.requestSizes.push(snapshot.contentLength);
    profile.lastSeen = now;

    // Only score once we have enough data
    if (profile.requests.length >= 3) {
      profile.score = this._computeScore(profile);
      profile.verdict = this._verdict(profile.score);
    }

    return profile;
  }

  // ─── Scoring ────────────────────────────────────────────────

  _computeScore(profile) {
    const signals = [
      this._timingEntropy(profile),
      this._uaEntropy(profile),
      this._pathDiversity(profile),
      this._headerConsistencyEntropy(profile),
      this._acceptLanguageRate(profile),
      this._methodEntropy(profile),
      this._requestSizeEntropy(profile),
    ];

    // Average across all signals; each is 0–1, scaled to 0–7
    const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
    return avg * 7;  // 0–7 scale to match README spec
  }

  /**
   * Signal 1: Timing coefficient of variation.
   * Bots are metronomic (low CV). Humans are irregular (high CV).
   * Returns 0 (bot) to 1 (human).
   */
  _timingEntropy(profile) {
    const ts = profile.timestamps;
    if (ts.length < 3) return 0.5;

    const gaps = [];
    for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i - 1]);

    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (mean === 0) return 0;

    const variance = gaps.reduce((s, g) => s + Math.pow(g - mean, 2), 0) / gaps.length;
    const cv = Math.sqrt(variance) / mean;

    // CV > 1.5 = very human-like, CV < 0.2 = very bot-like
    return Math.min(1, cv / 1.5);
  }

  /**
   * Signal 2: Shannon entropy of User-Agent string characters.
   * Bot UAs are often short, repetitive strings. Human UAs are complex.
   * Returns 0–1 (normalized; real UA entropy ~3.5–4.5 bits/char).
   */
  _uaEntropy(profile) {
    const ua = [...profile.userAgents][0] || '';
    if (ua.length < 4) return 0;

    const freq = {};
    for (const ch of ua) freq[ch] = (freq[ch] || 0) + 1;
    const len = ua.length;

    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    // Normalize: max realistic UA entropy ~5 bits/char
    return Math.min(1, entropy / 5);
  }

  /**
   * Signal 3: Path diversity across requests.
   * Bots often hammer one endpoint. Humans browse different pages.
   * Returns 0–1.
   */
  _pathDiversity(profile) {
    const total = profile.requests.length;
    const unique = profile.paths.size;
    if (total === 0) return 0;
    return Math.min(1, unique / Math.max(1, total * 0.5));
  }

  /**
   * Signal 4: Header count consistency (entropy of header counts).
   * Bots send identical headers every request. Humans vary slightly.
   * Returns 0–1.
   */
  _headerConsistencyEntropy(profile) {
    const counts = profile.headerCounts;
    if (counts.length < 3) return 0.5;

    const freq = {};
    for (const c of counts) freq[c] = (freq[c] || 0) + 1;
    const len = counts.length;

    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    // If all requests have identical header count, entropy = 0 (bot-like)
    // Normalize to 0–1 with max around 3 bits
    return Math.min(1, entropy / 3);
  }

  /**
   * Signal 5: Accept-Language presence rate.
   * Real browsers always send Accept-Language. Most bots don't.
   * Returns 0–1.
   */
  _acceptLanguageRate(profile) {
    const total = profile.requests.length;
    if (total === 0) return 0;
    return profile.acceptLanguageCount / total;
  }

  /**
   * Signal 6: HTTP method distribution entropy.
   * Bots are almost always pure GET. Humans mix GET/POST/etc.
   * Returns 0–1.
   */
  _methodEntropy(profile) {
    const counts = Object.values(profile.methods);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    let entropy = 0;
    for (const c of counts) {
      const p = c / total;
      entropy -= p * Math.log2(p);
    }

    // Max entropy with ~4 methods ≈ 2 bits; normalize
    return Math.min(1, entropy / 2);
  }

  /**
   * Signal 7: Request size variance.
   * Bots often send identically-sized requests. Humans vary.
   * Returns 0–1.
   */
  _requestSizeEntropy(profile) {
    const sizes = profile.requestSizes;
    if (sizes.length < 2) return 0.5;  // no body data — neutral

    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    if (mean === 0) return 0.5;

    const variance = sizes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / sizes.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.min(1, cv / 1.0);
  }

  // ─── Verdict ────────────────────────────────────────────────

  _verdict(score) {
    if (score === null) return 'pending';
    if (score < this.botThreshold) return 'bot';
    if (score < this.suspectThreshold) return 'suspect';
    return 'human';
  }

  // ─── Public API expected by server.js ───────────────────────

  getBots() {
    return [...this.profiles.values()]
      .filter(p => p.verdict === 'bot')
      .map(p => this._summary(p));
  }

  getSuspects() {
    return [...this.profiles.values()]
      .filter(p => p.verdict === 'suspect')
      .map(p => this._summary(p));
  }

  getAllProfiles() {
    return [...this.profiles.values()]
      .sort((a, b) => (a.score ?? 99) - (b.score ?? 99))
      .map(p => this._summary(p));
  }

  _summary(p) {
    return {
      ip: p.ip,
      score: p.score !== null ? Math.round(p.score * 100) / 100 : null,
      verdict: p.verdict,
      requestCount: p.requests.length,
      firstSeen: p.firstSeen,
      lastSeen: p.lastSeen,
      uniquePaths: p.paths.size,
      uniqueUAs: p.userAgents.size,
    };
  }

  /**
   * Periodic cleanup: remove profiles that haven't been seen in 10 minutes
   * and are not flagged as bots (those we keep longer).
   */
  cleanup() {
    const now = Date.now();
    const INACTIVE_TTL = 10 * 60 * 1000;  // 10 min
    const BOT_TTL = 60 * 60 * 1000;       // 1 hour for known bots

    for (const [ip, profile] of this.profiles) {
      const age = now - profile.lastSeen;
      if (profile.verdict === 'bot' && age > BOT_TTL) {
        this.profiles.delete(ip);
      } else if (profile.verdict !== 'bot' && age > INACTIVE_TTL) {
        this.profiles.delete(ip);
      }
    }
  }
}

module.exports = BehavioralFingerprinter;

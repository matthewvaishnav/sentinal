/**
 * Challenge Token System
 *
 * Issues cryptographic proof-of-work challenges to suspicious clients.
 * Client must find a nonce such that SHA-256(challenge + nonce) starts with N zero bits.
 * This is computationally cheap for a single human browser (< 1s) but
 * extremely expensive for a botnet trying to send millions of requests.
 *
 * Difficulty levels:
 *   1 = 4 leading zero bits  (~50ms browser)
 *   2 = 8 leading zero bits  (~200ms browser)
 *   3 = 12 leading zero bits (~800ms browser)
 *   4 = 16 leading zero bits (~3s browser)
 *   5 = 20 leading zero bits (~50s browser, near-human ceiling)
 */

const crypto = require('crypto');

class ChallengeTokenSystem {
  constructor({ defaultDifficulty = 2, tokenTTLMs = 300000 } = {}) {
    this.defaultDifficulty = defaultDifficulty;
    this.tokenTTLMs = tokenTTLMs;
    // Map<token, { challenge, difficulty, ip, issuedAt, solved: bool }>
    this.pending = new Map();
    // Set of solved tokens (for replay prevention)
    this.solved = new Set();
    this.stats = { issued: 0, solved: 0, failed: 0, expired: 0 };

    setInterval(() => this._cleanup(), 60000);
  }

  issue(ip, difficulty = null) {
    const diff = difficulty ?? this.defaultDifficulty;
    const zeroBits = diff * 4;  // 4 bits per difficulty level
    const challenge = crypto.randomBytes(16).toString('hex');
    const token = crypto.randomBytes(8).toString('hex');
    const issuedAt = Date.now();

    this.pending.set(token, { challenge, zeroBits, ip, issuedAt, solved: false });
    this.stats.issued++;

    return {
      token,
      challenge,
      zeroBits,
      algorithm: 'SHA-256',
      // Client-side JS to solve: find nonce where SHA256(challenge+nonce) has zeroBits leading 0s
      clientScript: this._getClientScript(challenge, zeroBits, token)
    };
  }

  verify(token, nonce) {
    if (this.solved.has(token)) {
      return { valid: false, reason: 'token_already_used' };
    }

    const entry = this.pending.get(token);
    if (!entry) {
      return { valid: false, reason: 'token_not_found' };
    }

    if (Date.now() - entry.issuedAt > this.tokenTTLMs) {
      this.pending.delete(token);
      this.stats.expired++;
      return { valid: false, reason: 'token_expired' };
    }

    // Verify the proof of work
    const hash = crypto.createHash('sha256')
      .update(entry.challenge + nonce)
      .digest('hex');

    const requiredZeroNibbles = Math.floor(entry.zeroBits / 4);
    const prefix = hash.slice(0, requiredZeroNibbles);
    const isValid = prefix === '0'.repeat(requiredZeroNibbles);

    if (isValid) {
      this.pending.delete(token);
      this.solved.add(token);
      entry.solved = true;
      this.stats.solved++;
      // Issue a session pass that lasts 10 minutes
      const pass = crypto.randomBytes(16).toString('hex');
      return { valid: true, pass, hash };
    } else {
      this.stats.failed++;
      return { valid: false, reason: 'invalid_proof', hash };
    }
  }

  // Returns a lightweight browser script the client runs to solve the challenge
  _getClientScript(challenge, zeroBits, token) {
    return `
(async function solvePOW() {
  const challenge = "${challenge}";
  const zeroBits = ${zeroBits};
  const token = "${token}";
  const requiredNibbles = Math.floor(zeroBits / 4);
  const prefix = "0".repeat(requiredNibbles);

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  let nonce = 0;
  while (true) {
    const hash = await sha256(challenge + nonce);
    if (hash.startsWith(prefix)) {
      await fetch("/sentinel/verify-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nonce: String(nonce) })
      });
      break;
    }
    nonce++;
    if (nonce % 10000 === 0) await new Promise(r => setTimeout(r, 0)); // yield
  }
})();`;
  }

  getStats() {
    return { ...this.stats, pendingCount: this.pending.size };
  }

  _cleanup() {
    const now = Date.now();
    for (const [token, entry] of this.pending) {
      if (now - entry.issuedAt > this.tokenTTLMs) {
        this.pending.delete(token);
        this.stats.expired++;
      }
    }
    // Keep solved set bounded
    if (this.solved.size > 100000) {
      const arr = [...this.solved];
      this.solved = new Set(arr.slice(arr.length - 50000));
    }
  }
}

module.exports = ChallengeTokenSystem;

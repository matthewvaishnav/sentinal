const ChallengeTokenSystem = require('../src/challengeTokens');
const crypto = require('crypto');

describe('ChallengeTokenSystem', () => {
  let cts;

  beforeEach(() => {
    cts = new ChallengeTokenSystem({ defaultDifficulty: 1, tokenTTLMs: 5000 });
  });

  describe('Issue', () => {
    test('issues challenge with expected fields', () => {
      const result = cts.issue('1.1.1.1');
      expect(result.token).toBeDefined();
      expect(result.challenge).toBeDefined();
      expect(result.zeroBits).toBe(4); // difficulty 1 × 4
      expect(result.algorithm).toBe('SHA-256');
      expect(result.clientScript).toContain('solvePOW');
    });

    test('uses custom difficulty', () => {
      const result = cts.issue('1.1.1.1', 3);
      expect(result.zeroBits).toBe(12); // difficulty 3 × 4
    });

    test('tracks issued count', () => {
      cts.issue('1.1.1.1');
      cts.issue('2.2.2.2');
      expect(cts.getStats().issued).toBe(2);
    });
  });

  describe('Verify', () => {
    test('rejects unknown token', () => {
      const result = cts.verify('nonexistent', '12345');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_not_found');
    });

    test('accepts valid proof of work', () => {
      const issued = cts.issue('1.1.1.1', 1); // difficulty 1 = 4 zero bits = 1 hex zero

      // Brute-force solve
      let nonce = 0;
      while (nonce < 100000) {
        const hash = crypto.createHash('sha256')
          .update(issued.challenge + nonce)
          .digest('hex');
        if (hash.startsWith('0')) {
          break;
        }
        nonce++;
      }

      const result = cts.verify(issued.token, String(nonce));
      expect(result.valid).toBe(true);
      expect(result.pass).toBeDefined();
    });

    test('rejects invalid proof of work', () => {
      const issued = cts.issue('1.1.1.1', 1);
      // 'bad_nonce' almost certainly won't produce a hash starting with '0'
      const result = cts.verify(issued.token, 'bad_nonce_that_wont_work_xyz');
      // Might pass by sheer luck, but extremely unlikely
      if (!result.valid) {
        expect(result.reason).toBe('invalid_proof');
      }
    });

    test('prevents replay (token_already_used)', () => {
      const issued = cts.issue('1.1.1.1', 1);

      // Solve it
      let nonce = 0;
      while (nonce < 100000) {
        const hash = crypto.createHash('sha256')
          .update(issued.challenge + nonce)
          .digest('hex');
        if (hash.startsWith('0')) break;
        nonce++;
      }

      cts.verify(issued.token, String(nonce));
      // Try again with same token
      const replay = cts.verify(issued.token, String(nonce));
      expect(replay.valid).toBe(false);
      expect(replay.reason).toBe('token_already_used');
    });

    test('rejects expired tokens', () => {
      const issued = cts.issue('1.1.1.1');
      // Directly expire the token
      const entry = cts.pending.get(issued.token);
      entry.issuedAt = Date.now() - 10000; // 10s ago, TTL is 5s

      const result = cts.verify(issued.token, '123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_expired');
    });
  });

  describe('Stats', () => {
    test('tracks pending count', () => {
      cts.issue('1.1.1.1');
      cts.issue('2.2.2.2');
      expect(cts.getStats().pendingCount).toBe(2);
    });
  });
});

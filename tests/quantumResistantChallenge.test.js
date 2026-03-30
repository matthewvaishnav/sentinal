const QuantumResistantChallenge = require('../src/quantumResistantChallenge');

describe('QuantumResistantChallenge', () => {
  let qrc;

  beforeEach(() => {
    qrc = new QuantumResistantChallenge();
  });

  describe('Issue', () => {
    test('issues a challenge with expected fields', () => {
      const result = qrc.issue('1.1.1.1', 2);
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(32);
      expect(result.challenge).toBeDefined();
      expect(Array.isArray(result.challenge)).toBe(true);
      expect(result.challenge.length).toBe(32);
      expect(result.algorithm).toBe('NTRU-Lattice-PoW');
      expect(result.target).toBeDefined();
      expect(result.modulus).toBe(2053);
      expect(result.complexity).toBeGreaterThan(0);
    });

    test('tracks issued count', () => {
      qrc.issue('1.1.1.1');
      qrc.issue('2.2.2.2');
      expect(qrc.getStats().issued).toBe(2);
    });

    test('different challenges produce different tokens', () => {
      const a = qrc.issue('1.1.1.1');
      const b = qrc.issue('1.1.1.1');
      expect(a.token).not.toBe(b.token);
    });
  });

  describe('Verify', () => {
    test('rejects unknown token', () => {
      const result = qrc.verify('nonexistent_token', [1, 0, -1]);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_not_found');
    });

    test('rejects null solution', () => {
      const { token } = qrc.issue('1.1.1.1');
      const result = qrc.verify(token, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_solution');
    });

    test('rejects non-array solution', () => {
      const { token } = qrc.issue('1.1.1.1');
      const result = qrc.verify(token, 'just a string');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_solution');
    });

    test('rejects empty array', () => {
      const { token } = qrc.issue('1.1.1.1');
      const result = qrc.verify(token, []);
      expect(result.valid).toBe(false);
    });

    test('rejects wrong-length solution', () => {
      const { token } = qrc.issue('1.1.1.1', 2);
      const result = qrc.verify(token, [1, 0, -1]); // too short
      expect(result.valid).toBe(false);
    });

    test('rejects values outside {-1, 0, 1}', () => {
      const issued = qrc.issue('1.1.1.1', 1);
      // Build solution with correct length but invalid values
      const badSolution = new Array(256 + 64).fill(5);
      const result = qrc.verify(issued.token, badSolution);
      expect(result.valid).toBe(false);
    });

    test('rejects all-zero solution', () => {
      const issued = qrc.issue('1.1.1.1', 1);
      const dim = 256 + 64; // difficulty 1
      const allZeros = new Array(dim).fill(0);
      const result = qrc.verify(issued.token, allZeros);
      expect(result.valid).toBe(false);
    });

    test('accepts the private key as valid solution (it satisfies the equation)', () => {
      // The private key is the actual solution since target is computed from it
      // We need to access internals for this test
      const issued = qrc.issue('1.1.1.1', 1);
      const challenge = qrc.challenges.get(issued.token);
      const result = qrc.verify(issued.token, challenge.privateKey);
      expect(result.valid).toBe(true);
    });

    test('deletes challenge after successful verification', () => {
      const issued = qrc.issue('1.1.1.1', 1);
      const challenge = qrc.challenges.get(issued.token);
      const solution = [...challenge.privateKey];
      qrc.verify(issued.token, solution);
      // Second verify should fail with token_not_found
      const result = qrc.verify(issued.token, solution);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('token_not_found');
    });

    test('tracks solved and failed counts', () => {
      const issued = qrc.issue('1.1.1.1', 1);
      const challenge = qrc.challenges.get(issued.token);

      // Fail first
      qrc.verify(issued.token, [1, 0, -1, 0]);
      expect(qrc.getStats().failed).toBe(1);

      // Solve
      qrc.verify(issued.token, challenge.privateKey);
      expect(qrc.getStats().solved).toBe(1);
    });
  });
});

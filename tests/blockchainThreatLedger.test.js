const BlockchainThreatLedger = require('../src/blockchainThreatLedger');

describe('BlockchainThreatLedger', () => {
  let ledger;

  beforeEach(() => {
    ledger = new BlockchainThreatLedger();
  });

  describe('Genesis Block', () => {
    test('initializes with genesis block', () => {
      const chain = ledger.exportChain();
      expect(chain.length).toBe(1);
      expect(chain[0].index).toBe(0);
      expect(chain[0].previousHash).toBe('0');
    });

    test('chain is valid at start', () => {
      expect(ledger.validateChain()).toBe(true);
    });
  });

  describe('Threat Submission', () => {
    test('submitThreat adds to pending threats', () => {
      ledger.submitThreat('1.1.1.1', { verdict: 'bot', severity: 3 });
      const stats = ledger.getChainStats();
      expect(stats.pendingThreats).toBe(1);
      expect(stats.threatsShared).toBe(1);
    });

    test('submitted threats include signature', () => {
      const threat = ledger.submitThreat('2.2.2.2', { verdict: 'bot', severity: 2 });
      expect(threat.signature).toBeDefined();
      expect(threat.signature.length).toBe(16);
      expect(threat.reporter).toBe(ledger.nodeId);
    });
  });

  describe('Mining', () => {
    test('mineBlock returns null when no pending threats', () => {
      expect(ledger.mineBlock()).toBeNull();
    });

    test('mineBlock creates new block from pending threats', () => {
      ledger.submitThreat('1.1.1.1', { verdict: 'bot', severity: 2 });
      ledger.submitThreat('2.2.2.2', { verdict: 'bot', severity: 3 });

      const block = ledger.mineBlock();
      expect(block).toBeDefined();
      expect(block.index).toBe(1);
      expect(block.threats.length).toBe(2);
      expect(block.hash).toBeDefined();
    });

    test('clears pending after mining', () => {
      ledger.submitThreat('1.1.1.1', { verdict: 'bot', severity: 1 });
      ledger.mineBlock();
      expect(ledger.getChainStats().pendingThreats).toBe(0);
    });

    test('chain remains valid after mining', () => {
      ledger.submitThreat('1.1.1.1', { verdict: 'bot', severity: 2 });
      ledger.mineBlock();
      ledger.submitThreat('2.2.2.2', { verdict: 'bot', severity: 3 });
      ledger.mineBlock();
      expect(ledger.validateChain()).toBe(true);
    });

    test('blocks link via previousHash', () => {
      ledger.submitThreat('1.1.1.1', { verdict: 'bot', severity: 1 });
      ledger.mineBlock();
      const chain = ledger.exportChain();
      expect(chain[1].previousHash).toBe(chain[0].hash);
    });
  });

  describe('Consensus', () => {
    test('processes threats into globalThreats on mining', () => {
      ledger.submitThreat('3.3.3.3', { verdict: 'bot', severity: 3 });
      ledger.mineBlock();
      const consensus = ledger.getThreatConsensus('3.3.3.3');
      expect(consensus.reports).toBe(1);
      expect(consensus.consensus).toBeGreaterThan(0);
    });

    test('threat becomes verified when consensus threshold met', () => {
      // Reporter has reputation 1.0, threshold is 0.6
      ledger.submitThreat('4.4.4.4', { verdict: 'bot', severity: 5 });
      ledger.mineBlock();
      expect(ledger.isVerifiedThreat('4.4.4.4')).toBe(true);
    });
  });

  describe('Threat Reception', () => {
    test('rejects threats with invalid signature', () => {
      const threat = {
        ip: '5.5.5.5',
        evidence: { verdict: 'bot', severity: 2 },
        reporter: 'fake-node',
        signature: 'invalid_signature'
      };
      const result = ledger.receiveThreat(threat, 'fake-node');
      expect(result.accepted).toBe(false);
      expect(result.reason).toBe('invalid_signature');
    });

    test('accepts threats with valid signature', () => {
      // Create threat with correct signature
      const fromNode = 'external-node';
      const ip = '6.6.6.6';
      const evidence = { verdict: 'bot', severity: 3 };
      const crypto = require('crypto');
      const data = `${ip}${JSON.stringify(evidence)}${fromNode}`;
      const sig = crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);

      const threat = { ip, evidence, reporter: fromNode, signature: sig };
      const result = ledger.receiveThreat(threat, fromNode);
      expect(result.accepted).toBe(true);
    });
  });

  describe('Reputation', () => {
    test('node starts with reputation 1.0', () => {
      const stats = ledger.getChainStats();
      expect(stats.nodeReputation).toBe(1.0);
    });
  });

  describe('Chain Stats', () => {
    test('returns comprehensive stats', () => {
      const stats = ledger.getChainStats();
      expect(stats).toHaveProperty('blocksMined');
      expect(stats).toHaveProperty('chainLength');
      expect(stats).toHaveProperty('pendingThreats');
      expect(stats).toHaveProperty('globalThreats');
      expect(stats).toHaveProperty('verifiedThreats');
    });
  });
});

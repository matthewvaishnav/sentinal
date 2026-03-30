const GossipManager = require('../src/p2p/gossip');
const BlockchainThreatLedger = require('../src/blockchainThreatLedger');

describe('GossipManager', () => {
  let ledger1, gossip1;
  let ledger2, gossip2;

  beforeEach(async () => {
    ledger1 = new BlockchainThreatLedger({ nodeId: 'node1' });
    gossip1 = new GossipManager({
      nodeId: 'node1',
      serverPort: 5001,
      threatLedger: ledger1
    });

    ledger2 = new BlockchainThreatLedger({ nodeId: 'node2' });
    gossip2 = new GossipManager({
      nodeId: 'node2',
      serverPort: 5002,
      threatLedger: ledger2,
      peers: ['ws://localhost:5001']
    });

    gossip1.start();
    gossip2.start();

    // Give some time for connection
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterEach(() => {
    gossip1.stop();
    gossip2.stop();
  });

  afterAll(async () => {
    // Give the OS a moment to release ports between tests/runs.
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  test('nodes should connect to each other', () => {
    // Note: gossip2 connects to gossip1
    expect(gossip2.connections.size).toBeGreaterThanOrEqual(1);
  });

  test('threats should propagate from node1 to node2', (done) => {
    const threat = { ip: '9.9.9.9', evidence: { type: 'manual_block' } };
    
    // Ledger2 should receive the threat via gossip
    const originalReceive = ledger2.receiveThreat;
    ledger2.receiveThreat = (receivedThreat, sender) => {
      expect(receivedThreat.ip).toBe(threat.ip);
      expect(sender).toBe('node1');
      done();
      return { accepted: true };
    };

    gossip1.broadcast({
      type: 'THREAT',
      payload: threat,
      sender: 'node1'
    });
  });

  test('blocks should propagate across the mesh', (done) => {
    const block = { index: 1, hash: 'abc', threats: [] };
    
    // We can't easily mock the internal state change without more hooks,
    // but we can verify the broadcast reaches the other side.
    gossip2._handleMessage = (message) => {
      if (message.type === 'BLOCK') {
        expect(message.payload.index).toBe(1);
        done();
      }
    };

    gossip1.broadcast({
       type: 'BLOCK',
       payload: block,
       sender: 'node1'
    });
  });
});

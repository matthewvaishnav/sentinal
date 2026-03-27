const BehavioralFingerprinter = require('../src/fingerprinter');

describe('BehavioralFingerprinter', () => {
  let fingerprinter;
  
  beforeEach(() => {
    fingerprinter = new BehavioralFingerprinter({
      botThreshold: 3.0,
      suspectThreshold: 5.5
    });
  });
  
  describe('record() and getVerdict()', () => {
    test('identifies obvious bot (low entropy)', () => {
      const botRequest = {
        headers: {
          'user-agent': 'Bot',
          'accept': '*/*'
        },
        method: 'GET',
        path: '/api/users/1',
        body: {}
      };
      
      // Record multiple identical requests
      for (let i = 0; i < 10; i++) {
        fingerprinter.record('1.2.3.4', botRequest);
      }
      
      const verdict = fingerprinter.getVerdict('1.2.3.4');
      expect(verdict.verdict).toBe('bot');
      expect(verdict.score).toBeLessThan(3.0);
    });
    
    test('identifies human (high entropy)', () => {
      const humanRequests = [
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'accept': 'text/html,application/xhtml+xml',
            'accept-language': 'en-US,en;q=0.9'
          },
          method: 'GET',
          path: '/home',
          body: {}
        },
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9'
          },
          method: 'POST',
          path: '/api/login',
          body: { username: 'test', password: 'pass' }
        },
        {
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'accept': 'image/png',
            'accept-language': 'en-US,en;q=0.9'
          },
          method: 'GET',
          path: '/assets/logo.png',
          body: {}
        }
      ];
      
      // Record varied human-like requests
      humanRequests.forEach(req => {
        fingerprinter.record('2.3.4.5', req);
        // Add some delay between requests
      });
      
      const verdict = fingerprinter.getVerdict('2.3.4.5');
      expect(verdict.verdict).toBe('human');
      expect(verdict.score).toBeGreaterThan(5.5);
    });
    
    test('identifies suspect (medium entropy)', () => {
      const suspectRequest = {
        headers: {
          'user-agent': 'Python-requests/2.28.0',
          'accept': '*/*'
        },
        method: 'GET',
        path: '/api/data',
        body: {}
      };
      
      for (let i = 0; i < 5; i++) {
        fingerprinter.record('3.4.5.6', suspectRequest);
      }
      
      const verdict = fingerprinter.getVerdict('3.4.5.6');
      expect(verdict.verdict).toBe('suspect');
      expect(verdict.score).toBeGreaterThanOrEqual(3.0);
      expect(verdict.score).toBeLessThan(5.5);
    });
  });
  
  describe('getAllProfiles()', () => {
    test('returns all tracked profiles', () => {
      fingerprinter.record('1.2.3.4', { headers: {}, method: 'GET', path: '/', body: {} });
      fingerprinter.record('5.6.7.8', { headers: {}, method: 'GET', path: '/', body: {} });
      
      const profiles = fingerprinter.getAllProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('entropy calculations', () => {
    test('calculates timing entropy correctly', () => {
      const req = { headers: {}, method: 'GET', path: '/', body: {} };
      
      // Regular intervals (low entropy)
      for (let i = 0; i < 10; i++) {
        fingerprinter.record('1.2.3.4', req);
      }
      
      const profile = fingerprinter.getAllProfiles().find(p => p.ip === '1.2.3.4');
      expect(profile.signals.timingCV).toBeDefined();
    });
    
    test('calculates path diversity correctly', () => {
      const paths = ['/page1', '/page2', '/page3', '/page4', '/page5'];
      
      paths.forEach(path => {
        fingerprinter.record('1.2.3.4', {
          headers: {},
          method: 'GET',
          path,
          body: {}
        });
      });
      
      const profile = fingerprinter.getAllProfiles().find(p => p.ip === '1.2.3.4');
      expect(profile.signals.pathDiversity).toBeGreaterThan(0);
    });
  });
});

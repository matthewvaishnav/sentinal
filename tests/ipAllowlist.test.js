const IPAllowlist = require('../src/ipAllowlist');

describe('IPAllowlist', () => {
  describe('Direct IP matching', () => {
    test('allows configured IPs', () => {
      const al = new IPAllowlist({ allowedIPs: ['1.2.3.4', '5.6.7.8'] });
      expect(al.isAllowed('1.2.3.4')).toBe(true);
      expect(al.isAllowed('5.6.7.8')).toBe(true);
    });

    test('rejects non-allowed IPs', () => {
      const al = new IPAllowlist({ allowedIPs: ['1.2.3.4'] });
      expect(al.isAllowed('9.9.9.9')).toBe(false);
    });

    test('add() works', () => {
      const al = new IPAllowlist();
      expect(al.isAllowed('10.0.0.1')).toBe(false);
      al.add('10.0.0.1');
      expect(al.isAllowed('10.0.0.1')).toBe(true);
    });

    test('remove() works', () => {
      const al = new IPAllowlist({ allowedIPs: ['10.0.0.1'] });
      al.remove('10.0.0.1');
      expect(al.isAllowed('10.0.0.1')).toBe(false);
    });
  });

  describe('CIDR matching', () => {
    test('matches IPs in CIDR range', () => {
      const al = new IPAllowlist({ allowedCIDRs: ['10.0.0.0/8'] });
      expect(al.isAllowed('10.0.0.1')).toBe(true);
      expect(al.isAllowed('10.255.255.255')).toBe(true);
      expect(al.isAllowed('11.0.0.1')).toBe(false);
    });

    test('handles /24 CIDR', () => {
      const al = new IPAllowlist({ allowedCIDRs: ['192.168.1.0/24'] });
      expect(al.isAllowed('192.168.1.1')).toBe(true);
      expect(al.isAllowed('192.168.1.254')).toBe(true);
      expect(al.isAllowed('192.168.2.1')).toBe(false);
    });

    test('handles /32 CIDR (single IP)', () => {
      const al = new IPAllowlist({ allowedCIDRs: ['192.168.1.100/32'] });
      expect(al.isAllowed('192.168.1.100')).toBe(true);
      expect(al.isAllowed('192.168.1.101')).toBe(false);
    });

    test('addCIDR() works', () => {
      const al = new IPAllowlist();
      al.addCIDR('172.16.0.0/12');
      expect(al.isAllowed('172.16.0.1')).toBe(true);
      expect(al.isAllowed('172.31.255.254')).toBe(true);
      expect(al.isAllowed('172.32.0.1')).toBe(false);
    });

    test('rejects invalid CIDR', () => {
      const al = new IPAllowlist({ allowedCIDRs: ['invalid/33'] });
      expect(al.isAllowed('1.1.1.1')).toBe(false);
    });
  });

  describe('IPv6 handling', () => {
    test('skips IPv6 addresses for CIDR (returns false)', () => {
      const al = new IPAllowlist({ allowedCIDRs: ['10.0.0.0/8'] });
      expect(al.isAllowed('::1')).toBe(false);
    });

    test('allows IPv6 as direct IP match', () => {
      const al = new IPAllowlist({ allowedIPs: ['::1'] });
      expect(al.isAllowed('::1')).toBe(true);
    });
  });

  describe('getAll', () => {
    test('returns all IPs and CIDRs', () => {
      const al = new IPAllowlist({
        allowedIPs: ['1.1.1.1'],
        allowedCIDRs: ['10.0.0.0/8']
      });
      const all = al.getAll();
      expect(all.ips).toEqual(['1.1.1.1']);
      expect(all.cidrs).toEqual(['10.0.0.0/8']);
    });
  });
});

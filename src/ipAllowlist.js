/**
 * IP Allowlist Manager
 * 
 * Maintains a list of known-good IPs that should bypass certain checks.
 * Useful for:
 *   - Internal monitoring systems
 *   - Known API clients
 *   - Admin IPs
 *   - Load balancer health checks
 */

class IPAllowlist {
  constructor({ allowedIPs = [], allowedCIDRs = [] } = {}) {
    this.allowedIPs = new Set(allowedIPs);
    this.allowedCIDRs = allowedCIDRs.map(cidr => this._parseCIDR(cidr));
  }

  isAllowed(ip) {
    // Direct match
    if (this.allowedIPs.has(ip)) return true;

    // CIDR range match
    const ipNum = this._ipToNumber(ip);
    if (ipNum === null) return false;

    for (const { network, mask } of this.allowedCIDRs) {
      if ((ipNum & mask) === network) return true;
    }

    return false;
  }

  add(ip) {
    this.allowedIPs.add(ip);
  }

  remove(ip) {
    this.allowedIPs.delete(ip);
  }

  addCIDR(cidr) {
    const parsed = this._parseCIDR(cidr);
    if (parsed) this.allowedCIDRs.push(parsed);
  }

  getAll() {
    return {
      ips: [...this.allowedIPs],
      cidrs: this.allowedCIDRs.map(c => c.original),
    };
  }

  _parseCIDR(cidr) {
    const [ip, bits] = cidr.split('/');
    const bitsNum = parseInt(bits, 10);
    
    if (!ip || isNaN(bitsNum) || bitsNum < 0 || bitsNum > 32) {
      return null;
    }

    const network = this._ipToNumber(ip);
    if (network === null) return null;

    const mask = (0xffffffff << (32 - bitsNum)) >>> 0;
    
    return {
      original: cidr,
      network: network & mask,
      mask,
    };
  }

  _ipToNumber(ip) {
    // Only handle IPv4 for now
    if (ip.includes(':')) return null; // Skip IPv6

    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    let num = 0;
    for (let i = 0; i < 4; i++) {
      const part = parseInt(parts[i], 10);
      if (isNaN(part) || part < 0 || part > 255) return null;
      num = (num << 8) | part;
    }
    return num >>> 0;
  }
}

module.exports = IPAllowlist;

/**
 * Honeypot Manager (Enhanced with Adaptive Trap Generation)
 *
 * Generates a set of synthetic "trap" endpoints that are:
 *   - Never linked from any real page or response
 *   - Never indexed by search engines (robots.txt exclusion)
 *   - Injected as invisible links into HTML responses (hidden via CSS)
 *     so that only automated scrapers/crawlers following all links will find them
 *
 * ENHANCEMENTS (Issue 2.2):
 *   - Dynamic decoy generation (realistic-looking endpoints)
 *   - Custom traps based on observed attacker behavior
 *   - Adaptive rotation based on trap effectiveness
 *   - Pattern learning from scanning attempts
 *
 * Any IP that accesses a honeypot is with near-certainty a bot.
 * The only false positive scenario: a human manually typing random URLs.
 */

const crypto = require('crypto');
const eventBus = require('./eventBus');

class HoneypotManager {
  constructor({ trapCount = 32, rotateIntervalMs = 3600000, realRoutes = [] } = {}) {
    this.trapCount = trapCount;
    this.rotateIntervalMs = rotateIntervalMs;
    this.realRoutes = realRoutes; // Real application routes for decoy generation
    this.traps = new Set();
    this.caughtIPs = new Map(); // ip -> { paths: [], timestamps: [], count: number }
    this.stats = { totalHits: 0, uniqueIPs: 0, rotations: 0 };
    
    // NEW: Track scanning patterns for adaptive trap generation
    this.scanningPatterns = new Map(); // pattern -> { count, ips: Set, lastSeen }
    this.trapEffectiveness = new Map(); // trap -> { hits, uniqueIPs, lastHit }
    this.recentScans = []; // Recent non-trap paths accessed (for pattern learning)

    this._generateTraps();
    // Rotate traps periodically to catch bots that cache path lists
    setInterval(() => this._rotateTraps(), rotateIntervalMs);
  }

  _generateTraps() {
    this.traps.clear();
    
    // Mix of three trap types for comprehensive coverage
    const decoys = this._generateDecoys();      // Realistic-looking endpoints
    const obvious = this._generateObvious();    // Known scanner targets
    const custom = this._generateCustom();      // Based on observed behavior
    
    const allTraps = [...decoys, ...obvious, ...custom];
    
    // Add traps up to trapCount, prioritizing by effectiveness
    const sortedTraps = this._prioritizeTraps(allTraps);
    sortedTraps.slice(0, this.trapCount).forEach(trap => this.traps.add(trap));
    
    eventBus.logEvent('INFO', `Generated ${this.traps.size} honeypot traps (${decoys.length} decoys, ${obvious.length} obvious, ${custom.length} custom)`);
  }

  /**
   * Generate decoy traps that look like real endpoints
   * These catch sophisticated bots that avoid obvious scanner paths
   */
  _generateDecoys() {
    const decoys = [];
    
    // If we have real routes, generate similar-looking fakes
    if (this.realRoutes.length > 0) {
      for (const route of this.realRoutes) {
        // Add admin/internal/debug variants
        decoys.push(`${route}/admin`);
        decoys.push(`${route}/internal`);
        decoys.push(`${route}/debug`);
        decoys.push(`${route.replace('/api/', '/api/v2/')}`);
        
        // Add common parameter variations
        if (route.includes('/')) {
          const parts = route.split('/').filter(p => p);
          if (parts.length > 1) {
            decoys.push(`/${parts[0]}/admin/${parts[parts.length - 1]}`);
          }
        }
      }
    }
    
    // Generic realistic-looking API endpoints
    const apiVersions = ['v1', 'v2', 'v3', 'internal', 'admin'];
    const resources = ['users', 'posts', 'comments', 'settings', 'config', 'data'];
    const actions = ['export', 'import', 'backup', 'restore', 'debug', 'test'];
    
    for (let i = 0; i < 10; i++) {
      const version = apiVersions[Math.floor(Math.random() * apiVersions.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      decoys.push(`/api/${version}/${resource}`);
      decoys.push(`/api/${resource}/${action}`);
      decoys.push(`/${resource}/${action}`);
    }
    
    return [...new Set(decoys)]; // Remove duplicates
  }

  /**
   * Generate obvious traps for common scanner targets
   * These catch unsophisticated bots and script kiddies
   */
  _generateObvious() {
    const obvious = [
      // Environment files
      '/.env',
      '/.env.local',
      '/.env.production',
      '/.env.backup',
      
      // Git files
      '/.git/config',
      '/.git/HEAD',
      '/.gitignore',
      
      // WordPress
      '/wp-admin/admin-ajax.php',
      '/wp-login.php',
      '/wp-content/plugins',
      '/xmlrpc.php',
      
      // PHP admin panels
      '/phpmyadmin/index.php',
      '/phpMyAdmin/index.php',
      '/pma/index.php',
      
      // Config files
      '/config.json',
      '/config.yml',
      '/config.php',
      '/configuration.php',
      
      // Backup files
      '/backup.sql',
      '/backup.zip',
      '/database.sql',
      
      // Common admin paths
      '/admin/login',
      '/administrator',
      '/admin/config',
      '/admin/dashboard',
      
      // API documentation (often exposed accidentally)
      '/api/docs',
      '/api/swagger',
      '/api/graphql',
      
      // Debug endpoints
      '/debug',
      '/test',
      '/_debug',
      '/console',
    ];
    
    return obvious;
  }

  /**
   * Generate custom traps based on observed attacker behavior
   * This is the adaptive component that learns from scanning patterns
   */
  _generateCustom() {
    const custom = [];
    
    // Analyze recent scanning patterns
    const patterns = this._analyzePatterns();
    
    for (const pattern of patterns) {
      // Generate variations of observed patterns
      if (pattern.type === 'sequential_id') {
        // /users/1, /users/2 → /users/admin, /users/root
        custom.push(pattern.base.replace(/\d+$/, 'admin'));
        custom.push(pattern.base.replace(/\d+$/, 'root'));
        custom.push(pattern.base.replace(/\d+$/, 'internal'));
      }
      
      if (pattern.type === 'path_enumeration') {
        // Observed: /api/users, /api/posts → Generate: /api/secrets, /api/keys
        const parts = pattern.base.split('/').filter(p => p);
        if (parts.length >= 2) {
          custom.push(`/${parts[0]}/secrets`);
          custom.push(`/${parts[0]}/keys`);
          custom.push(`/${parts[0]}/tokens`);
          custom.push(`/${parts[0]}/credentials`);
        }
      }
      
      if (pattern.type === 'extension_scan') {
        // Observed: /config.json, /config.yml → Generate: /config.bak, /config.old
        const base = pattern.base.replace(/\.[^.]+$/, '');
        custom.push(`${base}.bak`);
        custom.push(`${base}.old`);
        custom.push(`${base}.backup`);
        custom.push(`${base}.orig`);
      }
    }
    
    // Generate traps based on most frequently scanned patterns
    const topPatterns = [...this.scanningPatterns.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    for (const [pattern, data] of topPatterns) {
      // Create honeypot variations of frequently scanned paths
      custom.push(`${pattern}/admin`);
      custom.push(`${pattern}/internal`);
      custom.push(`${pattern}/.backup`);
    }
    
    return [...new Set(custom)]; // Remove duplicates
  }

  /**
   * Analyze recent scanning attempts to identify patterns
   */
  _analyzePatterns() {
    const patterns = [];
    
    // Look for sequential ID scanning
    const pathGroups = new Map();
    for (const scan of this.recentScans.slice(-100)) {
      const base = scan.path.replace(/\d+/g, 'N');
      if (!pathGroups.has(base)) {
        pathGroups.set(base, []);
      }
      pathGroups.get(base).push(scan.path);
    }
    
    for (const [base, paths] of pathGroups) {
      if (paths.length >= 3 && base.includes('N')) {
        patterns.push({ type: 'sequential_id', base: base.replace('N', ''), paths });
      }
    }
    
    // Look for path enumeration (same prefix, different resources)
    const prefixGroups = new Map();
    for (const scan of this.recentScans.slice(-100)) {
      const parts = scan.path.split('/').filter(p => p);
      if (parts.length >= 2) {
        const prefix = `/${parts[0]}`;
        if (!prefixGroups.has(prefix)) {
          prefixGroups.set(prefix, new Set());
        }
        prefixGroups.get(prefix).add(scan.path);
      }
    }
    
    for (const [prefix, paths] of prefixGroups) {
      if (paths.size >= 4) {
        patterns.push({ type: 'path_enumeration', base: prefix, paths: [...paths] });
      }
    }
    
    // Look for extension scanning (same base, different extensions)
    const baseGroups = new Map();
    for (const scan of this.recentScans.slice(-100)) {
      const base = scan.path.replace(/\.[^.]+$/, '');
      if (base !== scan.path) { // Has extension
        if (!baseGroups.has(base)) {
          baseGroups.set(base, []);
        }
        baseGroups.get(base).push(scan.path);
      }
    }
    
    for (const [base, paths] of baseGroups) {
      if (paths.length >= 3) {
        patterns.push({ type: 'extension_scan', base, paths });
      }
    }
    
    return patterns;
  }

  /**
   * Prioritize traps based on effectiveness
   */
  _prioritizeTraps(traps) {
    return traps.sort((a, b) => {
      const aEff = this.trapEffectiveness.get(a);
      const bEff = this.trapEffectiveness.get(b);
      
      // Prioritize traps that have caught IPs before
      if (aEff && !bEff) return -1;
      if (!aEff && bEff) return 1;
      if (aEff && bEff) {
        // More unique IPs = more effective
        return bEff.uniqueIPs - aEff.uniqueIPs;
      }
      
      // New traps get random priority
      return Math.random() - 0.5;
    });
  }

  _rotateTraps() {
    // Adaptive rotation: keep effective traps, rotate ineffective ones
    const effectiveTraps = [];
    const ineffectiveTraps = [];
    
    for (const trap of this.traps) {
      const eff = this.trapEffectiveness.get(trap);
      if (eff && eff.hits > 0) {
        effectiveTraps.push(trap);
      } else {
        ineffectiveTraps.push(trap);
      }
    }
    
    // Keep 70% of effective traps, rotate 30% + all ineffective
    const keepCount = Math.floor(effectiveTraps.length * 0.7);
    const keep = effectiveTraps.slice(0, keepCount);
    
    this.traps.clear();
    keep.forEach(t => this.traps.add(t));
    
    // Generate new traps to fill remaining slots
    this._generateTraps();
    
    this.stats.rotations++;
    eventBus.logEvent('INFO', `Rotated honeypots: kept ${keep.length} effective traps, generated ${this.traps.size - keep.length} new traps`);
  }

  _rand(len) {
    return crypto.randomBytes(len).toString('hex').slice(0, len);
  }

  isTrap(path) {
    // Exact match or starts-with for dynamic trap prefixes
    if (this.traps.has(path)) return true;
    // Check common scanner patterns regardless of rotation
    const scannerPatterns = [
      /^\/.env(\.|$)/,
      /^\/.git\//,
      /^\/wp-admin\//,
      /^\/phpmyadmin\//,
      /^\/\.well-known\/evil/,
    ];
    return scannerPatterns.some(p => p.test(path));
  }

  recordHit(ip, path, req) {
    const now = Date.now();
    if (!this.caughtIPs.has(ip)) {
      this.caughtIPs.set(ip, {
        paths: [],
        timestamps: [],
        count: 0,
        ua: req.headers['user-agent'] || 'unknown',
        firstSeen: now
      });
      this.stats.uniqueIPs++;
    }
    const entry = this.caughtIPs.get(ip);
    entry.paths.push(path);
    entry.timestamps.push(now);
    entry.count++;
    entry.lastSeen = now;
    this.stats.totalHits++;
    
    // Update trap effectiveness
    if (!this.trapEffectiveness.has(path)) {
      this.trapEffectiveness.set(path, { hits: 0, uniqueIPs: new Set(), lastHit: 0 });
    }
    const trapEff = this.trapEffectiveness.get(path);
    trapEff.hits++;
    trapEff.uniqueIPs.add(ip);
    trapEff.lastHit = now;
    
    return entry;
  }

  /**
   * Record a non-trap path access for pattern learning
   * Call this from middleware for legitimate paths
   */
  recordScan(ip, path, req) {
    const now = Date.now();
    
    // Add to recent scans for pattern analysis
    this.recentScans.push({ ip, path, timestamp: now, ua: req.headers['user-agent'] });
    
    // Keep only last 500 scans
    if (this.recentScans.length > 500) {
      this.recentScans.shift();
    }
    
    // Track scanning patterns
    const pattern = this._extractPattern(path);
    if (pattern) {
      if (!this.scanningPatterns.has(pattern)) {
        this.scanningPatterns.set(pattern, { count: 0, ips: new Set(), lastSeen: 0 });
      }
      const patternData = this.scanningPatterns.get(pattern);
      patternData.count++;
      patternData.ips.add(ip);
      patternData.lastSeen = now;
    }
  }

  /**
   * Extract pattern from path for learning
   */
  _extractPattern(path) {
    // Normalize IDs to detect sequential scanning
    let pattern = path.replace(/\d+/g, 'N');
    
    // Normalize UUIDs
    pattern = pattern.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID');
    
    // Normalize hashes
    pattern = pattern.replace(/[0-9a-f]{32,64}/gi, 'HASH');
    
    return pattern;
  }

  isCaught(ip) {
    return this.caughtIPs.has(ip);
  }

  getInjectableHTML() {
    // Returns hidden HTML to inject into real pages.
    // Real users don't follow these (invisible). Link-crawling bots do.
    
    // Mix decoys and obvious traps in injected links
    const decoyTraps = [...this.traps].filter(t => 
      t.includes('/api/') || t.includes('/admin') || t.includes('/internal')
    ).slice(0, 3);
    
    const obviousTraps = [...this.traps].filter(t => 
      t.includes('.env') || t.includes('.git') || t.includes('wp-')
    ).slice(0, 2);
    
    const selectedTraps = [...decoyTraps, ...obviousTraps].slice(0, 5);
    
    const links = selectedTraps.map(path =>
      `<a href="${path}" style="display:none;visibility:hidden;opacity:0;position:absolute;left:-9999px" tabindex="-1" aria-hidden="true"></a>`
    ).join('\n');
    return `<!-- sentinel-traps -->\n${links}\n<!-- /sentinel-traps -->`;
  }

  getAllCaught() {
    const result = [];
    for (const [ip, entry] of this.caughtIPs) {
      result.push({ ip, ...entry });
    }
    return result.sort((a, b) => b.count - a.count);
  }

  getTrapPaths() {
    return [...this.traps];
  }

  getStats() {
    return { 
      ...this.stats, 
      activeTrapCount: this.traps.size, 
      caughtCount: this.caughtIPs.size,
      patternsLearned: this.scanningPatterns.size,
      recentScans: this.recentScans.length
    };
  }
  
  /**
   * Get trap effectiveness metrics
   */
  getTrapEffectiveness() {
    const effectiveness = [];
    for (const [trap, data] of this.trapEffectiveness) {
      effectiveness.push({
        trap,
        hits: data.hits,
        uniqueIPs: data.uniqueIPs.size,
        lastHit: data.lastHit
      });
    }
    return effectiveness.sort((a, b) => b.uniqueIPs - a.uniqueIPs);
  }
  
  /**
   * Get learned scanning patterns
   */
  getScanningPatterns() {
    const patterns = [];
    for (const [pattern, data] of this.scanningPatterns) {
      patterns.push({
        pattern,
        count: data.count,
        uniqueIPs: data.ips.size,
        lastSeen: data.lastSeen
      });
    }
    return patterns.sort((a, b) => b.count - a.count);
  }
}

module.exports = HoneypotManager;

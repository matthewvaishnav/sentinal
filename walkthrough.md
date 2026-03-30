# SENTINEL Walkthrough (Hardened Architecture Blueprint)

This walkthrough is a guided, end-to-end “how it works” tour of SENTINEL’s **production-hardened** architecture.

## 1) Request lifecycle (high-level)

SENTINEL sits in front of your application routes as a middleware pipeline:

1. **Client request arrives**
2. **Client IP extraction** (respects trusted proxies when configured)
3. **Allowlist gate** (known-good IPs/CIDRs bypass protection)
4. **Honeypot trap evaluation** (adaptive traps for scanners/bots)
5. **Sliding-window rate limiting** (per-IP, exponential backoff on block duration)
6. **Behavioral fingerprinting** (entropy-based signals → bot/suspect/human)
7. **Contagion graph similarity** (cluster distributed bots that evade per-IP limits)
8. **Challenge issuance** (PoW / quantum-resistant variants, adaptive difficulty)
9. **Economics engine escalation** (targets attacker burn-rate thresholds)
10. **Decision + telemetry** (allow / throttle / challenge / block; metrics + logs)

## 2) Key components (what each “layer” does)

### IP allowlist
- Purpose: Don’t slow down trusted infrastructure.
- Output: Immediate pass-through when matched.

### Adaptive honeypots
- Purpose: Catch scanners and recon early using decoys and high-signal endpoints.
- Output: Elevated suspicion + telemetry events.

### Rate limiter (sliding window + backoff)
- Purpose: Stop naive floods cheaply, before deeper analysis.
- Output: Throttle/block decisions; feeds state into higher-level detectors.

### Behavioral fingerprinter
- Purpose: Classify clients using entropy across multiple request signals.
- Output: A compact behavior vector + verdict (bot/suspect/human).

### Contagion graph
- Purpose: Detect distributed botnets by **behavioral similarity**, not IP volume alone.
- Output: Suspicion propagation; cluster-level risk scoring.

### Challenge system (classic + quantum-resistant)
- Purpose: Convert abuse into attacker cost (computational work).
- Output: Verifiable tokens/solutions; adaptive difficulty knobs.

### Attacker economics engine
- Purpose: Raise costs until attacks become economically irrational.
- Output: Difficulty recommendations + burn-rate estimates.

### Threat ledger / decentralized sharing (optional)
- Purpose: Preserve an auditable record of blocking/threat events; enable sharing models.
- Output: Immutable(ish) record for later validation/analytics.

## 3) Operations: observability and safety

### Metrics
- Prometheus metrics surface system health, attack intensity, and protection actions.

### Structured logs
- JSON logs record key security events (blocks, honeypots, challenges, etc.).

### Health checks and graceful shutdown
- Health endpoints provide readiness-style signals.
- Shutdown path persists critical state to reduce “cold start” vulnerability windows.

## 4) How to demo quickly

1. Start the server:
   - `node server.js`
2. Open the dashboard:
   - `http://localhost:3000/dashboard`
3. Run traffic simulations:
   - `node scripts/simulate.js --mode=flood`
   - `node scripts/simulate.js --mode=scanner`
   - `node scripts/simulate.js --mode=botnet`

## 5) Where to go deeper

- Full spec: `docs/TECHNICAL_DOCUMENTATION.md`
- Validation: `docs/TEST_VALIDATION_REPORT.md`
- Roadmap: `docs/IMPROVEMENTS_ROADMAP.md`


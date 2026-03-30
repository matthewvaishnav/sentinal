## Security Policy

SENTINEL is a defensive security project. This document explains how to report vulnerabilities, what deployments are in-scope, and what “secure by default” means for this repository.

### Reporting a vulnerability

- **Do not open a public issue** for suspected security vulnerabilities.
- Send a report to **`security@matthewvaishnav.com`** (or, if you prefer, open a GitHub private security advisory if enabled for the repo).
- Include: affected version/commit, reproduction steps, impact, and any suggested fix.

### Supported versions

This repository currently supports the **latest `master` branch**. If you are running an older commit, reproduce on `master` before reporting.

### Threat model (high-level)

SENTINEL is designed to sit in front of an HTTP application and mitigate:

- **Volumetric HTTP floods** (high request rate)
- **Scanner/recon activity** (honeypot triggers)
- **Bot-like automation** (behavioral fingerprinting)
- **Distributed low-and-slow attacks** (contagion graph similarity)

Out of scope (by default):

- L3/L4 network DDoS (SYN floods, UDP amplification) — use infrastructure protections (CDN/WAF/LB)
- Compromised host / supply-chain compromise of the machine running SENTINEL

### Deployment security notes

- **Trusted proxies**: Only trust `X-Forwarded-For` when requests originate from configured trusted proxy IPs.
- **Admin endpoints**: Admin actions require `X-Sentinel-API-Key`. As of current code, admin middleware **fails closed** until `SENTINEL_API_KEYS` is configured.
- **Dashboard CSP**: The demo dashboard may relax certain browser protections for local usability. If deploying publicly, harden browser headers (CSP) and serve behind HTTPS.

### Coordinated disclosure

If you provide a clear report with reproduction steps, we will:

- Acknowledge receipt within a reasonable time
- Work with you on a coordinated disclosure timeline
- Credit you in release notes if you want attribution


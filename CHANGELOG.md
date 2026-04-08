# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Test Timer Cleanup** - Fixed Jest test hangs caused by active timers that persisted after test completion
  - Moved `miningTimer` and `metricsTimer` initialization from module load to `server.start()` function
  - Added `.unref()` calls to all timers to prevent blocking process exit
  - Registered all timers with graceful shutdown manager for proper cleanup
  - Added test cleanup hooks in `honeypot.test.js`, `csrfProtection.test.js`, `challengeTokens.test.js`, and `integration.test.js`
  - All 159 tests now pass cleanly without open handle warnings
  - See `.kiro/specs/test-timer-cleanup/` for full bugfix documentation

### Added
- **Configurable Trusted Proxies** - Added `TRUSTED_PROXIES` environment variable to support CDN/load balancer IPs
- **CSP Production Toggle** - Added `ENABLE_CSP` environment variable to enable Content Security Policy headers in production
- **Enhanced Benchmark Script** - Improved `scripts/benchmark.js` with formatted output showing throughput, error rates, and latency statistics
- **Neural Model Persistence** - Added automatic model save/load functionality to persist trained neural network weights across restarts

### Changed
- **Documentation Accuracy** - Updated `docs/AWARD_SUBMISSION.md` and `docs/TEST_VALIDATION_REPORT.md` with accurate test counts and honest capability assessments
- Removed inflated performance claims in favor of verifiable metrics

## Format
This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

# Test Timer Cleanup Bugfix Design

## Overview

This bugfix addresses Jest test hangs caused by active timers that persist after test completion. Multiple modules (ChallengeTokenSystem, CSRFProtection, HoneypotManager, BehavioralContagionGraph) create `setInterval` timers in their constructors. When server.js is imported by tests, these singletons are instantiated and timers start immediately, preventing the Node.js process from exiting cleanly.

The fix moves timer initialization from module import time to server startup time, adds `.unref()` to all timers so they don't prevent process exit, and ensures proper cleanup in both test teardown and graceful shutdown.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when tests import server.js and timers remain active after test completion
- **Property (P)**: The desired behavior - timers should only start when server.start() is called and should be properly cleaned up
- **Preservation**: Production server behavior (timer creation, metrics collection, blockchain mining) must remain unchanged
- **miningTimer**: The setInterval timer in server.js that mines blockchain blocks every 30 seconds
- **metricsTimer**: The setInterval timer in server.js that collects system metrics every 10 seconds
- **Module Timers**: Background timers created by ChallengeTokenSystem, CSRFProtection, HoneypotManager, and BehavioralContagionGraph for cleanup operations
- **Open Handle**: A Node.js resource (timer, socket, file descriptor) that prevents the process from exiting

## Bug Details

### Bug Condition

The bug manifests when test files import server.js, causing timers to be created at module load time rather than server start time. These timers remain active after tests complete, preventing Jest from exiting cleanly.

**Formal Specification:**
```
FUNCTION isBugCondition(context)
  INPUT: context of type { isTest: boolean, serverImported: boolean, timersActive: boolean }
  OUTPUT: boolean
  
  RETURN context.isTest == true
         AND context.serverImported == true
         AND context.timersActive == true
         AND testExecutionComplete()
END FUNCTION
```

### Examples

- **Test Import**: When `tests/integration.test.js` imports server.js, miningTimer and metricsTimer are created immediately, even though the server is never started
- **Test Completion**: After all tests pass, Jest detects open handles (the active timers) and produces warnings: "Jest did not exit one second after the test run has completed"
- **CI/CD Hang**: In CI/CD pipelines, the test process hangs for 30+ seconds waiting for timers to fire, then times out
- **Module Timers**: ChallengeTokenSystem creates `_cleanupTimer`, CSRFProtection creates `_cleanupInterval`, HoneypotManager creates `_rotateTimer`, and BehavioralContagionGraph creates `cleanupInterval` - all at construction time

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Production server startup must continue to create and start miningTimer and metricsTimer
- Blockchain mining must continue to occur every 30 seconds in production
- Metrics collection must continue to occur every 10 seconds in production
- Graceful shutdown must continue to clean up all resources properly
- Module cleanup methods (close(), stop()) must continue to work correctly

**Scope:**
All production server behavior should be completely unaffected by this fix. This includes:
- Server startup sequence and timer initialization
- Background job execution (mining, metrics, cleanup)
- Graceful shutdown and resource cleanup
- Module lifecycle management

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Timer Creation at Module Load**: The miningTimer and metricsTimer in server.js are created at the module level (outside the start() function), so they execute immediately when server.js is imported by any test file

2. **Missing .unref() Calls**: Timers don't have `.unref()` called on them, which means they keep the Node.js event loop active and prevent the process from exiting

3. **Incomplete Test Cleanup**: Test files don't call cleanup methods (close(), stop()) on timer-based modules after tests complete

4. **Graceful Shutdown Gap**: The gracefulShutdown.js module clears miningTimer and metricsTimer, but doesn't clean up timers from ChallengeTokenSystem, CSRFProtection, HoneypotManager, or BehavioralContagionGraph

## Correctness Properties

Property 1: Bug Condition - Timers Only Start When Server Starts

_For any_ test execution where server.js is imported but server.start() is not called, the fixed code SHALL NOT create miningTimer or metricsTimer, and the process SHALL exit cleanly after tests complete without any open handle warnings.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Production Server Behavior

_For any_ production server startup where server.start() is called (require.main === module), the fixed code SHALL create miningTimer and metricsTimer exactly as before, mining blocks every 30 seconds and collecting metrics every 10 seconds.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Based on the root cause analysis, the following changes were implemented:

**File**: `server.js`

**Function**: Module-level code and `start()` function

**Specific Changes**:
1. **Move Timer Initialization**: Move `miningTimer` and `metricsTimer` creation from module level into the `start()` function so they only execute when the server actually starts
   - Change from: `const miningTimer = setInterval(...)` at module level
   - Change to: `let miningTimer = null` at module level, then `miningTimer = setInterval(...)` inside `start()`

2. **Add .unref() Calls**: Add `.unref()` to all timers so they don't prevent process exit
   - `miningTimer.unref?.()`
   - `metricsTimer.unref?.()`

3. **Register Timers with Shutdown Manager**: Pass miningTimer and metricsTimer to shutdownManager.registerComponents() so they can be cleaned up during graceful shutdown

**File**: `src/gracefulShutdown.js`

**Function**: `closeResources()`

**Specific Changes**:
4. **Add Timer Cleanup**: Add cleanup for all module timers in the closeResources() method
   - Clear miningTimer and metricsTimer (already implemented)
   - Call `challenges.close()` to clear ChallengeTokenSystem._cleanupTimer
   - Clear `csrfProtection._cleanupInterval` directly (CSRFProtection doesn't have a close() method)
   - Call `honeypots.close()` to clear HoneypotManager._rotateTimer
   - Call `contagionGraph.stop()` to clear BehavioralContagionGraph.cleanupInterval

**File**: `tests/integration.test.js`

**Function**: `afterAll()` hook

**Specific Changes**:
5. **Add Test Cleanup**: Add afterAll() hook to clean up all timer-based modules
   - Call `honeypots.close()` if honeypots exists
   - Call `challenges.close()` if challenges exists
   - Call `contagionGraph.stop()` if contagionGraph exists
   - Clear `csrfProtection._cleanupInterval` if csrfProtection exists

**Files**: `tests/honeypot.test.js`, `tests/csrfProtection.test.js`, `tests/challengeTokens.test.js`

**Specific Changes**:
6. **Add Individual Test Cleanup**: Add afterEach() hooks to clean up module instances after each test
   - `honeypot.test.js`: `afterEach(() => honeypot.close())`
   - `csrfProtection.test.js`: `afterEach(() => clearInterval(csrf._cleanupInterval))`
   - `challengeTokens.test.js`: `afterEach(() => cts.close())`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, verify the bug exists on unfixed code by observing Jest warnings and process hangs, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis by observing Jest warnings and process hangs.

**Test Plan**: Run the existing test suite on UNFIXED code and observe:
1. Jest warnings about open handles
2. Process failing to exit after tests complete
3. CI/CD pipeline timeouts

**Test Cases**:
1. **Integration Test Import**: Run `npm test tests/integration.test.js` on unfixed code (will show open handle warnings)
2. **All Tests**: Run `npm test` on unfixed code (will show warnings and may hang)
3. **Individual Module Tests**: Run tests for honeypot, csrf, challenges on unfixed code (will show warnings if no cleanup)
4. **CI/CD Simulation**: Run tests with timeout in CI environment (will timeout on unfixed code)

**Expected Counterexamples**:
- Jest warning: "Jest did not exit one second after the test run has completed"
- Process hangs for 30+ seconds after tests complete
- Possible causes: timers created at module load, missing .unref(), missing cleanup in tests

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (tests importing server.js), the fixed function produces the expected behavior (clean exit, no warnings).

**Pseudocode:**
```
FOR ALL testFile WHERE testFile imports server.js DO
  result := runTests(testFile)
  ASSERT result.exitedCleanly == true
  ASSERT result.openHandleWarnings == 0
  ASSERT result.executionTime < 5 seconds
END FOR
```

**Test Plan**: Run all tests with the fix applied and verify:
1. No Jest warnings about open handles
2. Process exits immediately after tests complete
3. All 159 tests pass
4. Test execution completes in reasonable time (< 5 seconds)

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (production server startup), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL serverStartup WHERE require.main === module DO
  ASSERT miningTimer is created
  ASSERT metricsTimer is created
  ASSERT blockchain mining occurs every 30 seconds
  ASSERT metrics collection occurs every 10 seconds
  ASSERT graceful shutdown cleans up all timers
END FOR
```

**Testing Approach**: Property-based testing is not applicable here since we're testing server lifecycle behavior. Instead, use manual testing and integration tests.

**Test Plan**: Manually start the production server and verify:
1. Server starts successfully
2. Blockchain mining occurs every 30 seconds (check logs)
3. Metrics collection occurs every 10 seconds (check logs)
4. Graceful shutdown (SIGTERM) cleans up all resources
5. No regression in server functionality

**Test Cases**:
1. **Production Startup**: Start server with `node server.js` and verify timers are created and running
2. **Mining Verification**: Observe logs for "Mining block" messages every 30 seconds
3. **Metrics Verification**: Observe logs for metrics updates every 10 seconds
4. **Graceful Shutdown**: Send SIGTERM and verify all timers are cleared and process exits cleanly
5. **Module Lifecycle**: Verify all module cleanup methods (close(), stop()) still work correctly

### Unit Tests

- Test that miningTimer and metricsTimer are null when server.js is imported but not started
- Test that miningTimer and metricsTimer are created when start() is called
- Test that all module cleanup methods (close(), stop()) clear their respective timers
- Test that gracefulShutdown.closeResources() clears all timers

### Property-Based Tests

Property-based testing is not applicable for this bugfix since we're testing deterministic lifecycle behavior (timer creation and cleanup) rather than input/output transformations.

### Integration Tests

- Run full test suite and verify no Jest warnings about open handles
- Run tests in CI/CD environment and verify no timeouts
- Start production server and verify all timers are created and running
- Trigger graceful shutdown and verify all timers are cleaned up
- Verify all 159 tests pass with the fix applied

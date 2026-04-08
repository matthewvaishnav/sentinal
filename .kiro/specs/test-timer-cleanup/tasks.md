# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Timers Only Start When Server Starts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when tests import server.js but don't call start(), no timers are created
  - Test that Jest exits cleanly without open handle warnings
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: Jest warnings "Jest did not exit one second after the test run has completed", process hangs for 30+ seconds
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Production Server Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for production server startup
  - Verify miningTimer and metricsTimer are created when server.start() is called
  - Verify blockchain mining occurs every 30 seconds
  - Verify metrics collection occurs every 10 seconds
  - Verify graceful shutdown cleans up all resources
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for test timer cleanup

  - [x] 3.1 Implement timer initialization changes in server.js
    - Move miningTimer and metricsTimer creation from module level into start() function
    - Change from `const miningTimer = setInterval(...)` at module level to `let miningTimer = null` at module level, then `miningTimer = setInterval(...)` inside start()
    - Add .unref() calls to miningTimer and metricsTimer
    - Register timers with shutdownManager.registerComponents()
    - _Bug_Condition: isBugCondition(context) where context.isTest == true AND context.serverImported == true AND context.timersActive == true_
    - _Expected_Behavior: Timers only created when start() is called, process exits cleanly after tests_
    - _Preservation: Production server continues to create timers and mine blocks every 30 seconds, collect metrics every 10 seconds_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x] 3.2 Add timer cleanup in gracefulShutdown.js
    - Add cleanup for all module timers in closeResources() method
    - Call challenges.close() to clear ChallengeTokenSystem._cleanupTimer
    - Clear csrfProtection._cleanupInterval directly
    - Call honeypots.close() to clear HoneypotManager._rotateTimer
    - Call contagionGraph.stop() to clear BehavioralContagionGraph.cleanupInterval
    - _Bug_Condition: isBugCondition(context) where timers remain active after shutdown_
    - _Expected_Behavior: All timers cleared during graceful shutdown_
    - _Preservation: Graceful shutdown continues to clean up all resources properly_
    - _Requirements: 2.2, 3.3_

  - [x] 3.3 Add test cleanup in integration.test.js
    - Add afterAll() hook to clean up all timer-based modules
    - Call honeypots.close() if honeypots exists
    - Call challenges.close() if challenges exists
    - Call contagionGraph.stop() if contagionGraph exists
    - Clear csrfProtection._cleanupInterval if csrfProtection exists
    - _Bug_Condition: isBugCondition(context) where timers remain active after tests complete_
    - _Expected_Behavior: All timers cleared in test teardown_
    - _Preservation: Tests continue to run correctly_
    - _Requirements: 1.2, 2.2, 2.3_

  - [x] 3.4 Add individual test cleanup
    - Add afterEach() hook in honeypot.test.js: `afterEach(() => honeypot.close())`
    - Add afterEach() hook in csrfProtection.test.js: `afterEach(() => clearInterval(csrf._cleanupInterval))`
    - Add afterEach() hook in challengeTokens.test.js: `afterEach(() => cts.close())`
    - _Bug_Condition: isBugCondition(context) where module timers remain active after individual tests_
    - _Expected_Behavior: Module timers cleared after each test_
    - _Preservation: Individual tests continue to run correctly_
    - _Requirements: 1.2, 2.2, 2.3_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Timers Only Start When Server Starts
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verified: All 159 tests pass, no Jest warnings, process exits cleanly
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Production Server Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verified: Production server behavior unchanged, all timers work correctly
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - All 159 tests pass
  - No Jest warnings about open handles
  - Process exits cleanly after tests complete
  - Production server behavior preserved

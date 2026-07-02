# Hybrid Controls Per-State Parity Checkpoints

Date: 2026-07-02
Status: PASS

## START Checkpoint

Expected controls:
1. startGame

Evidence:
1. START action rendered from hybrid controls host in browser smoke tests.
2. Clicking `startGame` transitions container state to `PLAYING`.

Validation references:
1. `tests/smoke.integration.spec.js`
2. `tests/smoke.regression.spec.js`

Result: PASS

## PLAYING Checkpoint

Expected controls:
1. jump
2. cycleLeft (ability-gated)
3. useAbility (ability-gated)
4. cycleRight (ability-gated)

Evidence:
1. `jump` is visible and dispatches canonical input action.
2. Ability controls are hidden when no ability exists and shown when an ability exists.

Validation references:
1. `js/systems/HybridControlsBar.test.js`
2. `tests/smoke.regression.spec.js`

Result: PASS

## GAMEOVER Checkpoint

Expected controls:
1. retryGame

Evidence:
1. Forcing game over transitions state to `GAMEOVER`.
2. `retryGame` action is rendered and available in controls host.

Validation references:
1. `tests/smoke.regression.spec.js`

Result: PASS

## Suite Summary

1. `npm test`: PASS
2. `npm run test:unit`: PASS (10 suites, 89 tests)
3. `npm run test:integration`: PASS (3 tests)
4. `npm run test:regression`: PASS (1 test)

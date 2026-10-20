# AGENT HANDOFF — Game Findings (Deferred)
Status: DEFERRED / READ BEFORE ANY GAME CHANGE
Updated: 2026-10-20
Scope: UnicornSideScrollAdventure, main branch

## Current direction
Prioritize **Grade Space**, the parent-managed educational experience. Do not refactor, extend, or otherwise modify game logic, game storage, game UI, game profile handling, or game tests as part of Grade Space implementation unless a separately approved change explicitly requires it. Keep existing game entry and behavior intact wherever feasible. Any future landing-page change must preserve a direct working route to the existing game.

## Evidence-backed findings
1. **Documentation drift in test coverage.** `CLAUDE.md` says Playwright integration/regression testing matches zero specifications. Actual repository directory `tests/` contains `smoke.integration.spec.js`, `hazards.integration.spec.js`, and `smoke.regression.spec.js`; `playwright.config.js` points to `./tests` and matches these suffixes. The existence of specs is verified; their passing status has NOT been verified by execution. `docs/testing_and_ci.md` describes these tests, contradicting the older claim in `CLAUDE.md`.
2. **Two different local persistence abstractions.** `js/systems/Storage.js` exports a singleton that prefixes keys `unicorn_magic_run_v1_` and envelopes saved data with version, timestamp, and payload. `js/systems/StorageManager.js` provides a separate class with its own default namespace (`unicorn_magical_run_v1`) and saves raw JSON values. Do not conflate/migrate these without targeted audit.
3. **Game-specific local data and profile contracts.** `js/ProfileSchemas.js` defines character and level authoring schemas. `js/factories/PlayerFactory.js` and `js/systems/LevelSystem.js` consume game local storage. Grade Space should neither reuse these game keys nor put educational submissions in either game storage abstraction.
4. **Established runtime boundaries.** `index.html` loads `js/main.js`, which loads config/assets then creates `Game`. `js/Game.js` coordinates `GameLoop`, `StateController`, input, rendering, entities, scoring and systems. Avoid introducing educational logic into `Game.js`, `Config.js`, the global game event bus, or entity registry.
5. **Known UI risk.** `CLAUDE.md` warns that the game LogOverlay can obstruct compact/mobile UI. Verify visually if game navigation is touched, but do not modify it under this educational workstream.

## Agent guardrails
- No gameplay refactors, fixes, reward integration, or education-to-game coupling in current scope.
- No educational code importing game runtime modules; no game modules importing education modules.
- Do not rewrite `index.html` as a first step without securing a safe game route and baseline.
- Add education code under a distinct namespace/module hierarchy and use distinct persistence/auth contracts.
- Before any later game-related change, run and record `npm test`, `npm run test:unit`, `npm run test:integration`, and `npm run test:regression`, including any environment limitations; do not claim test passes without execution.
- Limit future cross-domain communication to a deliberate, versioned interface reviewed separately.

## Active delivery: Grade Space
First slice: parent authors/publishes 10-question assignment; student opens, saves, submits; parent reviews exact answers and feedback across devices. Support grade-neutral subjects/skills and versioned assignment snapshots. Enforce authenticated parent access, child-safe participation, server-side ownership checks, and isolation from game local storage. Favor modular monolith over services proliferation.

## Evidence files
- `CLAUDE.md`
- `docs/testing_and_ci.md`
- `playwright.config.js` and `tests/*.spec.js`
- `js/systems/Storage.js`, `js/systems/StorageManager.js`
- `js/ProfileSchemas.js`
- `js/factories/PlayerFactory.js`, `js/systems/LevelSystem.js`
- `index.html`, `js/main.js`, `js/Game.js`

No tests were executed in creating this note. No runtime behavior was modified.

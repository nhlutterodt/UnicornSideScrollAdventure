# Testing & CI

This project has no build step and no ESLint — quality is enforced through a mix of custom Node scripts (style/import correctness) and a Jest + Playwright test suite, wired into GitHub Actions.

## The Three Test Layers

### 1. Unit tests (Jest)

- Config: [`jest.config.js`](../jest.config.js) — `testEnvironment: 'jest-environment-jsdom'`, `testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)']`. `moduleNameMapper` strips `.js` extensions from relative imports so Jest can resolve this project's ESM-style `import ... from './Foo.js'` paths.
- Run: `npm run test:unit` — this runs `node --experimental-vm-modules node_modules/jest/bin/jest.js`. The `--experimental-vm-modules` flag is required because the project is `"type": "module"` and Jest's native ESM support is still experimental.
- Location: tests are **co-located next to source files**, not in a separate directory. Test files:
  - `js/systems/ScoreManager.test.js` — score/high-score tracking and event emission.
  - `js/systems/InputBuffer.test.js` — the generic timer-buffer utility behind coyote time and jump buffering (see [Architecture: Input Forgiveness](architecture.md#input-forgiveness-jssystemsinputbufferjs)).
  - `js/systems/LevelSystem.test.js` — the difficulty-ramp math (`levelUp()`, `_updateRamp()`) added for eased level-up transitions (see [Architecture: Safe Start & Difficulty Ramp](architecture.md#safe-start--difficulty-ramp)). Seeds `Config.STAGES = Config.FALLBACK.STAGES` before constructing `LevelSystem`, since `updateStage()` reads `Config.STAGES` directly and nothing in a unit test calls `Config.loadExternalConfig()` to populate it.
  - `js/systems/FeedbackSystem.test.js` — hit-stop/shake timer and intensity-scaling logic (see [Architecture: Impact Feedback](architecture.md#impact-feedback-jssystemsfeedbacksystemjs)).
  - `js/core/EntityPool.test.js` — the per-class object pool backing entity spawning (identity reuse, revive() correctness, double-release guard).
  - `js/systems/RenderSystem.test.js` — the registry-version-driven draw-order cache (no re-sort/reallocation when nothing spawned/despawned).
  - `js/systems/CollisionSystem.test.js` — the O(n²) collision entity-count budget warning (edge-triggered, not spammed every frame).
  - `js/ProfileSchemas.test.js` — schema defaults, valid/invalid data round-trips, malformed JSON, unknown fields, version migration, profile wrapping/unwrapping, and character/level profile creation. 34 tests covering both character and level schemas.

**`ScoreManager.test.js`'s test-isolation bug is fixed.** It previously had 3 known-failing tests because its `captureEvents()` helper (called in `beforeEach`) monkey-patched `eventManager.emit`, but `restoreEvents()` (called in `afterEach`) only reset the `capturedEvents` object — it never restored the original `emit`. Since `eventManager` is a singleton, each test's `beforeEach` wrapped whatever the *previous* test already wrapped, so by the 3rd+ test a single `addPoints()` call fired through several stacked wrapper layers, inflating the captured-event counts. The fix: `captureEvents()`/`restoreEvents()` now capture the true original `emit` once, at module scope, before any test runs, and restore to that same reference — not to whatever the previous test left behind. All 26 tests in the file pass.

### 2. Integration tests (Playwright)

- Config: [`playwright.config.js`](../playwright.config.js) — `testDir: './tests'`, project `integration` matches `*.integration.spec.js`, runs against Desktop Chrome, `baseURL: http://localhost:8081`. A `webServer` block runs `python -m http.server 8081` and waits for it to respond before tests start, and tears it down after — `reuseExistingServer: !process.env.CI` means it reuses a server you already have running locally, but always starts a fresh one in CI. This means `npm run test:integration`/`test:regression` no longer require a server to be started manually first, in CI or locally.
- Run: `npm run test:integration`.
- Spec: `tests/smoke.integration.spec.js` — page loads with no console/page errors, the canvas actually paints pixels (not just "exists in the DOM" — polls via `page.waitForFunction` since the first paint happens inside `GameLoop`'s `requestAnimationFrame` loop, which only starts once `Game.init()` finishes), and starting a run flips `#gameContainer`'s `data-state` to `PLAYING` with no errors.

**This closes a real (not just hygienic) gap**: before this spec existed, `npm run test:integration` failed outright with `Error: No tests found` (exit code 1) — confirmed by running it directly — meaning the "blocking" integration step in CI was likely already red on `main`, not silently passing. `playwright.config.js` was added pointing at `./tests` in the same commit that introduced the CI pipeline, but the directory and specs were never committed until now.

### 3. Regression/visual tests (Playwright)

- Same `playwright.config.js`, project `regression` matches `*.regression.spec.js` (also under `./tests`).
- Run: `npm run test:regression`.
- In CI this step is deliberately **non-blocking** (see below). No `*.regression.spec.js` files exist yet — visual regression baselines are a separate, larger effort than the smoke coverage added above, so `test:regression` still fails locally with "No tests found"; only the `|| echo ...` fallback in CI keeps it from failing the build.

## Custom Standards/Lint Scripts (`scripts/`)

Plain Node ES modules, no ESLint involved. **These were CommonJS (`require`/`module.exports`/`__dirname`) until recently, which crashed immediately with `ReferenceError: require is not defined in ES module scope`** since `package.json` declares `"type": "module"` — meaning `npm test` did not run at all, for anyone, regardless of `node_modules` state. They've since been converted to proper ESM (`import`, `fileURLToPath(import.meta.url)` in place of `__dirname`, `export` in place of `module.exports`), so `npm test` now actually executes.

| Script | npm script | Checks |
|---|---|---|
| `scripts/standard-checker.js` | `test:standards` (aliased as `lint`) | Inline `style=`/`on*=`/`<script>`/`<style>`, direct `.style.x =` assignment, raw `localStorage.*` calls, `console.log/info/debug`, `onCollision` missing its `context` param, empty `catch` blocks. Has a per-file ignore list for the modules that implement these rules (e.g. `Storage.js`, `Logger.js`). |
| `scripts/import-export-checker.js` | `test:imports` | Cross-validates every import against the actual exports of its target file — catches imports of non-existent files, default-vs-named mismatches, and case-mismatched named imports. |
| `scripts/identifier-usage-checker.js` | `test:identifiers` | Catches identifier casing mismatches between how something was imported and how it's used (e.g. `logger` imported but `Logger.x()` called). |
| `scripts/escape-sequence-checker.js` | `test:escape` | Detects literal `\n`/`\t`/`\r` left as text instead of real characters — a common code-generation artifact. |
| `scripts/console-checker.js` | `test:console` | Simpler duplicate of the console-usage rule in `standard-checker.js`. **Not included in `npm test` and not run in CI** — invoke manually if needed. |
| `scripts/init-diagnostics.js` | *(none)* | Not a check at all — a browser-console diagnostic snippet for inspecting live game state (`window.game`, `Config`, registry, event manager). Paste into DevTools; not wired into any npm script. |

`npm test` chains `standard-checker → import-export-checker → identifier-usage-checker → escape-sequence-checker`, stopping at the first failure. See [AI Quality Protocol](ai_quality_protocol.md) for the reasoning behind each rule and [Coding Standards](coding_standards.md) for the underlying style guide.

**Current state**: `npm test` passes cleanly (all 4 checkers). The two pre-existing baseline failures (`js/powers-test-main.js:158` and `js/systems/AudioSystem.js:283` — empty catch blocks) have been fixed by restructuring the catch blocks to use `ErrorHandler.handle()` and `logger.warn()` respectively, with the body on the same line as the `catch` to satisfy the checker's regex.

**These now run in CI as a blocking step** (see the pipeline below) — previously they were enforced only by convention (the AI Quality Protocol's "run `npm test` after every modification"), not by CI itself.

## CI Pipeline (`.github/workflows/ci.yml`)

- **Name**: "CI Testing Pipeline"
- **Triggers**: `push` to `main`, and `pull_request` targeting `main`. No `workflow_dispatch`, no other branches.
- **Job** `test` on `ubuntu-latest`, steps in order:
  1. Checkout (`actions/checkout@v4`)
  2. Setup Node 20 with npm cache (`actions/setup-node@v4`)
  3. `npm ci || npm install`
  4. `npm test` — **blocking** (standards/lint checkers; runs before browser install so a style failure fails fast and cheap)
  5. `npx playwright install --with-deps`
  6. `npm run test:unit` — **blocking**
  7. `npm run test:integration` — **blocking**, and now has a real spec (`tests/smoke.integration.spec.js`) backing it instead of failing on "no tests found". Playwright's `webServer` config starts `python -m http.server 8081` itself and waits for it to be ready — the pipeline no longer has separate "Start Game Server" / "Wait for server" steps.
  8. `npm run test:regression` — **non-blocking**, explicitly suffixed with `|| echo "Visual regression tests encountered an issue (baseline may be missing). Continuing."`

**What actually blocks a PR today**: standards/lint checks, unit tests, and integration tests. Regression tests cannot fail the build (no baselines exist yet).

## Running Everything Locally

```bash
npm run test:unit          # Jest unit tests
npm run test:integration   # Playwright integration tests (tests/smoke.integration.spec.js) - auto-starts/stops the static server
npm run test:regression    # Playwright regression tests (needs tests/*.regression.spec.js - none yet) - auto-starts/stops the static server
npm test                   # standards + imports + identifiers + escape-sequence checks
npm run test:console       # console.* usage check (not part of `npm test` or CI)
```

Both Playwright commands now manage the static file server themselves via `playwright.config.js`'s `webServer` option — no need to run `python -m http.server 8081` manually first.

## Related Docs

- [AI Quality Protocol](ai_quality_protocol.md) — the deterministic checklist these scripts enforce, and why each rule exists. Predates the Jest/Playwright/CI setup, so it doesn't mention this page yet.
- [Coding Standards](coding_standards.md) — the underlying style guide.
- [Architecture](architecture.md) — where the tested modules (`ScoreManager`, `InputBuffer`, `LevelSystem`, `FeedbackSystem`, `EntityPool`, `RenderSystem`, `CollisionSystem`) fit into the engine.

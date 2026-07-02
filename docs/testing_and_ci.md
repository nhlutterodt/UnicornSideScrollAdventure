# Testing & CI

This project has no build step and no ESLint — quality is enforced through a mix of custom Node scripts (style/import correctness) and a Jest + Playwright test suite, wired into GitHub Actions.

## The Three Test Layers

### 1. Unit tests (Jest)

- Config: [`jest.config.js`](../jest.config.js) — `testEnvironment: 'jest-environment-jsdom'`, `testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)']`. `moduleNameMapper` strips `.js` extensions from relative imports so Jest can resolve this project's ESM-style `import ... from './Foo.js'` paths.
- Run: `npm run test:unit` — this runs `node --experimental-vm-modules node_modules/jest/bin/jest.js`. The `--experimental-vm-modules` flag is required because the project is `"type": "module"` and Jest's native ESM support is still experimental.
- Location: tests are **co-located next to source files**, not in a separate directory. Four unit test files exist:
  - `js/systems/ScoreManager.test.js` — score/high-score tracking and event emission. **Has 3 known-failing tests** (see "Known Issues" below) — the bug is in the test file's own event-mocking helper, not in `ScoreManager.js` itself.
  - `js/systems/InputBuffer.test.js` — the generic timer-buffer utility behind coyote time and jump buffering (see [Architecture: Input Forgiveness](architecture.md#input-forgiveness-jssystemsinputbufferjs)).
  - `js/systems/LevelSystem.test.js` — the difficulty-ramp math (`levelUp()`, `_updateRamp()`) added for eased level-up transitions (see [Architecture: Safe Start & Difficulty Ramp](architecture.md#safe-start--difficulty-ramp)). Seeds `Config.STAGES = Config.FALLBACK.STAGES` before constructing `LevelSystem`, since `updateStage()` reads `Config.STAGES` directly and nothing in a unit test calls `Config.loadExternalConfig()` to populate it.
  - `js/systems/FeedbackSystem.test.js` — hit-stop/shake timer and intensity-scaling logic (see [Architecture: Impact Feedback](architecture.md#impact-feedback-jssystemsfeedbacksystemjs)).

#### Known Issues

**`ScoreManager.test.js` has a pre-existing test-isolation bug** (3 of its tests fail as a result — `addPoints()`'s `emits SCORE_CHANGED event with correct payload`, `handles multiple increments correctly`, and `ignores negative points`). The file's `captureEvents()` helper (called in `beforeEach`) monkey-patches `eventManager.emit`, but `restoreEvents()` (called in `afterEach`) only resets the `capturedEvents` object — it never restores the original `emit`. Since `eventManager` is a singleton, each test's `beforeEach` wraps whatever the *previous* test already wrapped, so by the 3rd+ test a single `addPoints()` call fires through several stacked wrapper layers, inflating the captured-event counts (e.g. an expected count of `1` comes back as `5`+). The fix is for `captureEvents()` to capture the *true* original `emit` once (outside the function, at module scope) and have `restoreEvents()` restore `eventManager.emit` back to it — not something this doc will do on your behalf, just documented so it isn't re-diagnosed from scratch.

### 2. Integration tests (Playwright)

- Config: [`playwright.config.js`](../playwright.config.js) — `testDir: './tests'`, project `integration` matches `*.integration.spec.js`, runs against Desktop Chrome, `baseURL: http://localhost:8081`.
- Run: `npm run test:integration`.

> **Known gap**: there is no `tests/` directory in the repository yet, and no `*.integration.spec.js` files exist. `playwright.config.js` was added pointing at `./tests` in the same commit that introduced the CI pipeline, but the directory and specs were never committed. Running `test:integration` today finds zero matching tests. If you're adding integration coverage, this is the directory to create; if you're debugging a red CI run, this is why the integration step may be failing on "no tests found" rather than a real regression.

### 3. Regression/visual tests (Playwright)

- Same `playwright.config.js`, project `regression` matches `*.regression.spec.js` (also under `./tests` — same gap as above).
- Run: `npm run test:regression`.
- In CI this step is deliberately **non-blocking** (see below), likely because visual regression baselines don't exist yet either.

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

**Current state**: now that it runs, `standard-checker` reports 3 pre-existing violations (an empty `catch` block in `js/main.js` and `js/systems/AssetManager.js` each, plus a direct `.style.color =` assignment in `js/main.js`) — so `npm test` does not currently pass cleanly. `import-export-checker`, `identifier-usage-checker`, and `escape-sequence-checker` all pass.

> **Known gap**: none of these standards/lint scripts run in the GitHub Actions pipeline below — only Jest and Playwright do. `npm test` / `npm run lint` are enforced by convention (see the AI Quality Protocol's "run `npm test` after every modification") rather than by CI.

## CI Pipeline (`.github/workflows/ci.yml`)

- **Name**: "CI Testing Pipeline"
- **Triggers**: `push` to `main`, and `pull_request` targeting `main`. No `workflow_dispatch`, no other branches.
- **Job** `test` on `ubuntu-latest`, steps in order:
  1. Checkout (`actions/checkout@v4`)
  2. Setup Node 20 with npm cache (`actions/setup-node@v4`)
  3. `npm ci || npm install`
  4. `npx playwright install --with-deps`
  5. `python3 -m http.server 8081 &` — serves the repo as static files (no build step needed)
  6. `sleep 3` to let the server come up
  7. `npm run test:unit` — **blocking**
  8. `npm run test:integration` — **blocking** (see the missing-`tests/`-directory gap above — this step's current pass/fail status depends on how Playwright handles zero matched specs)
  9. `npm run test:regression` — **non-blocking**, explicitly suffixed with `|| echo "Visual regression tests encountered an issue (baseline may be missing). Continuing."`

**What actually blocks a PR today**: dependency/browser install, unit tests, and integration tests. Regression tests cannot fail the build. The standards/lint scripts don't run in CI at all (see gap above).

## Running Everything Locally

```bash
npm run test:unit          # Jest unit tests
npm run test:integration   # Playwright integration tests (needs tests/*.integration.spec.js)
npm run test:regression    # Playwright regression tests (needs tests/*.regression.spec.js)
npm test                   # standards + imports + identifiers + escape-sequence checks
npm run test:console       # console.* usage check (not part of `npm test` or CI)
```

## Related Docs

- [AI Quality Protocol](ai_quality_protocol.md) — the deterministic checklist these scripts enforce, and why each rule exists. Predates the Jest/Playwright/CI setup, so it doesn't mention this page yet.
- [Coding Standards](coding_standards.md) — the underlying style guide.
- [Architecture](architecture.md) — where the tested modules (`ScoreManager`, `InputBuffer`, `LevelSystem`, `FeedbackSystem`) fit into the engine.

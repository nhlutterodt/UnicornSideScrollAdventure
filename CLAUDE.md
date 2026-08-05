# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Unicorn Magic Run is a vanilla HTML5 Canvas + ES module side-scrolling runner. No build step, no bundler, no TypeScript, no framework. `package.json` declares `"type": "module"` — every `.js` file in the project is a native ES module, including the Node scripts under `scripts/`.

The repo is actually a small family of pages that share the same core/systems/config layers, not just one game:

| Page | Bootstrap | Purpose |
|---|---|---|
| `index.html` | `js/main.js` | The game |
| `customize.html` | `js/customize-main.js` | Outfit customization with named profile management (save/load/delete/reset) |
| `level-customize.html` | `js/level-customize.js` | "Level Studio" user overrides for stage 1, with named profile management |
| `item-lab.html`, `items-test.html` | `js/item-lab-main.js`, `js/items-test-main.js` | Item authoring/testing |
| `particle-test.html`, `powers-test.html`, `audio-test.html` | matching `*-main.js` | Isolated sandboxes |
| `settings.html` | `js/settings-main.js` | Settings page |

A change to `Config.js`, `Storage.js`, or the asset pipeline can affect every page above, not just the main game.

## Commands

```bash
# No build step - open index.html directly, or serve statically:
python -m http.server 8081     # same server CI uses

# Standards/lint checkers (chained, stop at first failure)
npm test                        # standards + import/export + identifiers + escape-sequence
npm run test:standards          # inline CSS/JS, raw localStorage, console.*, empty catch blocks
npm run test:imports            # import/export name + case mismatches
npm run test:identifiers        # imported-name vs used-name case mismatches
npm run test:escape             # literal \n/\t/\r left in code instead of real characters
npm run test:console            # console.* usage (not part of `npm test` or CI - run manually)

# Jest unit tests
npm run test:unit                                  # all unit tests
node --experimental-vm-modules node_modules/jest/bin/jest.js js/systems/InputBuffer.test.js   # single file
node --experimental-vm-modules node_modules/jest/bin/jest.js -t "test name"                   # single test by name

# Playwright (currently finds zero specs - see Known Gaps)
npm run test:integration
npm run test:regression
```

Full reference, including which checks currently pass/fail and the CI pipeline: [docs/testing_and_ci.md](docs/testing_and_ci.md).

## Architecture

### `Game.js` is the orchestrator, not the game loop

`js/Game.js` wires together ~17 modules in its constructor (core: `StateController`, `InputManager`, `GameLoop`; systems: `ParticleSystem`, `EffectSystem`, `FeedbackSystem`, `AbilityManager`, `LevelSystem`, `ScoreManager`, `ViewportManager`, `SpawnManager`, `UIManager`, `RenderSystem`, `GameInputHandler`, `ThemeManager`, `EnvironmentInitializer`, `LogOverlay`; factory: `PlayerFactory`). `GameLoop` runs continuously via `requestAnimationFrame` for the page's lifetime; `Game.update(dt)` gates most logic behind `state.current === 'PLAYING'`, but rendering always runs.

Two dt values exist per frame, and mixing them up is the easiest way to introduce a subtle bug: `gameplayDt = feedback.getGameplayDt(dt)` (returns `0` during a hit-stop freeze) drives level/spawner/entities/collision, while `ParticleSystem.update()` always gets the **raw, unscaled `dt`** so particles keep animating during a freeze-frame. `feedback.update(dt)` itself runs unconditionally, before the `PLAYING` gate, so a death-impact shake keeps decaying visually even as the state flips to `GAMEOVER` mid-frame.

### Entity-Registry pattern

Every game object extends `Entity` (`js/core/Entity.js`) and **auto-registers** in the singleton `engineRegistry` (`js/core/Registry.js`) inside the base constructor — there is no separate registration step. `destroy()` unregisters. `Registry.getByType(type)` / `getEntitiesByLayers(mask)` back collision-candidate lookups and the shared per-frame `context` object.

Collision uses bitflag layers/masks (`js/utils/PhysicsUtils.js`, `CollisionLayers`), checked as `(a.collisionMask & b.collisionLayer) !== 0`. An entity can occupy multiple layers at once.

### Event bus, not direct calls

`js/systems/EventManager.js` exports a singleton `eventManager` used pervasively for cross-system signaling instead of direct method calls: `ITEM_PICKED_UP`, `SCORE_CHANGED`, `HIGH_SCORE_CHANGED`, `STAGE_CHANGED`, `LEVEL_UP`, `ABILITY_APPLIED`, `VIEWPORT_RESIZED`, `LIFE_CHANGED`, `CONFIG_LOADED`, `SAFE_START_TICK`, `SAFE_START_END`. When tracing "what happens when X," search for an `eventManager.on(...)` subscription before assuming a direct call exists. Notably, `Item`/`Player` never call `AbilityManager` directly on pickup — they emit `ITEM_PICKED_UP` and `AbilityManager.init()` subscribes to it.

### Manager pattern - logic lives in systems, not entities

Entities (`js/entities/`) are close to pure state containers. Business logic belongs in a system class under `js/systems/`, not in `Player.js`/`Game.js` (`AbilityManager` applying item effects instead of a switch statement in `Player` is the canonical example). Adding `if (item.type === x)` blocks to an entity is the anti-pattern to avoid.

### Data-driven configuration, with a real gap

`js/Config.js` is both the static-constants table and the async JSON loader (`loadExternalConfig()`, called once from `main.js` before `new Game()`). Content lives in `js/config/{stages,items,abilities,patterns,effects}.json`, loaded with hardcoded `Config.FALLBACK` data used on fetch failure. **There is no per-field validation** — `Config._fetchConfig()` only checks that the top-level key exists and is non-empty; a stage missing `name` loads silently and fails wherever that field is later read. Schemas: [docs/config_json_schemas.md](docs/config_json_schemas.md).

### Input forgiveness (`js/systems/InputBuffer.js`)

`Player.jump()` goes through a small generic dt-driven timer-buffer, not a bare `isGrounded` check: coyote time (a grace window armed on *any* `isGrounded: true → false` transition, not just jumping) and jump buffering (a jump pressed while airborne queues and fires on next landing). Windows are `Config.INPUT_TIMING.JUMP_COYOTE_MS`/`JUMP_BUFFER_MS`.

### Profile system (`js/ProfileSchemas.js`)

Both the character customizer and level studio use a shared profile system with versioned, validated profiles. See `js/ProfileSchemas.js` for schema definitions, validation functions (`validateCharacterData`, `validateLevelData`), and profile wrapper utilities (`createProfile`, `unwrapProfileData`, `migrateCharacterProfile`).

**Storage keys**: `characterProfiles`, `activeCharacterProfile`, `levelProfiles`, `activeLevelProfile`. Legacy keys `current_outfit` and `levelConfig` are still consumed as fallbacks.

**Consumption**: `PlayerFactory._loadActiveOutfit()` reads the active character profile with fallback chain. `LevelSystem._loadActiveLevelConfig()` reads the active level profile with fallback chain.

### Known gotchas

- **`LogOverlay`** is always instantiated by `Game.js` and defaults to visible regardless of `Config.DEBUG`, rendering at `z-index: 9999`, bottom-right, 500px wide - wide enough to cover most of a narrow/mobile viewport. New bottom-of-screen UI needs a higher `z-index` or it will silently become unclickable.
- **Playwright integration/regression tests currently match zero files** - `playwright.config.js` points at `./tests`, which doesn't exist yet.
- Single entry point per HTML page is enforced by convention: never add a second `<script>` tag for a library. UMD libraries (e.g. Howler.js) get an ESM wrapper that dynamically injects the script (`js/libs/howler-wrapper.js`).
- **`npm test` now passes cleanly** — the two pre-existing baseline failures (empty catch blocks in `powers-test-main.js` and `AudioSystem.js`) have been fixed.

## Where to look for more detail

- [docs/architecture.md](docs/architecture.md) - full system-by-system reference (state management, rendering/viewport scaling, spawning, impact feedback, safe start/difficulty ramp)
- [docs/config_json_schemas.md](docs/config_json_schemas.md) - JSON config schemas and the plain-JS `Config.js` constants
- [docs/item_system_architecture.md](docs/item_system_architecture.md) - Item/AbilityManager decoupling in detail
- [docs/testing_and_ci.md](docs/testing_and_ci.md) - test layers, CI pipeline, current known gaps
- [docs/coding_standards.md](docs/coding_standards.md) - the style rules the standards checkers enforce
- [docs/ai_quality_protocol.md](docs/ai_quality_protocol.md) - deterministic pre-completion checklist (a11y, CSS compatibility, Howler.js usage rules)

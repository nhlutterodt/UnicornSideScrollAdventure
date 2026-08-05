# Architecture Overview

Unicorn Magic Run is a vanilla HTML5 Canvas + ES module game (no build step, no framework). The repo is actually a small family of pages — the main game plus several companion tools — that share the same core engine, config, and storage layers.

## Entry Point & Bootstrap

`index.html` loads a single module, `js/main.js` (the project convention is one `<script type="module">` per page — see [Coding Standards](coding_standards.md)). On `DOMContentLoaded`, `main.js`:

1. Shows a loading overlay.
2. Awaits `Config.loadExternalConfig()` — fetches all JSON config (see [Configuration JSON Schemas](config_json_schemas.md)).
3. Awaits `assetManager.initialize()` — preloads any declared image/audio assets.
4. Removes the loading overlay and constructs `window.game = new Game()`.

Errors during bootstrap are routed through `ErrorHandler.handle('main', ...)` rather than thrown raw.

### Companion pages

The same core/systems modules are reused by several other entry points, each with its own HTML page and `*-main.js` bootstrap:

| Page | Bootstrap module | Purpose |
| --- | --- | --- |
| `index.html` | `js/main.js` | The game |
| `customize.html` | `js/Customizer.js` + `js/customize-main.js` | Unicorn outfit customization with named profile management (save/load/delete/reset), versioned schema validation, and migration from legacy single-outfit storage |
| `level-customize.html` | `js/level-customize.js` | "Level Studio" — user-authored overrides for stage 1, persisted via `Storage` with named profile management (save/load/delete/reset), blended in by `LevelSystem` |
| `item-lab.html` | `js/item-lab-main.js` | Item authoring/preview sandbox |
| `items-test.html` | `js/items-test-main.js` | Item testing harness |
| `particle-test.html` | `js/particle-test-main.js` | Particle effect sandbox |
| `powers-test.html` | `js/powers-test-main.js` | Ability testing harness |
| `audio-test.html` | `js/audio-test-main.js` | Audio/Howler.js sandbox |
| `settings.html` | `js/settings-main.js` | Settings page |

These all depend on the same `Config`, `Storage`, and asset pipeline, so a change to those modules can affect every page, not just the main game.

## `Game.js` — the coordination hub

`js/Game.js` is the actual orchestrator; it isn't just "the game loop," it wires together roughly 17 modules in its constructor, including:

- **Core**: `StateController`, `InputManager`, `GameLoop`
- **Systems**: `ParticleSystem`, `EffectSystem`, `AbilityManager`, `LevelSystem`, `ScoreManager`, `ViewportManager`, `SpawnManager`, `UIManager`, `RenderSystem`, `GameInputHandler`, `ThemeManager`, `EnvironmentInitializer`, `LogOverlay`
- **Factories**: `PlayerFactory`

`Game.init()` starts the loop once; it runs continuously for the lifetime of the page (it does not stop/restart per state).

## Game Loop (`js/core/GameLoop.js`)

A class, not free functions. `start()` kicks off `requestAnimationFrame`; each `tick(currentTime)` computes a delta time (clamped to 0.1s max, scaled by `timeScale`) and calls `update(dt)` then `draw()` before requesting the next frame. `Game` supplies its own bound `update`/`draw` methods as the loop's callbacks.

- **`Game.update(dt)`** gates most *logic* behind `if (this.state.current !== 'PLAYING') return;` — so rendering keeps running in every state (menu, playing, game over), but physics/spawning/collision only run while `PLAYING`. One thing runs before that gate regardless of state: `this.feedback.update(dt)` (see [Impact Feedback](#impact-feedback-jssystemsfeedbacksystemjs) below) — a death-impact shake needs to keep decaying visually even as the state flips to `GAMEOVER` mid-frame, not freeze.
  Per frame it also runs `_updateSafeStart(dt)` (see [Safe Start](#safe-start--difficulty-ramp)), computes `gameplayDt = this.feedback.getGameplayDt(dt)`, updates `LevelSystem`/`AbilityManager` with that (frozen during hit-stop), builds a shared `context` object (config, viewport height, game speed, world modifiers, platforms, registry, particles, `feedback`), then drives `SpawnManager`, `Registry.updateAll(gameplayDt, context)`, and `CollisionSystem.resolve(...)` — all with `gameplayDt`. **`ParticleSystem.update()` is the one exception: it's always called with the raw, unfrozen `dt`**, so particles keep animating during a hit-stop freeze instead of freezing along with everything else.
- **`Game.draw()`** reads `this.feedback.getShakeOffset()` and passes it to `RenderSystem.render(...)` as a screen-shake translate.

## State Management (`js/core/StateController.js`)

Not a bare `gameState` variable — a small observable class constructed with the `#gameContainer` element and an initial state of `'START'`. `setState(newState)` updates internal state, writes it to the DOM (`container.dataset.state = state`, which CSS uses to show/hide the start/game-over overlays), and notifies subscribers. States in use: `START`, `PLAYING`, `GAMEOVER`.

## Event Bus (`js/systems/EventManager.js`)

A global pub/sub singleton (`eventManager`) used pervasively for cross-system signaling that is deliberately *not* routed through direct method calls — e.g. `ITEM_PICKED_UP`, `SCORE_CHANGED`, `HIGH_SCORE_CHANGED`, `STAGE_CHANGED`, `LEVEL_UP`, `ABILITY_APPLIED`, `VIEWPORT_RESIZED`, `LIFE_CHANGED`, `CONFIG_LOADED`, `ASSET_LOADED`. Most systems (`ScoreManager`, `UIManager`, `ThemeManager`, `ViewportManager`, `LevelSystem`, `AbilityManager`, `Config`) both emit and consume events on this bus. When tracing "what happens when X" across systems, check for an `eventManager.on(...)` subscription before assuming a direct call exists.

## Input Handling

Two layers, not a single `handleInput()` function:

- **`InputManager`** (`js/systems/InputManager.js`) unifies keyboard/touch/mouse into named actions (`jump`, `useAbility`, `cycleLeft`, `cycleRight`). Space → jump, `E` → useAbility, `Q`/`R` → cycle abilities; touch/click anywhere that isn't a `<button>` triggers jump.
- **`GameInputHandler`** (`js/systems/GameInputHandler.js`) sits between `InputManager` and gameplay, binding actions to the player/particles/effects/UI and gating each on `state.current === 'PLAYING'`. It also wires the on-screen mobile ability buttons (`#abilityTouchPrev`/`Use`/`Next`) to `InputManager.triggerAction(...)` directly, so touch input shares the exact same cooldown/state-gating handlers as keyboard rather than duplicating that logic.

## Input Forgiveness (`js/systems/InputBuffer.js`)

`Player.jump()` doesn't just check `isGrounded` — it goes through a small generic timer-buffer utility (`InputBuffer`, one instance per `Player`) that implements two standard platformer conventions:

- **Coyote time**: the instant the player's `isGrounded` flips from `true` to `false` — for *any* reason (jumping, or a platform scrolling out from under them; it's not jump-specific) — a `'coyote'` window is armed for `Config.INPUT_TIMING.JUMP_COYOTE_MS` (120ms default). A jump pressed within that window still fires normally.
- **Jump buffering**: a jump pressed while airborne and outside the coyote window doesn't do nothing — it arms a `'jumpRequest'` buffer for `Config.INPUT_TIMING.JUMP_BUFFER_MS` (120ms default). `Player.update()` checks this buffer every frame once `isGrounded` becomes true and fires the queued jump immediately on landing.

`InputBuffer` itself is pure timer-map logic (`buffer(key, seconds)` / `isBuffered(key)` / `consume(key)` / `update(dt)`) with no knowledge of jumping specifically — it's meant to be reusable for future buffered-input needs.

## Impact Feedback (`js/systems/FeedbackSystem.js`)

Hits and abilities don't just spawn a particle burst — `FeedbackSystem` is a single shared coordinator for screen shake and hit-stop (freeze-frame), so future hazards/abilities can call `triggerImpact('medium' | 'heavy')` instead of wiring up bespoke effects each time. Presets (hit-stop duration, shake magnitude/duration) and an `intensity` multiplier plus `screenShakeEnabled`/`hitStopEnabled` flags live in `Config.FEEDBACK`.

Two things about the integration are easy to get wrong in a future change, so they're called out explicitly:

- **`Game.update(dt)` computes a separate `gameplayDt` via `feedback.getGameplayDt(dt)`** (returns `0` while hit-stopped, else `dt` unchanged) and feeds that to `LevelSystem`, `AbilityManager`, `SpawnManager`, `Registry.updateAll`, and `CollisionSystem`. **`ParticleSystem.update()` always gets the raw, unscaled `dt`** — this is deliberate, so particles keep animating during a hit-stop freeze rather than freezing along with gameplay logic.
- **`feedback.update(dt)` runs unconditionally, before the `PLAYING`-state early return** in `Game.update()`. A death sets `GAMEOVER` synchronously within the same `update()` call that triggered it, so if `feedback.update()` were gated behind the `PLAYING` check, a death-impact shake would freeze mid-animation the instant the state changed instead of decaying naturally into the game-over screen.

Screen shake is applied by `Game.draw()` reading `feedback.getShakeOffset()` and passing it to `RenderSystem.render()`, which applies it as a `ctx.translate(...)` right after the viewport scale. Currently wired to player-hit (`'medium'` if a life remains, `'heavy'` on death, both in `Player.onCollision`) and the `ROAR` ability (`'medium'`, in `EffectSystem.trigger()`).

## Safe Start & Difficulty Ramp

Two related but independent mechanisms soften the early-game and level-transition experience:

- **Safe start** (`Config.SAFE_START.FIRST_HAZARD_DELAY_MS`, 2500ms default): `Game.js` owns a `safeStartRemaining` countdown, reset at the start of every run, and passes `isSafeStart = safeStartRemaining > 0` into `SpawnManager.update()`. This suppresses **only** `spawnObstaclesAndPatterns()` (hazards and the curated pattern system, since patterns can themselves contain hazards) — platform, cloud, and item spawning are unaffected. `Game.js` emits `SAFE_START_TICK`/`SAFE_START_END` on the event bus (only when the displayed countdown digit changes, to stay event-driven rather than polling), which `UIManager` uses to show a "3, 2, 1, Go!" countdown — deliberately *not* reusing the invincibility glow visual, so players don't mistake it for a power-up.
- **Difficulty ramp** (`Config.LEVEL_PROGRESSION.RAMP_DURATION_MS`, 3000ms default): `LevelSystem.levelUp()` no longer snaps `gameSpeed`/`spawnInterval` straight to their new level-derived targets. It instead records `rampFrom` (the pre-level-up values) and `rampTo` (the new targets), and `_updateRamp(dt)` linearly interpolates between them over the configured duration. `LevelSystem.update()` still detects level-ups from `distance` exactly as before; only the speed/interval transition itself is eased.

## Rendering (`js/systems/RenderSystem.js` + `js/systems/ViewportManager.js`)

Rendering is centralized, not a bare `draw()` call:

- `RenderSystem` exposes a `Z_LAYERS` enum (background / environment-back / entities / particles / environment-front / UI) and draws the background theme, then all registry entities + player sorted by `renderLayer`, interleaving particles/effects at the right layer breakpoints, then scrolling decorative elements.
- `ViewportManager` maintains a fixed logical height (`600px`) with logical width derived from the container's aspect ratio, and a `scaleRatio` applied via `ctx.scale(...)` before drawing — so game logic always works in logical coordinates regardless of actual canvas size. It emits `VIEWPORT_RESIZED` on the event bus.

## Registry (`js/core/Registry.js`)

Centralized tracking for active entities.

- Entities self-register in the base `Entity` constructor — construction alone is registration.
- Every registered entity gets a unique `id` (e.g. `obstacle_5`).
- `getByType(type)` and `getEntitiesByLayers(layerMask)` support collision-candidate lookups and context building (e.g. `Game.update()` fetches `platforms` via `getByType('platform')`).
- `destroy()` unregisters an entity safely.

## Entities (`js/entities/`)

All entities extend `Entity` (`js/core/Entity.js`) directly or via a subclass; construction alone registers them, no manual registration step exists.

| Entity | Extends | Notes |
| --- | --- | --- |
| `Player` | `Entity` | Physics, sprite/animation state machine, ability system, lives/invincibility, and collision-reaction logic for obstacles/platforms/jump pads/items. |
| `Obstacle` | `Entity` | The original/generic hazard; still the default hazard for stages without a themed hazard mapping. |
| `Cloud` | `Entity` | Decorative parallax background element, no collision. |
| `Particle` | `Entity` | Short-lived visual effect; bypasses the registry to stay cheap at high volume. |
| `Platform` | `Entity` | Standing surface, scrolls with the world, optional gravity. |
| `CrumblingPlatform` | `Platform` | Shakes for `Config.CRUMBLING_PLATFORM_DELAY` seconds after the player lands on it, then disables its collision layer and falls. Triggered by `Player.onCollision` calling `other.activate()`. |
| `JumpPad` | `Entity` | Platform-mounted bouncer; applies an upward velocity boost on player collision. |
| `Hazard` | `Entity` | Base class for stage-themed environmental dangers — explicitly replaces generic `Obstacle` usage for stages that have one. |
| `LavaGeyser`, `IceSpike`, `NeonBarrier` | `Hazard` | Three stage-specific hazard variants (co-located in `js/entities/SpecialHazards.js`), selected by `SpawnManager` based on the current stage name. |
| `Item` | `Entity` | Generic collectible; carries opaque `itemData`, and on pickup emits `ITEM_PICKED_UP` on the event bus rather than calling a handler directly. |
| `VisualEntity` | `Entity` | Base class for logic-bearing visual effects with a duration/elapsed auto-destroy lifecycle. |
| `LaserEntity` | `VisualEntity` | An ability effect (continuous beam) implemented as a full entity; does its own line-intersection collision scan against obstacles each frame. |

## Factories (`js/factories/`)

Only `Player` is built through a factory — everything else (`SpawnManager`, `LevelUtils`) constructs entities with a bare `new`. `PlayerFactory` loads/creates the persisted outfit from the active character profile (with fallback chain: new profile system → legacy `current_outfit` → hardcoded defaults) and exposes `create()`, `createWithOutfit()`, `createDefault()`, and `getDefaultOutfit()`.

## Profile System (`js/ProfileSchemas.js`)

Both the character customizer and level studio use a shared profile system defined in `js/ProfileSchemas.js`. Profiles are versioned, validated, and portable:

```js
{
    schemaVersion: 1,
    id: "profile-id",
    name: "My Profile",
    updatedAt: "2026-08-05T00:00:00.000Z",
    data: { /* validated authoring data */ }
}
```

**Storage keys**:
- `characterProfiles` — map of profile ID → versioned profile for character outfits
- `activeCharacterProfile` — string ID of the active character profile
- `levelProfiles` — map of profile ID → versioned profile for level configs
- `activeLevelProfile` — string ID of the active level profile
- `levelConfig` — legacy key, still written for backward compatibility

**Validation**: `validateCharacterData()` and `validateLevelData()` check every field against its schema (type, allowed enum values, required fields). Invalid or missing values are replaced with safe defaults. Malformed profiles cannot crash startup.

**Migration**: On first load after the profile system is introduced, the old `current_outfit` key is automatically migrated to a versioned profile under `characterProfiles['default']`. The old `levelConfig` key is still consumed as a fallback if no level profiles exist.

**Consumption flow**:
```
editor UI → in-memory form state → validateCharacterData/validateLevelData
→ createProfile (versioned wrapper) → Storage.save → active profile ID
→ PlayerFactory._loadActiveOutfit() / LevelSystem._loadActiveLevelConfig()
→ validated, cloned runtime data → Player / LevelSystem
```

## Configuration (`js/Config.js` + `js/config/*.json`)

`Config` is a single module that acts as both the static-constants table and the async JSON loader (`loadExternalConfig()`). Stage, item, ability, pattern, and effect *content* is externalized to JSON and fetched at startup, with hardcoded fallbacks used if a fetch fails. See [Configuration JSON Schemas](config_json_schemas.md) for the full schema reference and [Item and Ability System Architecture](item_system_architecture.md) for how items/abilities are wired together.

## Spawning (`js/systems/SpawnManager.js`)

Driven once per frame from `Game.update()`, `SpawnManager` runs five independent timer-based routines: particle trail, obstacles & patterns (including a probability-weighted pattern system from `patterns.json`), platforms (including the crumbling-platform and jump-pad-on-platform probabilities), clouds, and items. See [Configuration JSON Schemas](config_json_schemas.md) for the `patterns.json`/`effects.json` schemas that drive this system. `update()` takes an `isSafeStart` flag (see [Safe Start & Difficulty Ramp](#safe-start--difficulty-ramp)) that suppresses only the obstacle/pattern routine.

## Other Systems (`js/systems/`)

- **`CollisionSystem`** — resolves entity interactions via layers/masks.
- **`AbilityManager`** — item-effect bridge; see [Item and Ability System Architecture](item_system_architecture.md).
- **`EffectSystem`** / **`ParticleSystem`** — coordinated visual/audio feedback and high-volume ephemeral particles, both driven by `effects.json`.
- **`LevelSystem`** — progression/difficulty/stage-theme logic; derives game speed, spawn interval, and world modifiers from `stages.json`, blends in any user-authored "Level Studio" overrides for stage 1, and eases speed/spawn-interval changes into effect over time rather than snapping (see [Safe Start & Difficulty Ramp](#safe-start--difficulty-ramp)).
- **`ScoreManager`** — score and high-score persistence, emits `SCORE_CHANGED`/`HIGH_SCORE_CHANGED`.
- **`UIManager`** — all DOM text/UI updates, purely event-driven off the event bus. Also toggles the `#abilityHint` control hint and `#abilityTouchControls` mobile buttons visible once the player has at least one ability (they're hidden otherwise, and the touch buttons are additionally hidden on mouse/keyboard-primary devices via a `(hover: hover) and (pointer: fine)` media query in `css/abilities.css`) — deliberately *not* on the start screen, since ability controls aren't relevant until the player actually has one.
- **`ThemeManager`** — applies the current stage theme to CSS custom properties on `STAGE_CHANGED`.
- **`AssetManager`** / **`AssetPipeline`** — async image/audio preloading and outfit-color-mapping for the customizer.
- **`Storage`** — namespaced, versioned `localStorage` wrapper; the only sanctioned way to persist data (see [Coding Standards](coding_standards.md) — raw `localStorage` calls are a lint failure).
- **`LogOverlay`** / **`Logger`** (`js/utils/Logger.js`) — in-game debug/log overlay with verbosity levels; `console.*` calls are disallowed in favor of this. **Gotcha**: `LogOverlay` defaults to visible (`isVisible = true`) regardless of `Config.DEBUG`, is always instantiated by `Game.js`, and renders at a fixed `z-index: 9999`, bottom-right, `500px` wide — wide enough to cover most of a narrow/mobile viewport. Any new bottom-of-screen UI needs a higher `z-index` (the mobile ability buttons use `10000`) or it will silently become unclickable.

## Testing & CI

See [Testing & CI](testing_and_ci.md) for the Jest/Playwright/GitHub Actions setup.

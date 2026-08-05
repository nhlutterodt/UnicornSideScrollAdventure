# Handoff Prompt: Character + Level Design Maturity

You are taking over development of the repository:

```text
D:\Github Projects\UnicornSideScrollAdventure
```

## Mission

Mature the game so players can meaningfully design/customize characters and levels, using local persistence as the only persistence layer for now.

Build a coherent, data-driven authoring flow that:

1. Lets users design and save character configurations.
2. Lets users design and save level/stage configurations.
3. Lets the game load and play those saved configurations.
4. Keeps authored data validated, recoverable, and compatible with the existing runtime.
5. Establishes a foundation that can later support cloud sync or sharing without implementing networking now.

Do not begin with broad refactoring. Inspect the current implementation, identify the smallest complete vertical slice, then iterate to completion with tests and manual/browser verification.

---

## Current repository state

- Branch: `main`
- Latest pushed commit:

```text
6a27831 fix gameplay input and platform resolution
```

- Remote:

```text
https://github.com/nhlutterodt/UnicornSideScrollAdventure.git
```

- The working tree was clean after the last push.
- The latest targeted gameplay work fixed:
  - duplicate input callbacks after retry/rebinding;
  - crossing-based one-way platform landing;
  - deterministic selection of the highest valid platform;
  - thin-platform crossing during large frame updates;
  - incorrect use of friction as an airborne gravity multiplier.

Do not regress these behaviors.

### Baseline verification

At handoff:

- Unit tests: **14 suites, 113 tests passed**.
- Import/export validation: passed.
- Identifier validation: passed.
- Escape-sequence validation: passed.
- `git diff --check`: passed.

The aggregate `npm test` command currently fails on two pre-existing standards violations unrelated to the gameplay fixes:

```text
js/powers-test-main.js:158
js/systems/AudioSystem.js:283
```

Both are empty `catch` blocks. Do not attribute these baseline failures to new work. If either file is touched, fix the issue properly using the project’s `ErrorHandler` conventions and update the report.

---

## Project architecture

This is a vanilla HTML5 Canvas + native ES module game.

- No bundler.
- No TypeScript.
- No framework.
- `package.json` uses `"type": "module"`.
- No build step.
- Main game entry: `index.html` → `js/main.js`.

Related pages:

| Page | Entry | Purpose |
|---|---|---|
| `index.html` | `js/main.js` | Main game |
| `customize.html` | `js/customize-main.js` | Character/outfit customization |
| `level-customize.html` | `js/level-customize.js` | Level Studio |
| `item-lab.html` | `js/item-lab-main.js` | Item authoring/testing |
| `items-test.html` | `js/items-test-main.js` | Item sandbox |
| `particle-test.html` | `js/particle-test-main.js` | Particle sandbox |
| `powers-test.html` | `js/powers-test-main.js` | Ability sandbox |
| `audio-test.html` | `js/audio-test-main.js` | Audio sandbox |
| `settings.html` | `js/settings-main.js` | Settings |

Read these before editing:

```text
CLAUDE.md
docs/architecture.md
docs/data_driven_design_pattern.md
docs/item_system_architecture.md
docs/local_storage_analysis.md
docs/config_externalization_analysis.md
docs/config_json_schemas.md
docs/testing_and_ci.md
js/Config.js
js/systems/Storage.js
js/systems/StorageManager.js
js/utils/EnvironmentInitializer.js
js/Customizer.js
js/level-customize.js
js/systems/LevelSystem.js
js/main.js
js/Game.js
```

Inspect current source rather than trusting older documentation. Some docs describe pre-refactor behavior.

---

## Existing relevant systems

### Character customization

Existing files:

```text
customize.html
js/customize-main.js
js/Customizer.js
css/customize.css
js/entities/Player.js
js/systems/AssetPipeline.js
js/factories/PlayerFactory.js
```

The player currently stores outfit data and resolves appearance through the asset pipeline. Existing concepts include:

```text
body
mane
accessory
trail
```

Determine:

- Which customization options already exist.
- Which values are user-facing versus runtime-resolved.
- Whether customization is currently persisted.
- Whether saved customization is consumed by the main game.
- Whether invalid or stale values can crash or silently corrupt the UI.
- Whether customization is applied at player creation and after retry.

Extend the current customization flow instead of duplicating it in a new page unless inspection proves that impossible.

### Level customization

Existing files:

```text
level-customize.html
js/level-customize.js
css/level-customize.css
js/systems/LevelSystem.js
```

There is existing level customization/local override handling, including a `levelConfig` storage key and user customization mapping.

Determine:

- Current editable fields.
- Current storage key and schema.
- Whether saved values affect actual gameplay.
- Which values are presentation-only versus runtime-authoritative.
- Whether custom level settings can be reset.
- Whether the editor exposes dangerous or invalid combinations.
- Whether customization applies only to level 1 or to the intended scope.
- Whether values survive reload and a new run.

Prefer one canonical schema shared by editor, storage, validation, and runtime.

### Local persistence

Inspect:

```text
js/systems/Storage.js
js/systems/StorageManager.js
docs/local_storage_analysis.md
```

Treat persistence as a deliberate subsystem, not scattered direct `localStorage` calls.

Persistence must:

- version saved data;
- validate on load;
- recover from malformed JSON;
- preserve defaults when saved data is invalid;
- avoid runtime objects, entity references, callbacks, and DOM state;
- make reset/clear operations explicit;
- keep character profiles and level profiles separate from active runtime state;
- handle unavailable storage and quota errors gracefully;
- remain ready for future export/import or cloud sync.

Use the existing storage abstraction where practical.

---

## Required product direction

Build two coherent authoring flows.

### Character designer

Users should be able to:

- edit available appearance/customization options;
- see a live preview;
- name a character profile;
- save locally;
- load an existing profile;
- delete a profile;
- reset to defaults;
- apply the selected character to the main game;
- receive clear save/load/reset feedback;
- recover if a saved profile is invalid or references a removed option.

Character data must be declarative and portable. Do not store resolved asset objects or runtime class instances.

### Level designer

Users should be able to:

- edit level/stage values that the runtime actually supports;
- preview or test the configured level;
- name a level profile;
- save locally;
- load, delete, duplicate, and reset profiles where practical;
- apply a selected level to gameplay;
- understand the consequences of values such as:
  - gravity;
  - game speed/difficulty;
  - spawn intervals/rates;
  - platform probability/placement;
  - hazard density;
  - world modifiers;
  - bounciness;
  - friction semantics;
  - safe-start behavior;
  - entity budget.

Do not expose configuration fields that the runtime ignores unless runtime behavior is implemented or the field is clearly marked unsupported/planned.

### Main-game integration

Selected character and level profiles must affect the actual game.

Trace and verify:

- startup initialization;
- `Game.resetInternalState()`;
- player creation through `PlayerFactory`;
- `LevelSystem` initialization/reset;
- stage selection and custom overrides;
- retry behavior;
- page reload behavior;
- switching profiles before a new run;
- deleted or invalid active profiles.

Do not introduce stale singleton state between retries.

---

## Canonical data and schema requirements

Define or consolidate schemas for:

- character profiles;
- level profiles;
- active selections;
- schema versions/migrations.

Schemas should specify:

- required fields;
- optional fields;
- defaults;
- allowed enumerations;
- numeric bounds;
- unknown-field behavior;
- migration behavior.

Use plain serializable objects. A profile should conceptually contain identity, metadata, schema version, and validated data, for example:

```js
{
    schemaVersion: 1,
    id: "profile-id",
    name: "My Profile",
    updatedAt: "2026-08-05T00:00:00.000Z",
    data: {
        // validated authoring data
    }
}
```

Do not adopt this shape blindly; reconcile it with existing conventions.

Runtime configuration should be cloned from validated profile data so editor state cannot mutate the active game unexpectedly.

---

## Persistence API direction

Create or extend a focused persistence/validation layer with operations equivalent to:

```js
listProfiles(type)
loadProfile(type, id)
saveProfile(type, profile)
deleteProfile(type, id)
duplicateProfile(type, id)
resetProfiles(type)
getActiveProfileId(type)
setActiveProfileId(type, id)
```

Requirements:

- malformed records are skipped or repaired safely;
- invalid records cannot prevent startup;
- writes are logically atomic at the storage-key level;
- profile IDs and timestamps are stable;
- default profiles always remain available;
- deleted active profiles fall back safely;
- existing storage keys are preserved where feasible;
- schema changes use versioned migration or safe fallback;
- no destructive migration without explicit justification.

Keep character, level, and active-selection storage separate.

---

## Required workflow

### Phase 1: Discovery

Before editing:

1. Check branch/status and fetch/check `origin/main`.
2. Read customization, level studio, storage, config, and runtime code.
3. Document the current data flow:

```text
editor UI
→ in-memory form state
→ validation
→ local persistence
→ selected profile
→ main-game bootstrap
→ runtime player/config
```

4. Identify contradictions between docs and implementation.
5. Record current storage keys and schemas before changing them.
6. Create a short implementation plan with one in-progress step at a time.

### Phase 2: Character vertical slice

Complete this end-to-end flow:

1. Open customization.
2. Edit character.
3. Preview.
4. Name profile.
5. Save.
6. Reload page.
7. Load profile.
8. Apply to main game.
9. Start and retry the game; verify appearance.
10. Delete/reset and verify fallback.

### Phase 3: Level vertical slice

Complete this end-to-end flow:

1. Open Level Studio.
2. Edit supported runtime values.
3. Validate live.
4. Preview/test.
5. Name profile.
6. Save.
7. Reload page.
8. Load profile.
9. Apply to main game.
10. Start/retry; verify actual gameplay changes.
11. Delete/reset and verify default fallback.

### Phase 4: Verification and polish

Add unit tests for:

- schema defaults;
- valid profile round trips;
- malformed JSON;
- invalid field values;
- unknown fields;
- version migration;
- save/load/delete/duplicate;
- active-selection fallback;
- character application to player creation;
- level application to `LevelSystem`;
- retry/reset isolation;
- deleted active profiles.

Add browser/integration tests if the Playwright setup can support them. Verify that actual specs are discovered; historically the Playwright configuration matched zero specs.

Manual verification must cover:

- desktop viewport;
- compact viewport;
- keyboard controls;
- touch/mouse controls;
- fresh storage;
- malformed existing storage;
- multiple profiles;
- page reload;
- retry;
- invalid/deleted active profile;
- editor-to-game application.

---

## Design constraints

1. **Data-driven**
   - Reuse `Config.js` and external JSON where appropriate.
   - Keep authoring schemas separate from runtime entities.
   - Avoid duplicated editor-only copies of runtime values.

2. **Local-first**
   - No backend, networking, login, or cloud APIs.
   - No unnecessary persistence dependency.

3. **Safe migrations**
   - Preserve current keys where feasible.
   - Version changed schemas.
   - Never let malformed data block game boot.

4. **Runtime integrity**
   - Validate before gameplay.
   - Clamp or reject unsafe numeric values.
   - Reject NaN, Infinity, impossible structures, and invalid enumerations.
   - Clone active runtime data.

5. **No speculative overbuilding**
   - Do not build a generalized CMS.
   - Do not add a database abstraction for one browser-local game.
   - Build the smallest complete vertical slice, then improve.

6. **Accessibility and responsive UI**
   - Use labels and keyboard-accessible controls.
   - Provide status messaging.
   - Check compact/mobile layouts.
   - Remember `LogOverlay` can cover narrow-screen UI.

7. **Compatibility**
   - Follow native ES module style.
   - Follow existing standards and `ErrorHandler` conventions.
   - Keep one script entry point per HTML page.

---

## Gameplay invariants from the previous audit

Do not regress commit `6a27831`:

- Input binding must be idempotent.
- Retrying must not multiply callbacks.
- Platform landing requires descending surface crossing.
- Side/underside overlap must not cause upward snapping.
- Multiple valid platforms resolve deterministically.
- Thin platforms crossed during a large update must be detected.
- `friction` is reserved for horizontal traction semantics.
- `gravityMultiplier` controls airborne gravity.

If character/level work touches `Player`, `LevelSystem`, `Game`, `InputManager`, `GameInputHandler`, or collision code, rerun targeted gameplay tests.

---

## Commands

Run from:

```text
D:\Github Projects\UnicornSideScrollAdventure
```

Useful commands:

```bash
git status --short --branch
git fetch origin
git log -5 --oneline --decorate

npm run test:unit -- --runInBand
npm test
npm run test:standards
npm run test:imports
npm run test:identifiers
npm run test:escape
npm run test:integration
npm run test:regression

git diff --check
```

Report baseline failures separately from new failures. Do not claim browser verification passed unless real specs were discovered and executed.

---

## Completion criteria

Consider the work complete only when:

- Character profiles can be edited, saved, loaded, deleted/reset, and applied to gameplay.
- Level profiles can be edited, saved, loaded, deleted/reset, and applied to gameplay.
- Persistence survives reload.
- Corrupt/invalid local data cannot break startup.
- Runtime uses validated cloned data.
- Active profile selection survives reload or safely falls back.
- Retry does not duplicate handlers or leak state.
- Unit tests cover persistence, validation, and runtime application.
- Browser/manual verification covers the end-to-end flows.
- Documentation explains schemas, storage keys, migrations, and workflows.
- `git diff --check` passes.
- The final report lists:
  - files changed;
  - schema/storage decisions;
  - tests and results;
  - known baseline failures;
  - remaining limitations;
  - commit hash if committed.

Work in small, reviewable commits unless explicitly asked for one large commit.

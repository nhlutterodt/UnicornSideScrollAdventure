# Configuration JSON Schemas

**Date:** January 23, 2026  
**Purpose:** Define the structure and validation rules for external configuration files  
**Related:** [config_externalization_implementation_plan.md](config_externalization_implementation_plan.md)

---

## Overview

The game uses five external JSON configuration files to store content data:
- `js/config/stages.json` - Stage/level definitions
- `js/config/items.json` - Collectible item definitions
- `js/config/abilities.json` - Power-up ability definitions
- `js/config/patterns.json` - Named obstacle/platform layout templates used by `SpawnManager`
- `js/config/effects.json` - Particle-effect presets used by `ParticleSystem`/`EffectSystem`

`stages.json`, `items.json`, and `abilities.json` follow a versioned wrapper format with metadata for tracking and migration (see below). `patterns.json` and `effects.json` do **not** — they are plain keyed objects with no `version`/`lastModified` wrapper.

---

## Common Schema Elements

### Version Metadata (stages.json, items.json, abilities.json only)

These three files must include version metadata at the root level:

```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "stages|items|abilities": [ /* content array */ ]
}
```

**Fields:**
- `version` (string, required): Semantic version number (MAJOR.MINOR.PATCH)
- `lastModified` (string, required): ISO 8601 date or YYYY-MM-DD format
- Content array (varies by file type)

---

## stages.json Schema

### Purpose
Defines game stages/levels with visual themes and physics modifiers.

### Root Object

```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "stages": [ /* Stage objects */ ]
}
```

**Fields:**
- `version` (string, required): Schema version
- `lastModified` (string, required): Last modification date
- `stages` (array, required): Array of Stage objects (minimum 1)

### Stage Object

```json
{
  "levelStart": 1,
  "name": "Morning Meadow",
  "entityBudget": 110,
  "spawnRates": {
    "obstacleIntervalMultiplier": 1.15,
    "platformIntervalMultiplier": 1.2,
    "itemIntervalMultiplier": 0.9,
    "cloudIntervalMultiplier": 1.0,
    "patternProbability": 0.2,
    "patternCooldownFallback": 900
  },
  "theme": {
    "primary": "#8ce68c",
    "secondary": "#76c476",
    "background": "skyblue",
    "elements": ["🌸", "🌼", "🍄"]
  },
  "modifiers": {
    "gravityMultiplier": 1.0,
    "timeScale": 1.0,
    "friction": 1.0,
    "bounciness": 0
  }
}
```

**Fields:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `levelStart` | number | ✅ | >= 1, integer | Level number where stage begins |
| `name` | string | ✅ | length > 0 | Display name of stage |
| `entityBudget` | number | ❌ | >= 1, integer | Max recommended active entities before budget warnings |
| `spawnRates` | object | ❌ | - | Per-stage spawn pacing controls |
| `spawnRates.obstacleIntervalMultiplier` | number | ❌ | 0.5 - 2.0 | Multiplier applied to level-derived obstacle interval |
| `spawnRates.platformIntervalMultiplier` | number | ❌ | 0.5 - 3.0 | Multiplier applied to level-derived platform interval |
| `spawnRates.itemIntervalMultiplier` | number | ❌ | 0.5 - 3.0 | Multiplier applied to base item interval |
| `spawnRates.cloudIntervalMultiplier` | number | ❌ | 0.5 - 3.0 | Multiplier applied to base cloud interval |
| `spawnRates.patternProbability` | number | ❌ | 0.0 - 1.0 | Chance to spawn a pattern instead of a single hazard |
| `spawnRates.patternCooldownFallback` | number | ❌ | >= 100 | Pixel cooldown used when a pattern omits `durationOffset` |
| `theme` | object | ✅ | - | Visual theme configuration |
| `theme.primary` | string | ✅ | hex or CSS color | Primary/ground color |
| `theme.secondary` | string | ✅ | hex or CSS color | Secondary color |
| `theme.background` | string | ✅ | hex or CSS color | Background color |
| `theme.elements` | array | ✅ | strings (emojis) | Decorative elements (emojis) |
| `modifiers` | object | ✅ | - | Physics modifiers |
| `modifiers.gravityMultiplier` | number | ✅ | 0.1 - 2.0 | Gravity modifier (1.0 = normal) |
| `modifiers.timeScale` | number | ✅ | 0.1 - 2.0 | Time scale (1.0 = normal) |
| `modifiers.friction` | number | ✅ | 0.0 - 2.0 | Friction multiplier |
| `modifiers.bounciness` | number | ✅ | 0.0 - 1.0 | Surface bounciness |

**Validation Rules:**
- At least one stage must be defined
- `levelStart` values should be unique and sequential
- Stage with `levelStart: 1` is required (starting stage)
- `entityBudget` is optional; if omitted, engine default collision budget is used
- `spawnRates` is optional; if omitted, global spawn defaults are used
- Hex colors should start with `#` (e.g., `#8ce68c`)
- Elements array can be empty but must exist

**Example:**
```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "stages": [
    {
      "levelStart": 1,
      "name": "Morning Meadow",
      "theme": {
        "primary": "#8ce68c",
        "secondary": "#76c476",
        "background": "skyblue",
        "elements": ["🌸", "🌼", "🍄"]
      },
      "modifiers": {
        "gravityMultiplier": 1.0,
        "timeScale": 1.0,
        "friction": 1.0,
        "bounciness": 0
      }
    }
  ]
}
```

---

## items.json Schema

### Purpose
Defines collectible items with their effects and spawn weights.

### Root Object

```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "items": [ /* Item objects */ ]
}
```

**Fields:**
- `version` (string, required): Schema version
- `lastModified` (string, required): Last modification date
- `items` (array, required): Array of Item objects (minimum 1)

### Item Object

```json
{
  "id": "extra_life",
  "type": "life",
  "name": "Sparkle Heart",
  "icon": "💖",
  "color": "#ff3366",
  "value": 1,
  "weight": 10
}
```

**Common Fields:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | ✅ | unique, snake_case | Unique identifier |
| `type` | string | ✅ | See Item Types | Item type (determines behavior) |
| `name` | string | ❌ | - | Display name (some types omit) |
| `icon` | string | ❌ | emoji | Visual icon |
| `color` | string | ❌ | hex color | Item color |
| `weight` | number | ✅ | >= 0 | Spawn weight (higher = more common) |

**Type-Specific Fields:**

#### Life Type (`type: "life"`)
```json
{
  "id": "extra_life",
  "type": "life",
  "name": "Sparkle Heart",
  "icon": "💖",
  "color": "#ff3366",
  "value": 1,
  "weight": 10
}
```
- `value` (number, required): Lives to add (typically 1)

#### Invincibility Type (`type: "invincibility"`)
```json
{
  "id": "invincibility_star",
  "type": "invincibility",
  "name": "Magic Star",
  "icon": "⭐",
  "color": "#fffb00",
  "duration": 5,
  "weight": 5
}
```
- `duration` (number, required): Duration in seconds

#### Physics Type (`type: "physics"`)
```json
{
  "id": "gravity_feather",
  "type": "physics",
  "name": "Light Feather",
  "icon": "🪶",
  "color": "#7afcff",
  "duration": 8,
  "modifier": {
    "gravityMultiplier": 0.5
  },
  "weight": 15
}
```
- `duration` (number, required): Effect duration in seconds
- `modifier` (object, required): Physics modifiers to apply
  - `gravityMultiplier` (number, optional): Gravity modifier
  - `jumpMultiplier` (number, optional): Jump force modifier

#### World Type (`type: "world"`)
```json
{
  "id": "chronos_clock",
  "type": "world",
  "name": "Time Clock",
  "icon": "⏳",
  "color": "#a29bfe",
  "duration": 5,
  "modifier": {
    "timeScale": 0.5
  },
  "weight": 8
}
```
- `duration` (number, required): Effect duration in seconds
- `modifier` (object, required): World-level modifiers
  - `timeScale` (number, required): Time scale (0.5 = slow motion)

#### Ability Type (`type: "ability"`)
```json
{
  "id": "ability_lasers",
  "type": "ability",
  "abilityId": "lasers",
  "weight": 30
}
```
- `abilityId` (string, required): References ability from abilities.json
- Note: No `name`, `icon`, `color` - inherited from ability definition

**Item Types:**
- `life` - Adds extra lives
- `invincibility` - Grants temporary invincibility
- `physics` - Modifies player physics (gravity, jump)
- `world` - Affects entire game world (time scale)
- `ability` - Grants a special ability power-up

**Validation Rules:**
- Item `id` must be unique across all items
- `type` must match one of the valid Item Types
- `weight` should be > 0 for items to spawn (0 = disabled)
- Ability-type items must reference valid `abilityId` from abilities.json
- Total weight affects spawn probability distribution

**Example:**
```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "items": [
    {
      "id": "extra_life",
      "type": "life",
      "name": "Sparkle Heart",
      "icon": "💖",
      "color": "#ff3366",
      "value": 1,
      "weight": 10
    },
    {
      "id": "gravity_feather",
      "type": "physics",
      "name": "Light Feather",
      "icon": "🪶",
      "color": "#7afcff",
      "duration": 8,
      "modifier": {
        "gravityMultiplier": 0.5
      },
      "weight": 15
    }
  ]
}
```

---

## abilities.json Schema

### Purpose
Defines special ability power-ups with their effects and cooldowns.

### Root Object

```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "abilities": [ /* Ability objects */ ]
}
```

**Fields:**
- `version` (string, required): Schema version
- `lastModified` (string, required): Last modification date
- `abilities` (array, required): Array of Ability objects

### Ability Object

```json
{
  "id": "lasers",
  "name": "Ruby Eye Lasers",
  "icon": "👁️",
  "color": "#ff0000",
  "duration": 60,
  "uses": null,
  "cooldown": 0.1,
  "effectConfig": {
    "type": "beam",
    "color": "#ff0000",
    "thickness": 4
  }
}
```

**Fields:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `id` | string | ✅ | unique, lowercase | Unique identifier |
| `name` | string | ✅ | length > 0 | Display name |
| `icon` | string | ✅ | emoji | Visual icon |
| `color` | string | ✅ | hex color | Ability color theme |
| `duration` | number | ✅ | > 0 | How long ability lasts (seconds) |
| `uses` | number/null | ✅ | >= 0 or null | Number of uses (null = unlimited) |
| `cooldown` | number | ✅ | >= 0 | Cooldown between uses (seconds) |
| `effectConfig` | object | ✅ | - | Ability-specific configuration |

**Effect Config (Varies by Ability):**

The `effectConfig` object structure depends on the ability implementation:

#### Beam/Laser Effect
```json
"effectConfig": {
  "type": "beam",
  "color": "#ff0000",
  "thickness": 4
}
```

#### Area Effect (Roar, Shockwave)
```json
"effectConfig": {
  "radius": 300,
  "color": "#ffa500"
}
```

**Validation Rules:**
- Ability `id` must be unique
- If `uses` is null, ability has unlimited uses
- If `uses` is a number, it must be > 0
- `cooldown` of 0 means no cooldown between uses
- `effectConfig` structure must match what the ability system expects

**Example:**
```json
{
  "version": "1.0.0",
  "lastModified": "2026-01-23",
  "abilities": [
    {
      "id": "lasers",
      "name": "Ruby Eye Lasers",
      "icon": "👁️",
      "color": "#ff0000",
      "duration": 60,
      "uses": null,
      "cooldown": 0.1,
      "effectConfig": {
        "type": "beam",
        "color": "#ff0000",
        "thickness": 4
      }
    },
    {
      "id": "roar",
      "name": "Sonic Roar",
      "icon": "🦁",
      "color": "#ffa500",
      "duration": 120,
      "uses": 10,
      "cooldown": 0.8,
      "effectConfig": {
        "radius": 300,
        "color": "#ffa500"
      }
    }
  ]
}
```

---

## patterns.json Schema

### Purpose

Defines named, multi-entity obstacle/platform layout templates that `SpawnManager` can place as a unit instead of spawning a single random hazard.

### Root Object

```json
{
  "patterns": { /* map of pattern name -> Pattern object */ }
}
```

Unlike stages/items/abilities, this is a plain object with **no `version`/`lastModified` wrapper** and no top-level array — patterns are keyed by name directly.

### Pattern Object

```json
{
  "staircase": {
    "durationOffset": 220,
    "entities": [
      { "type": "platform", "dx": 0, "dy": -40, "width": 80, "height": 20 },
      { "type": "hazard", "dx": 260, "dy": 0 }
    ]
  }
}
```

**Fields:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `durationOffset` | number | ❌ | Pixel-distance the pattern's cooldown lasts before normal single-hazard/platform spawning resumes. Falls back to `Config.PATTERN_COOLDOWN_FALLBACK` (1000) if omitted. |
| `entities` | array | ✅ | List of Entity Placement objects that make up the pattern. |

**Entity Placement Object:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | ✅ | `"platform"` or `"hazard"`. |
| `dx` | number | ✅ | X offset from the pattern's spawn base position. |
| `dy` | number | ❌ | Y offset from ground level (default 0). |
| `width` | number | ❌ | Platform-only; defaults to `Config.PLATFORM_MIN_WIDTH`. |
| `height` | number | ❌ | Platform-only; defaults to `Config.PLATFORM_HEIGHT`. |

**Consumer behavior** (`js/systems/SpawnManager.js`):

- A pattern is only chosen if `Config.PATTERNS` is non-empty and `Math.random() < Config.PATTERN_PROBABILITY` (0.25 by default); otherwise a single hazard is spawned as usual.
- `type: "hazard"` entries spawn via the same stage-aware hazard selection used for regular spawns (`IceSpike`/`LavaGeyser`/`NeonBarrier`/`Obstacle` depending on the current stage).
- `type: "platform"` entries instantiate `Platform` directly (patterns do not spawn `CrumblingPlatform` or `JumpPad`).
- While a pattern's cooldown is active, ordinary obstacle/platform spawning pauses, but cloud and item spawning continue unaffected.

---

## effects.json Schema

### Purpose

Defines reusable particle-effect presets consumed by `ParticleSystem.play(effectId, params)` and `EffectSystem`.

### Root Object

```json
{
  "effects": { /* map of EFFECT_ID -> Effect object */ }
}
```

Like `patterns.json`, this has **no `version`/`lastModified` wrapper** — effects are keyed directly by ID (convention: `SCREAMING_SNAKE_CASE`).

### Effect Object

```json
{
  "TRAIL": {
    "count": 1,
    "life": [0.3, 0.6],
    "size": [2, 4],
    "speed": [10, 30],
    "gravity": 0,
    "tier": 0,
    "color": "#ffccf9"
  }
}
```

**Fields:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `count` | number | ❌ | 1 | Particles spawned per `play()` call. |
| `life` | `[min, max]` | ❌ | `[0.5, 1.0]` | Randomized particle lifetime in seconds. |
| `size` | `[min, max]` | ❌ | `[2, 5]` | Randomized particle size. |
| `speed` | `[min, max]` | ❌ | `[50, 100]` | Randomized initial speed magnitude; direction is a random angle unless overridden by `params.vx`/`vy` at call time. |
| `gravity` | number | ❌ | 0 | Per-particle gravity applied over its lifetime. |
| `tier` | number | ❌ | 0 | Used for tiered collision-check budgeting (see `Config.PARTICLE_SYSTEM.TIER2_MAX_ACTIVE`/`TIER2_MAX_CHECKS_PER_FRAME`) — higher-tier effects get collision checks under a stricter per-frame budget. |
| `color` | string | ❌ | — | Decorative default; can be overridden by `params.color` at call time. |

**Known effect IDs currently defined**: `TRAIL`, `LAND_DUST`, `IMPACT_SPARK`, `PICKUP_BURST`, `ROAR`, `LASER`. `ROAR` and `LASER` are special-cased in `EffectSystem` beyond pure particle spawning — `LASER` spawns a `LaserEntity`, and `ROAR` also applies a radius-based force/destroy pass over nearby obstacles.

---

## Validation & Testing

### Manual Validation

**Validate JSON Syntax:**
```bash
# Windows PowerShell
node -e "JSON.parse(require('fs').readFileSync('js/config/stages.json'))"
node -e "JSON.parse(require('fs').readFileSync('js/config/items.json'))"
node -e "JSON.parse(require('fs').readFileSync('js/config/abilities.json'))"
```

**Check Content Count:**
```bash
node -e "const d = JSON.parse(require('fs').readFileSync('js/config/stages.json')); console.log('Stages:', d.stages.length);"
node -e "const d = JSON.parse(require('fs').readFileSync('js/config/items.json')); console.log('Items:', d.items.length);"
node -e "const d = JSON.parse(require('fs').readFileSync('js/config/abilities.json')); console.log('Abilities:', d.abilities.length);"
```

### Online Validators

Use these tools to validate JSON syntax:
- [JSONLint](https://jsonlint.com/)
- [JSON Formatter & Validator](https://jsonformatter.curiousconcept.com/)

### Runtime Validation

There is **no dedicated `ConfigValidator` module** — this doc previously implied per-field type/required-field checking that doesn't exist in code. The actual validation in `Config._fetchConfig()` (`js/Config.js`) is intentionally thin:
- Confirms the fetched JSON has the expected top-level key (`stages`/`items`/`abilities`/`patterns`/`effects`).
- Checks that the content is non-empty (array length, or object key count for `patterns`/`effects`).
- Falls back to `Config.FALLBACK[key]` if the fetch fails, the key is missing, or the content is empty.

It does **not** check individual required fields (e.g. a stage missing `name` will not be caught or logged — it will simply be loaded as-is and likely fail later wherever that field is read). If you add stricter validation, update this section accordingly.

Check browser console for the load messages:
```
[Config] Loading external configuration...
[Config] Loaded 6 stages, 8 items, 2 abilities, and effects.
```

---

## Common Issues & Solutions

### Issue: JSON Parse Error

**Symptom:**
```
[Config] Failed to load STAGES: Unexpected token } in JSON
```

**Causes:**
- Trailing comma after last array element
- Missing comma between objects
- Unescaped quotes in strings
- Comments (JSON doesn't support comments)

**Solution:**
Run through JSONLint or use VS Code's built-in JSON formatter

### Issue: Missing Required Field

**Symptom:** No console error — the loader doesn't validate individual fields, so a stage/item/ability missing a required field will load silently and fail wherever that field is later read (e.g. `undefined` colors, `NaN` physics modifiers).

**Causes:**
- Field name typo
- Field omitted
- Wrong data type (string instead of number)

**Solution:**
Check schema documentation and add missing field

### Issue: Empty Config Array

**Symptom:**
```
[Config] STAGES is empty, using fallback
```

**Causes:**
- File exists but array is empty: `"stages": []`
- Wrong property name (e.g., `"stage"` instead of `"stages"`)

**Solution:**
Add at least one item to array or check property name matches schema

### Issue: Fallback Activated

**Symptom:**
Game loads but shows "Safe Mode" stage only

**Causes:**
- JSON file missing or 404
- Network error during fetch
- Malformed JSON

**Solution:**
1. Check browser Network tab for 404 errors
2. Verify file path in CONFIG_PATHS
3. Validate JSON syntax
4. Check browser console for specific error

---

## Modifying Configuration

### Adding a New Stage

1. Open `js/config/stages.json`
2. Add new stage object to `stages` array:
```json
{
  "levelStart": 15,
  "name": "Crystal Cavern",
  "theme": {
    "primary": "#6a5acd",
    "secondary": "#483d8b",
    "background": "#191970",
    "elements": ["💎", "✨", "🔮"]
  },
  "modifiers": {
    "gravityMultiplier": 1.0,
    "timeScale": 1.0,
    "friction": 0.8,
    "bounciness": 0.2
  }
}
```
3. Update `lastModified` date
4. Validate JSON
5. Test in game

### Adding a New Item

1. Open `js/config/items.json`
2. Add new item object to `items` array:
```json
{
  "id": "speed_boost",
  "type": "physics",
  "name": "Turbo Shoes",
  "icon": "👟",
  "color": "#00ff00",
  "duration": 10,
  "modifier": {
    "speedMultiplier": 1.5
  },
  "weight": 12
}
```
3. Ensure `id` is unique
4. Update `lastModified` date
5. If adding new modifier type, update game code accordingly
6. Validate JSON
7. Test in game

### Adding a New Ability

1. Open `js/config/abilities.json`
2. Add new ability object to `abilities` array:
```json
{
  "id": "shield",
  "name": "Magic Shield",
  "icon": "🛡️",
  "color": "#00bfff",
  "duration": 30,
  "uses": 5,
  "cooldown": 1.0,
  "effectConfig": {
    "type": "shield",
    "radius": 50
  }
}
```
3. Implement ability logic in `js/systems/AbilityManager.js`
4. Create corresponding item in items.json if needed:
```json
{
  "id": "ability_shield",
  "type": "ability",
  "abilityId": "shield",
  "weight": 20
}
```
5. Update `lastModified` dates
6. Validate JSON
7. Test in game

---

## Version Migration

### When to Increment Version

**Patch (1.0.X):**
- Content changes (new stage, item tweaks)
- Bug fixes in existing content
- Balance adjustments

**Minor (1.X.0):**
- New optional fields added
- Backward-compatible structure changes

**Major (X.0.0):**
- Breaking changes to schema structure
- Required fields removed or renamed
- Type changes that break old data

### Migration Example

**From v1.0.0 to v2.0.0 (Breaking Change):**

```javascript
// If future version changes stage structure:
if (data.version === '1.0.0') {
    // Migrate old format to new format
    data.stages = data.stages.map(stage => ({
        ...stage,
        // New required field in v2.0.0
        difficulty: 'normal'
    }));
}
```

Currently not implemented - all configs use v1.0.0.

---

## Reference

### Related Documentation
- [Config.js Externalization Implementation Plan](config_externalization_implementation_plan.md)
- [Data-Driven Design Pattern](data_driven_design_pattern.md)
- [Coding Standards](coding_standards.md)

### File Locations

- `js/Config.js` - Configuration loader (also holds the small hardcoded `FALLBACK` data set)
- `js/config/stages.json` - Stage definitions
- `js/config/items.json` - Item definitions
- `js/config/abilities.json` - Ability definitions
- `js/config/patterns.json` - Obstacle/platform pattern templates
- `js/config/effects.json` - Particle effect presets

### Key Constants (Config.js)

- `Config.ITEM_TYPES` - Valid item type enum
- `Config.CONFIG_PATHS` - JSON file paths (includes `EFFECTS`/`PATTERNS`)
- `Config.FALLBACK` - Fallback configurations
- `Config.PATTERN_PROBABILITY` (0.25) / `Config.PATTERN_COOLDOWN_FALLBACK` (1000) - govern pattern spawn frequency and default cooldown
- `Config.CRUMBLING_PLATFORM_PROBABILITY` (0.15) / `Config.CRUMBLING_PLATFORM_DELAY` (0.4) - crumbling-platform spawn odds and shake duration
- `Config.JUMP_PAD_ON_PLATFORM_PROBABILITY` (0.10) - odds a plain platform gets a jump pad
- `Config.LEVEL_PROGRESSION.DIFFICULTY_INCREMENT_PER_LEVEL` (0.1) - per-level difficulty scaling
- `Config.LEVEL_PROGRESSION.RAMP_DURATION_MS` (3000) - how long a level-up's speed/spawn-interval change takes to ease in, instead of snapping instantly
- `Config.INPUT_TIMING.JUMP_COYOTE_MS` / `JUMP_BUFFER_MS` (120 / 120) - coyote-time grace window and jump-buffer window, consumed by `Player.jump()` via `InputBuffer`
- `Config.SAFE_START.FIRST_HAZARD_DELAY_MS` (2500) - how long a new run goes before `SpawnManager` allows any hazard/pattern to spawn
- `Config.FEEDBACK` - `intensity`, `screenShakeEnabled`, `hitStopEnabled`, and `presets` (`medium`/`heavy`) consumed by `FeedbackSystem` for screen shake and hit-stop

These four are plain JS constants, not JSON-file-driven - see [Architecture](architecture.md) for the systems that consume them (Input Forgiveness, Impact Feedback, and Safe Start & Difficulty Ramp sections).

---

**Last Updated:** 2026-07-02
**Schema Version:** 1.0.0
**Maintainer:** Development Team

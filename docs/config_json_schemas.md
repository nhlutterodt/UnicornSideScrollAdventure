# Configuration JSON Schemas

**Date:** January 23, 2026  
**Purpose:** Define the structure and validation rules for external configuration files  
**Related:** [config_externalization_implementation_plan.md](config_externalization_implementation_plan.md)

---

## Overview

The game uses three external JSON configuration files to store content data:
- `js/config/stages.json` - Stage/level definitions
- `js/config/items.json` - Collectible item definitions
- `js/config/abilities.json` - Power-up ability definitions

All JSON files follow a versioned wrapper format with metadata for tracking and migration.

---

## Common Schema Elements

### Version Metadata (All Files)

Every JSON file must include version metadata at the root level:

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

The Config.js loader includes validation:
- Checks for required fields
- Validates data types
- Logs warnings for malformed data
- Falls back to safe defaults on failure

Check browser console for validation messages:
```
[Config] Loading external configuration...
[ConfigValidator] Stage[0]: Missing 'name'  // Validation error example
[Config] Loaded 3 stages, 7 items, 2 abilities  // Success message
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

**Symptom:**
```
[ConfigValidator] Stage[2]: Missing or invalid 'levelStart'
```

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
- `js/Config.js` - Configuration loader
- `js/config/stages.json` - Stage definitions
- `js/config/items.json` - Item definitions
- `js/config/abilities.json` - Ability definitions

### Key Constants (Config.js)
- `Config.ITEM_TYPES` - Valid item type enum
- `Config.CONFIG_PATHS` - JSON file paths
- `Config.FALLBACK` - Fallback configurations

---

**Last Updated:** 2026-01-23  
**Schema Version:** 1.0.0  
**Maintainer:** Development Team

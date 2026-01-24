# Task: Add New Stage/Level

Follow this checklist to add a new themed stage to the game progression.

## Step 1: Plan Your Stage

Define stage characteristics:

- **Name**: What's the theme? (e.g., "Desert Dunes", "Night Sky", "Volcano Run")
- **Level Range**: When does it start? (e.g., level 5-9)
- **Difficulty**: Easier, same, or harder than previous stage?
- **Visual Theme**: Colors for sky, ground, fog effects
- **Physics**: Any gravity/speed/friction changes?
- **Spawn Rates**: Faster or slower obstacle/item spawning?

## Step 2: Open Config File

Edit: `js/config/stages.json`

Schema reference: [docs/config_json_schemas.md](../../../docs/config_json_schemas.md)

## Step 3: Add Stage Entry

Add new stage object to `stages` array:

```json
{
  "version": "1.1.0",
  "lastModified": "2026-01-23T12:00:00Z",
  "stages": [
    {
      "levelStart": 1,
      "name": "Your Stage Name",
      "theme": {
        "sky": ["#87CEEB", "#ffffff"],
        "ground": "#8B4513",
        "fog": "rgba(255, 255, 255, 0.2)",
        "textAccent": "#FFD700",
        "playerGlow": "#FFD700"
      },
      "modifiers": {
        "gravityMultiplier": 1.0,
        "jumpMultiplier": 1.0,
        "gameSpeedMultiplier": 1.0,
        "bounciness": 0,
        "friction": 1.0
      },
      "spawnRates": {
        "obstacleInterval": 2.0,
        "platformInterval": 3.0,
        "itemInterval": 6.0,
        "cloudInterval": 2.0
      },
      "ambient": {
        "particleColor": "#ffffff",
        "particleFrequency": 0.3
      }
    }
  ]
}
```

## Step 4: Configure Visual Theme

### Sky Colors
Use gradient colors (from top to bottom):

```json
// Daytime
"sky": ["#87CEEB", "#ffffff"]

// Sunset
"sky": ["#ff6e40", "#ffb74d", "#ffe0b2"]

// Night
"sky": ["#1a1a2e", "#16213e"]

// Space
"sky": ["#000000", "#1a0033"]
```

### Ground Color
Match your theme:

```json
"ground": "#8B4513"  // Brown earth
"ground": "#FFD700"  // Golden sand
"ground": "#2e7d32"  // Green grass
"ground": "#424242"  // Dark stone
```

### Fog Effect
Adds atmospheric depth:

```json
// Light fog
"fog": "rgba(255, 255, 255, 0.2)"

// Heavy fog
"fog": "rgba(255, 255, 255, 0.5)"

// Colored fog (sunset)
"fog": "rgba(255, 100, 50, 0.3)"

// No fog
"fog": "rgba(0, 0, 0, 0)"
```

### Text Accent
Color for UI elements:

```json
"textAccent": "#FFD700"  // Gold
"textAccent": "#FF6EC7"  // Pink
"textAccent": "#00FFFF"  // Cyan
```

## Step 5: Configure Physics Modifiers

See [game-balance.md](../game-balance.md) for detailed tuning guide.

### Easy/Beginner Stage
```json
"modifiers": {
  "gravityMultiplier": 0.8,      // Lighter gravity
  "jumpMultiplier": 1.1,          // Easier jumps
  "gameSpeedMultiplier": 0.9,     // Slower pace
  "bounciness": 0,
  "friction": 1.0
}
```

### Normal/Balanced Stage
```json
"modifiers": {
  "gravityMultiplier": 1.0,
  "jumpMultiplier": 1.0,
  "gameSpeedMultiplier": 1.0,
  "bounciness": 0,
  "friction": 1.0
}
```

### Hard/Expert Stage
```json
"modifiers": {
  "gravityMultiplier": 1.3,      // Heavier, faster falls
  "jumpMultiplier": 0.9,          // Lower jumps
  "gameSpeedMultiplier": 1.3,     // Faster pace
  "bounciness": 0.1,              // Slight bounce (harder control)
  "friction": 1.0
}
```

### Themed Physics Examples

**Sky/Cloud Stage** (floaty):
```json
"modifiers": {
  "gravityMultiplier": 0.6,
  "jumpMultiplier": 1.3,
  "friction": 0.7,
  "bounciness": 0
}
```

**Ice Stage** (slippery):
```json
"modifiers": {
  "gravityMultiplier": 1.0,
  "friction": 0.6,
  "bounciness": 0.2
}
```

**Volcano Stage** (heavy/intense):
```json
"modifiers": {
  "gravityMultiplier": 1.4,
  "gameSpeedMultiplier": 1.2,
  "friction": 1.0,
  "bounciness": 0
}
```

## Step 6: Configure Spawn Rates

Control entity frequency:

### Relaxed/Exploration
```json
"spawnRates": {
  "obstacleInterval": 3.0,   // Sparse obstacles
  "platformInterval": 3.5,   // Frequent platforms
  "itemInterval": 5.0,       // Generous items
  "cloudInterval": 2.0
}
```

### Balanced Challenge
```json
"spawnRates": {
  "obstacleInterval": 2.0,
  "platformInterval": 3.5,
  "itemInterval": 6.0,
  "cloudInterval": 2.0
}
```

### Intense Action
```json
"spawnRates": {
  "obstacleInterval": 1.2,   // Dense obstacles
  "platformInterval": 4.0,   // Rare platforms
  "itemInterval": 8.0,       // Scarce items
  "cloudInterval": 1.5
}
```

## Step 7: Configure Ambient Effects

Add atmospheric particles:

```json
"ambient": {
  "particleColor": "#ffffff",      // Particle color
  "particleFrequency": 0.3         // Spawn rate (0-1)
}
```

Examples:
- **Snow**: `"particleColor": "#ffffff", "particleFrequency": 0.5`
- **Rain**: `"particleColor": "#aaaaaa", "particleFrequency": 0.8`
- **Sparkles**: `"particleColor": "#FFD700", "particleFrequency": 0.2`
- **None**: `"particleFrequency": 0`

## Step 8: Set Level Trigger

Determine when stage activates:

```json
"levelStart": 5  // Stage starts at level 5
```

**Planning Progression**:
- Stage 1: `levelStart: 1` (tutorial)
- Stage 2: `levelStart: 3` (early game)
- Stage 3: `levelStart: 6` (mid game)
- Stage 4: `levelStart: 10` (late game)
- Stage 5: `levelStart: 15` (expert)

**Tip**: Stages are ordered by `levelStart`. Player experiences them in sequence.

## Step 9: Update Metadata

Increment version and update timestamp:

```json
{
  "version": "1.2.0",
  "lastModified": "2026-01-23T15:30:00Z",
  "stages": [...]
}
```

Version scheme:
- **Major** (X.0.0): Complete stage overhaul
- **Minor** (1.X.0): New stage added
- **Patch** (1.1.X): Tuning existing stage

## Step 10: Test Your Stage

### Load Game
1. Save `stages.json`
2. Hard refresh browser (`Ctrl+Shift+R`)
3. Check console for errors

### Quick Test (Console Commands)
```javascript
// Jump directly to your stage level
game.level.setLevel(5); // Replace 5 with your levelStart

// Check stage loaded
console.log('Current stage:', game.level.currentStage);
console.log('Stage name:', game.level.currentStage.name);

// Verify modifiers applied
console.log('Gravity:', game.player.physicsMod.gravityMultiplier);
console.log('Game speed mult:', game.level.currentStage.modifiers.gameSpeedMultiplier);
```

### Playtest Checklist
- [ ] Stage transitions smoothly from previous stage
- [ ] Visual theme renders correctly
- [ ] Sky gradient displays
- [ ] Ground color matches
- [ ] Fog effect visible (if enabled)
- [ ] Physics feel appropriate for difficulty
- [ ] Obstacles spawn at expected rate
- [ ] Items spawn at expected rate
- [ ] Game is beatable (can reach next stage)
- [ ] Difficulty feels progressive (not spike/drop)

### Difficulty Validation
Play through stage 3-5 times:
- Can you consistently pass it?
- Does it feel fair or frustrating?
- Are there long boring sections?
- Are there impossible patterns?

## Step 11: Balance Iteration

Common adjustments:

### Stage Too Hard
```json
// Reduce difficulty
"gravityMultiplier": 1.2 → 1.0
"obstacleInterval": 1.5 → 2.0
"itemInterval": 8.0 → 6.0
```

### Stage Too Easy
```json
// Increase difficulty
"gameSpeedMultiplier": 1.0 → 1.2
"obstacleInterval": 2.5 → 2.0
"itemInterval": 5.0 → 7.0
```

### Stage Feels Sluggish
```json
// Increase pacing
"gameSpeedMultiplier": 0.9 → 1.0
"gravityMultiplier": 0.8 → 1.0
```

### Stage Feels Chaotic
```json
// Reduce pacing
"gameSpeedMultiplier": 1.3 → 1.1
"obstacleInterval": 1.2 → 1.8
```

## Example: Complete Stage

Desert Dunes stage (mid-difficulty):

```json
{
  "levelStart": 5,
  "name": "Desert Dunes",
  "theme": {
    "sky": ["#FFD700", "#FFA500", "#FF6347"],
    "ground": "#D2691E",
    "fog": "rgba(255, 200, 100, 0.3)",
    "textAccent": "#FFD700",
    "playerGlow": "#FF6347"
  },
  "modifiers": {
    "gravityMultiplier": 1.1,
    "jumpMultiplier": 1.0,
    "gameSpeedMultiplier": 1.1,
    "bounciness": 0,
    "friction": 0.9
  },
  "spawnRates": {
    "obstacleInterval": 1.8,
    "platformInterval": 3.5,
    "itemInterval": 7.0,
    "cloudInterval": 3.0
  },
  "ambient": {
    "particleColor": "#FFD700",
    "particleFrequency": 0.15
  }
}
```

## Checklist

- [ ] Stage entry added to `stages.json`
- [ ] `levelStart` set appropriately
- [ ] `name` describes theme clearly
- [ ] `theme` colors chosen (sky, ground, fog)
- [ ] `modifiers` configured for difficulty
- [ ] `spawnRates` balanced for pacing
- [ ] `ambient` effects added (optional)
- [ ] `version` incremented
- [ ] `lastModified` timestamp updated
- [ ] JSON syntax valid (no trailing commas!)
- [ ] Tested in browser
- [ ] Stage transition smooth
- [ ] Difficulty feels progressive
- [ ] Game remains beatable

## Common Mistakes

❌ **Trailing comma in JSON**
```json
{
  "levelStart": 5,
  "name": "Test",  // ← Remove this comma if it's the last property
}
```

❌ **Wrong color format**
```json
"sky": "#87CEEB"  // Should be array: ["#87CEEB", "#ffffff"]
```

❌ **Missing required fields**
```json
{
  "levelStart": 5,
  // Missing "name", "theme", "modifiers", "spawnRates"
}
```

❌ **Level gap too large**
```json
"levelStart": 1   // First stage
"levelStart": 20  // Huge gap - players stuck on stage 1 for too long
```

## Resources

- [config_json_schemas.md](../../../docs/config_json_schemas.md) - Complete schema reference
- [game-balance.md](../game-balance.md) - Detailed tuning guide
- [stages.json](../../../js/config/stages.json) - Current stages for reference
- Color picker: [coolors.co](https://coolors.co) - Generate palettes

## Next Steps

After stage is working:
1. Add custom stage-specific obstacles (optional)
2. Add stage transition animation/cutscene (optional)
3. Create achievement for completing stage
4. A/B test with different difficulty settings
5. Gather player feedback on difficulty curve

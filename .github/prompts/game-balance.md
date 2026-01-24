# Game Balance & Feel Tuning

All gameplay tuning happens through JSON configuration files. **Never hardcode gameplay values in `.js` files.**

## Configuration Files

- **Stages**: [js/config/stages.json](../../js/config/stages.json) - Level themes, physics, progression
- **Items**: [js/config/items.json](../../js/config/items.json) - Collectibles, spawn rates, effects
- **Abilities**: [js/config/abilities.json](../../js/config/abilities.json) - Special powers, cooldowns

See [docs/config_json_schemas.md](../../docs/config_json_schemas.md) for complete schema documentation.

## Tuning Workflow

1. Edit JSON file in your editor
2. Save file
3. Hard refresh browser (`Ctrl+Shift+R`)
4. Test immediately - no compilation needed!
5. Iterate rapidly

## Physics Modifiers (Stage-Level)

Located in `stages.json` → `modifiers` object:

```json
{
  "modifiers": {
    "gravityMultiplier": 1.0,
    "jumpMultiplier": 1.0,
    "gameSpeedMultiplier": 1.0,
    "bounciness": 0,
    "friction": 1.0
  }
}
```

### Gravity Multiplier
Controls how heavy/floaty the player feels.

- **0.5 - 0.7**: "Moon physics" - very floaty, easy to control
- **0.8 - 0.9**: "Lighter" - slightly easier platforming
- **1.0**: Default balanced gravity
- **1.2 - 1.5**: "Heavy impact" - faster falls, tighter controls
- **1.5+**: "Speed runner" difficulty - very punishing

**Use Cases**:
- Early levels: 0.8 (beginner friendly)
- Mid levels: 1.0 (standard challenge)
- Late levels: 1.2 (expert difficulty)
- Themed stages: 0.6 for "Cloud World", 1.4 for "Volcano World"

### Jump Multiplier
Affects jump height and control.

- **0.8**: Shorter jumps, more hops needed
- **1.0**: Default jump height
- **1.2 - 1.5**: Higher jumps, easier to clear obstacles
- **1.5+**: "Super jump" power-up territory

**Combine with Gravity**:
```json
{
  "gravityMultiplier": 0.8,
  "jumpMultiplier": 1.2
}
```
Result: Floaty + high jumps = "Sky World" feel

### Game Speed Multiplier
Controls overall level speed (obstacles, clouds, platforms).

- **0.5 - 0.7**: "Tutorial pace" - very slow, forgiving
- **0.8 - 0.9**: "Relaxed" - easier to react
- **1.0**: Default speed
- **1.1 - 1.3**: "Fast-paced" - requires quick reflexes
- **1.5+**: "Bullet hell" mode - extreme challenge

**Dynamic Speed**: Game naturally increases speed every 10 points. Use this multiplier to adjust the starting baseline.

### Bounciness
Ground bounce effect when landing.

- **0**: No bounce (default)
- **0.1 - 0.3**: Subtle bounce, feels slightly springy
- **0.4 - 0.6**: Moderate bounce, requires landing control
- **0.7 - 0.9**: High bounce, very difficult to control
- **1.0**: Perfect bounce (unrealistic, but fun chaos mode)

**Note**: Values above 0.5 significantly change gameplay feel.

### Friction
Ground "stickiness" - affects air control and floatiness.

- **0.5 - 0.7**: "Ice physics" - slippery, reduced gravity feel
- **0.8 - 0.9**: Slightly reduced traction
- **1.0**: Normal traction (default)
- **1.1 - 1.3**: Increased traction (rarely used)

**Special Interaction**: Low friction makes gravity feel lighter due to reduced air resistance. Great for "Ice World" levels.

## Spawn Rates (Stage-Level)

Control how frequently obstacles/items/platforms appear:

```json
{
  "spawnRates": {
    "obstacleInterval": 1.5,
    "platformInterval": 3.0,
    "itemInterval": 5.0,
    "cloudInterval": 2.0
  }
}
```

### Obstacle Interval
Time (seconds) between obstacle spawns.

- **0.8 - 1.2**: Very dense obstacles, high difficulty
- **1.5 - 2.0**: Moderate density (default range)
- **2.5 - 3.5**: Sparse obstacles, relaxed gameplay
- **4.0+**: Very rare obstacles, exploration-focused

**Combine with Speed**:
```json
{
  "gameSpeedMultiplier": 1.3,
  "spawnRates": { "obstacleInterval": 2.0 }
}
```
Result: Fast-moving but sparse = "Speed run" level

### Platform Interval
Time between platform spawns.

- **2.0 - 2.5**: Frequent platforms, lots of vertical movement
- **3.0 - 4.0**: Moderate platforms (default)
- **5.0+**: Rare platforms, ground-focused gameplay
- **0**: Disable platforms entirely

### Item Interval
Time between collectible spawns.

- **3.0 - 4.0**: Common items, generous power-ups
- **5.0 - 7.0**: Moderate rarity (default)
- **8.0 - 12.0**: Rare items, strategic collection
- **15.0+**: Very rare, high-value rewards

**Balance**: More items = easier game (more lives/abilities)

## Item Effects (items.json)

Configure item power and duration:

```json
{
  "id": "life-boost",
  "type": "life",
  "effectValue": 1,
  "spawnWeight": 10
}
```

### Spawn Weight
Relative probability of spawning (higher = more common).

- **1-5**: Rare items (powerful abilities)
- **10-15**: Common items (standard power-ups)
- **20+**: Very common (basic collectibles)

**Total Weight**: Sum of all weights determines individual probabilities.
Example: Weights [5, 10, 15] → Probabilities [16.7%, 33.3%, 50%]

### Effect Value
Power of the item effect.

**Life Items**:
- `effectValue: 1` → +1 life
- `effectValue: 3` → +3 lives (rare, high power)

**Invincibility**:
- `duration: 3` → 3 seconds of invincibility
- `duration: 8` → 8 seconds (very powerful)

**Physics Modifiers**:
```json
{
  "type": "physics",
  "modifiers": {
    "gravityMultiplier": 0.5,
    "jumpMultiplier": 1.5
  },
  "duration": 5
}
```

## Difficulty Curves

### Easy to Hard Progression
```json
[
  {
    "levelStart": 1,
    "modifiers": { "gravityMultiplier": 0.8, "gameSpeedMultiplier": 0.9 },
    "spawnRates": { "obstacleInterval": 2.5 }
  },
  {
    "levelStart": 5,
    "modifiers": { "gravityMultiplier": 1.0, "gameSpeedMultiplier": 1.0 },
    "spawnRates": { "obstacleInterval": 2.0 }
  },
  {
    "levelStart": 10,
    "modifiers": { "gravityMultiplier": 1.2, "gameSpeedMultiplier": 1.2 },
    "spawnRates": { "obstacleInterval": 1.5 }
  }
]
```

### Themed World Variations
```json
{
  "name": "Sky Clouds",
  "modifiers": {
    "gravityMultiplier": 0.6,
    "friction": 0.7
  },
  "theme": {
    "sky": ["#a8e6ff", "#ffffff"],
    "fog": "rgba(255, 255, 255, 0.3)"
  }
}
```

### Challenge Mode
```json
{
  "name": "Expert Rush",
  "modifiers": {
    "gravityMultiplier": 1.4,
    "gameSpeedMultiplier": 1.5,
    "bounciness": 0.2
  },
  "spawnRates": {
    "obstacleInterval": 1.2,
    "itemInterval": 8.0
  }
}
```

## Testing Your Changes

### Quick Test Checklist
- [ ] Can player clear obstacles consistently?
- [ ] Does the level "feel" right? (too slow/fast/floaty?)
- [ ] Are items spawning at reasonable rates?
- [ ] Is progression smooth between stages?
- [ ] Test for 2-3 minutes minimum

### A/B Testing
1. Create two stage configs with different values
2. Set `levelStart` to same value
3. Play both, compare feel
4. Keep the better one

### Player Feedback Metrics
- **Completion Rate**: Can average players beat level 5?
- **Death Causes**: Dying to obstacles (too fast) or boredom (too slow)?
- **Score Distribution**: Are scores tightly clustered or widely spread?

## Common Feel Patterns

### "Chill Exploration"
```json
{
  "gravityMultiplier": 0.7,
  "gameSpeedMultiplier": 0.8,
  "obstacleInterval": 3.0,
  "itemInterval": 4.0
}
```

### "Balanced Challenge"
```json
{
  "gravityMultiplier": 1.0,
  "gameSpeedMultiplier": 1.0,
  "obstacleInterval": 2.0,
  "itemInterval": 6.0
}
```

### "Intense Action"
```json
{
  "gravityMultiplier": 1.3,
  "gameSpeedMultiplier": 1.3,
  "obstacleInterval": 1.3,
  "itemInterval": 8.0
}
```

### "Precision Platformer"
```json
{
  "gravityMultiplier": 1.1,
  "gameSpeedMultiplier": 0.9,
  "obstacleInterval": 2.5,
  "platformInterval": 2.0,
  "bounciness": 0
}
```

## Debugging Balance Issues

**Problem**: Game feels too easy
- Increase `gameSpeedMultiplier` by 0.1
- Decrease `obstacleInterval` by 0.3
- Decrease `itemInterval` (make items rarer)

**Problem**: Game feels too hard
- Decrease `gravityMultiplier` by 0.1 (more float time)
- Increase `itemInterval` frequency (decrease value)
- Add more forgiving `collisionPadding` on player

**Problem**: Game feels "slippery"
- Increase `friction` to 1.1-1.2
- Decrease `bounciness` to 0

**Problem**: Game feels "heavy/sluggish"
- Decrease `gravityMultiplier` to 0.8-0.9
- Increase `jumpMultiplier` to 1.1-1.2

## Version Control Best Practices

When tuning balance:
1. Always increment `version` in JSON files
2. Update `lastModified` timestamp
3. Comment in commit why changes were made
4. Keep old values in commit message for easy rollback

Example commit:
```
Rebalance Stage 3: Reduce difficulty

- gravityMultiplier: 1.2 → 1.0
- obstacleInterval: 1.5 → 2.0
Reason: 80% of playtesters couldn't pass stage 3
```

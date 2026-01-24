# Data-Driven Design Pattern: From Hard-Coded to Externalized Configuration

**Date:** January 23, 2026  
**Purpose:** Document the principles and patterns for transforming hard-coded business logic into data-driven systems  
**Context:** Learned from Config.js externalization analysis  
**Audience:** All developers working on this codebase

---

## The Problem: Hard-Coded Business Logic

### What is Hard-Coded Business Logic?

Hard-coded business logic refers to **content, rules, and behaviors embedded directly in source code** rather than externalized as data. This creates tight coupling between **what the system does** (code) and **what the system contains** (data).

### Example: Before (Hard-Coded)

```javascript
// ❌ ANTI-PATTERN: Business rules in code
export const Config = {
    STAGES: [
        {
            levelStart: 1,
            name: "Morning Meadow",
            theme: { primary: '#8ce68c', ... },
            modifiers: { gravityMultiplier: 1.0 }
        },
        {
            levelStart: 5,
            name: "Twilight Clouds",
            theme: { primary: '#a29bfe', ... },
            modifiers: { gravityMultiplier: 0.8 }
        }
    ]
};
```

### Problems Created

1. **Slow Iteration**: Every content change requires code edit → save → reload
2. **Merge Conflicts**: Multiple developers editing same file
3. **No Versioning**: Can't rollback content without code rollback
4. **Access Control**: Non-coders can't safely modify content
5. **Testing Friction**: Hard to test with alternate data sets
6. **Localization Blocked**: Text strings embedded in code
7. **A/B Testing Impossible**: Can't easily swap configurations
8. **Performance Testing**: Can't test with 100 stages without editing code

---

## The Solution: Data-Driven Architecture

### Core Principle

> **"Code defines structure and behavior. Data defines content and configuration."**

### Example: After (Data-Driven)

**Code (Config.js):**
```javascript
// ✅ PATTERN: Code loads and validates data
export const Config = {
    async loadStages() {
        try {
            const response = await fetch('./config/stages.json');
            const data = await response.json();
            this.STAGES = data.stages;
        } catch (error) {
            this.STAGES = this.FALLBACK_STAGES; // Safety net
        }
    }
};
```

**Data (config/stages.json):**
```json
{
  "version": "1.0.0",
  "stages": [
    {
      "levelStart": 1,
      "name": "Morning Meadow",
      "theme": { "primary": "#8ce68c" },
      "modifiers": { "gravityMultiplier": 1.0 }
    }
  ]
}
```

### Benefits Achieved

✅ **Fast Iteration**: Edit JSON → reload (no code change)  
✅ **Version Control**: Separate history for code vs. content  
✅ **Designer Access**: JSON is safer for non-coders  
✅ **Easy Testing**: Swap JSON files for test scenarios  
✅ **Localization Ready**: Strings in data files  
✅ **A/B Testing**: Different configs for different users  
✅ **Content Rollback**: Revert data without touching code  
✅ **Performance Testing**: Drop in stages-with-1000-items.json  

---

## When to Apply This Pattern

### ✅ **Good Candidates for Externalization**

| Data Type | Example | Why Externalize |
|-----------|---------|-----------------|
| **Content Collections** | Stages, Items, Enemies | High volatility, frequently modified |
| **Game Balancing** | Spawn rates, difficulty curves | Requires rapid iteration |
| **Visual Themes** | Colors, icons, emojis | Designers should control |
| **Localized Text** | Names, descriptions, UI text | Must support multiple languages |
| **Feature Flags** | Enable/disable features | Runtime control needed |
| **A/B Test Configs** | Alternate game modes | Need to swap without deploy |
| **Environment Settings** | Dev vs. prod configurations | Context-specific values |

### ❌ **Poor Candidates for Externalization**

| Data Type | Example | Why Keep in Code |
|-----------|---------|------------------|
| **Performance-Critical Constants** | GRAVITY, JUMP_FORCE | Used in tight loops |
| **Type Definitions** | ITEM_TYPES enum | Structural, not content |
| **Logic Algorithms** | Physics formulas | Behavior, not data |
| **System Architecture** | Class relationships | Code structure |
| **Low-Volatility Primitives** | Canvas dimensions | Rarely changes |
| **Development Tools** | DEBUG flags | Code-adjacent |

### Decision Flowchart

```
Is this data?
  ↓
  ├─ NO → Keep in code
  │
  └─ YES → Will it change frequently?
       ↓
       ├─ NO → Keep in code (for simplicity)
       │
       └─ YES → Who needs to change it?
            ↓
            ├─ Developers only → Keep in code (acceptable)
            │
            └─ Non-developers or runtime → EXTERNALIZE
```

---

## Implementation Patterns

### Pattern 1: Loader with Fallback (Recommended Starting Point)

**Use When:** First time externalizing config, need safety net

```javascript
class ConfigLoader {
    constructor() {
        // Inline fallback (last resort)
        this.FALLBACK_STAGES = [
            { name: 'Safe Mode', levelStart: 1 }
        ];
    }

    async loadStages() {
        try {
            const response = await fetch('./config/stages.json');
            if (!response.ok) throw new Error('HTTP error');
            
            const data = await response.json();
            this.STAGES = data.stages;
            
            Logger.info('Config', `Loaded ${this.STAGES.length} stages`);
        } catch (error) {
            Logger.error('Config', 'Failed to load stages, using fallback', error);
            this.STAGES = this.FALLBACK_STAGES;
        }
    }
}
```

**Pros:** Graceful degradation, easy to understand  
**Cons:** Duplicate data (JSON + fallback)

---

### Pattern 2: Schema Validation

**Use When:** Need type safety, complex data structures

```javascript
const StageSchema = {
    required: ['levelStart', 'name', 'theme', 'modifiers'],
    properties: {
        levelStart: { type: 'number', minimum: 1 },
        name: { type: 'string', minLength: 1 },
        theme: {
            type: 'object',
            required: ['primary', 'secondary', 'background']
        }
    }
};

async loadStages() {
    const data = await fetch('./config/stages.json').then(r => r.json());
    
    // Validate each stage
    for (const stage of data.stages) {
        if (!this.validateStage(stage)) {
            throw new Error(`Invalid stage: ${stage.name}`);
        }
    }
    
    this.STAGES = data.stages;
}

validateStage(stage) {
    if (!stage.levelStart || typeof stage.levelStart !== 'number') {
        Logger.error('Config', 'Stage missing levelStart', stage);
        return false;
    }
    
    if (!stage.name || stage.name.length === 0) {
        Logger.error('Config', 'Stage missing name', stage);
        return false;
    }
    
    // ... more validation
    
    return true;
}
```

**Pros:** Catches errors early, self-documenting  
**Cons:** More code, schemas need maintenance

---

### Pattern 3: Environment Overrides

**Use When:** Need different configs for dev/test/prod

```javascript
class ConfigLoader {
    constructor() {
        this.environment = this.detectEnvironment();
    }

    detectEnvironment() {
        if (window.location.hostname === 'localhost') return 'development';
        if (window.location.hostname.includes('staging')) return 'staging';
        return 'production';
    }

    async loadConfig() {
        // 1. Load base config
        const base = await this.fetchJson('./config/base.json');
        
        // 2. Load environment-specific overrides
        const overrides = await this.fetchJson(
            `./config/env/${this.environment}.json`
        );
        
        // 3. Merge (overrides win)
        this.config = this.deepMerge(base, overrides);
    }

    deepMerge(base, overrides) {
        return {
            ...base,
            ...overrides,
            // Handle nested objects
            nested: {
                ...base.nested,
                ...overrides.nested
            }
        };
    }
}
```

**File Structure:**
```
config/
  base.json              # Default config
  env/
    development.json     # Dev overrides (debug=true, slow gravity)
    staging.json         # Staging overrides
    production.json      # Prod overrides (analytics=true)
```

**Pros:** Single codebase, multiple environments  
**Cons:** Complex merging logic, harder debugging

---

### Pattern 4: Hot-Reload for Development

**Use When:** Need rapid iteration during development

```javascript
class ConfigLoader {
    constructor() {
        this.config = {};
        this.watchers = [];
    }

    async loadWithHotReload() {
        await this.loadConfig();
        
        // Only in development
        if (this.environment === 'development') {
            this.startHotReload();
        }
    }

    startHotReload() {
        const interval = setInterval(async () => {
            try {
                const newConfig = await this.fetchJson('./config/stages.json');
                
                // Check if changed
                if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
                    this.config = newConfig;
                    Logger.info('Config', '🔥 Hot-reloaded config');
                    
                    // Emit event for systems to react
                    eventManager.emit('CONFIG_RELOADED', this.config);
                }
            } catch (error) {
                Logger.warn('Config', 'Hot-reload failed', error);
            }
        }, 3000); // Check every 3 seconds
        
        this.watchers.push(interval);
    }

    stopHotReload() {
        this.watchers.forEach(clearInterval);
        this.watchers = [];
    }
}
```

**Pros:** Instant feedback, no reload needed  
**Cons:** Adds complexity, dev-only feature

---

## File Organization Patterns

### Small Project (1-3 Config Files)

```
js/
  Config.js              # Loader
  config/
    game-data.json       # All external data in one file
```

**When:** < 500 lines of config, simple game

---

### Medium Project (4-10 Config Files)

```
js/
  Config.js              # Loader
  config/
    stages.json          # Stages
    items.json           # Items
    abilities.json       # Abilities
    enemies.json         # Enemies
    progression.json     # Level progression
```

**When:** Multiple content categories, moderate complexity

---

### Large Project (10+ Config Files)

```
js/
  Config.js              # Main loader
  ConfigSchema.js        # Validation schemas
  config/
    base/                # Core settings
      physics.json
      systems.json
    content/             # Game content
      stages/
        world-1.json
        world-2.json
      items/
        collectibles.json
        power-ups.json
      enemies/
        basic.json
        bosses.json
    environments/        # Environment overrides
      development.json
      staging.json
      production.json
    locales/             # Translations
      en.json
      es.json
      fr.json
```

**When:** Large game, multiple worlds, localization needed

---

## Migration Strategy: 4-Phase Approach

### Phase 1: Identify & Categorize (30 min - 1 hour)

1. **Audit current config file**
   - List all properties
   - Categorize: primitives, systems, content
   
2. **Identify externalization candidates**
   - High volatility items (STAGES, ITEMS)
   - Content vs. constants
   - Complex nested structures

3. **Prioritize by impact**
   - What causes most pain when changing?
   - What do designers need to edit?
   - What needs A/B testing?

**Output:** List of items to externalize, ranked by priority

---

### Phase 2: Setup Infrastructure (1-2 hours)

1. **Create directory structure**
   ```bash
   mkdir js/config
   mkdir js/config/content
   ```

2. **Create initial JSON files** (empty but valid)
   ```json
   {
     "version": "1.0.0",
     "lastModified": "2026-01-23",
     "items": []
   }
   ```

3. **Add loader method** to Config.js
   ```javascript
   async loadExternalConfig() {
       this.STAGES = await this._fetchConfig('stages');
   }
   ```

4. **Update initialization** in main.js
   ```javascript
   async function init() {
       await Config.loadExternalConfig();
       // ... rest of init
   }
   ```

**Output:** Working loader infrastructure, empty JSON files

---

### Phase 3: Migrate Content (2-4 hours)

**For each content category:**

1. **Extract data** from Config.js to JSON
2. **Add version metadata** to JSON file
3. **Keep fallback** in Config.js temporarily
4. **Test loading** with valid JSON
5. **Test fallback** by breaking JSON intentionally
6. **Verify game behavior** unchanged
7. **Commit** (one category per commit)

**Example Commit Sequence:**
```
✅ Extract STAGES to external JSON
✅ Extract ITEMS to external JSON
✅ Extract ABILITIES to external JSON
✅ Remove fallbacks after stability proven
```

**Output:** All content externalized, game working

---

### Phase 4: Validation & Documentation (1 hour)

1. **Add validation** (optional but recommended)
   ```javascript
   validateStage(stage) {
       // Check required fields
   }
   ```

2. **Write tests**
   - Test loading valid JSON
   - Test fallback on error
   - Test with malformed JSON

3. **Update documentation**
   - How to add new stages
   - JSON schema reference
   - Common pitfalls

4. **Developer handoff**
   - Demo to team
   - Update README

**Output:** Validated, documented system ready for team use

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Async/Await

❌ **Wrong:**
```javascript
Config.loadExternalConfig(); // Returns Promise, not awaited!
const stage = Config.STAGES[0]; // STAGES is still undefined!
```

✅ **Correct:**
```javascript
await Config.loadExternalConfig();
const stage = Config.STAGES[0]; // Now STAGES is loaded
```

---

### Pitfall 2: No Fallback (Crashes on Load Failure)

❌ **Wrong:**
```javascript
async loadStages() {
    const data = await fetch('./config/stages.json').then(r => r.json());
    this.STAGES = data.stages; // Crashes if fetch fails!
}
```

✅ **Correct:**
```javascript
async loadStages() {
    try {
        const data = await fetch('./config/stages.json').then(r => r.json());
        this.STAGES = data.stages;
    } catch (error) {
        Logger.error('Config', 'Load failed, using fallback', error);
        this.STAGES = this.FALLBACK_STAGES; // Safety net
    }
}
```

---

### Pitfall 3: Malformed JSON (Silent Failures)

❌ **Wrong:**
```json
{
  "stages": [
    { "name": "Morning Meadow" } // Missing required fields!
  ]
}
```

✅ **Correct:**
```json
{
  "version": "1.0.0",
  "stages": [
    {
      "levelStart": 1,
      "name": "Morning Meadow",
      "theme": { "primary": "#8ce68c" },
      "modifiers": { "gravityMultiplier": 1.0 }
    }
  ]
}
```

**Solution:** Add validation before using data

---

### Pitfall 4: Performance Degradation (Loading in Game Loop)

❌ **Wrong:**
```javascript
update(deltaTime) {
    // Loading config EVERY FRAME! 🔥
    const stages = await Config.loadStages();
    // ...
}
```

✅ **Correct:**
```javascript
async init() {
    // Load ONCE at startup
    await Config.loadExternalConfig();
}

update(deltaTime) {
    // Use already-loaded config
    const stage = Config.STAGES[this.currentLevel];
    // ...
}
```

---

### Pitfall 5: Duplicate Data (JSON + Fallback Drift)

❌ **Problem:**
```javascript
// Config.js
FALLBACK_STAGES = [
    { name: 'Morning Meadow', levelStart: 1 }
];

// config/stages.json
{ 
    "stages": [
        { "name": "Morning Meadows", "levelStart": 2 } // Different!
    ]
}
```

✅ **Solution:** Minimal fallback
```javascript
// Fallback is intentionally minimal/safe, not a duplicate
FALLBACK_STAGES = [
    { name: 'Safe Mode', levelStart: 1, theme: {...} }
];
```

---

## Testing Strategies

### Unit Tests: Loader Logic

```javascript
describe('ConfigLoader', () => {
    it('should load stages from JSON', async () => {
        const loader = new ConfigLoader();
        await loader.loadStages();
        
        expect(loader.STAGES).toBeDefined();
        expect(loader.STAGES.length).toBeGreaterThan(0);
        expect(loader.STAGES[0]).toHaveProperty('name');
    });
    
    it('should use fallback on network error', async () => {
        // Mock fetch to fail
        global.fetch = jest.fn(() => Promise.reject('Network error'));
        
        const loader = new ConfigLoader();
        await loader.loadStages();
        
        expect(loader.STAGES).toEqual(loader.FALLBACK_STAGES);
    });
    
    it('should validate stage structure', () => {
        const loader = new ConfigLoader();
        const validStage = { levelStart: 1, name: 'Test', theme: {...} };
        const invalidStage = { name: 'Test' }; // Missing levelStart
        
        expect(loader.validateStage(validStage)).toBe(true);
        expect(loader.validateStage(invalidStage)).toBe(false);
    });
});
```

### Integration Tests: Game Behavior

```javascript
describe('Game with External Config', () => {
    beforeEach(async () => {
        // Load test config
        await Config.loadExternalConfig();
    });
    
    it('should transition through all stages', async () => {
        const game = new Game();
        await game.init();
        
        for (let i = 0; i < Config.STAGES.length; i++) {
            game.advanceToNextStage();
            expect(game.currentStage.name).toBe(Config.STAGES[i].name);
        }
    });
    
    it('should spawn items from config', async () => {
        const game = new Game();
        await game.init();
        
        // Trigger item spawn
        game.spawnItem();
        
        const spawnedItem = game.items[0];
        const configItem = Config.ITEMS.find(i => i.id === spawnedItem.id);
        
        expect(configItem).toBeDefined();
        expect(spawnedItem.name).toBe(configItem.name);
    });
});
```

### Manual Testing Checklist

- [ ] Load game with valid config (all features work)
- [ ] Load game with missing JSON file (fallback activates)
- [ ] Load game with malformed JSON (error logged, fallback used)
- [ ] Modify JSON while game running (hot-reload works if enabled)
- [ ] Test in different environments (dev, staging, prod configs)
- [ ] Verify performance (no slowdown compared to hard-coded)

---

## Real-World Examples from This Codebase

### Success Case 1: Storage System

**Before:** Hard-coded save keys scattered across files  
**After:** Centralized in Storage.js with namespacing

```javascript
// Using the pattern correctly
const outfit = Storage.load('current_outfit', defaultOutfit);
```

**Lesson:** Even small externalization patterns create consistency

---

### Success Case 2: Customization Studio

**Before:** Color options hard-coded in HTML  
**After:** Data-driven from outfit configuration object

```javascript
// Data-driven approach
const outfit = {
    body: 'pink',
    mane: 'gold',
    accessory: 'none',
    trail: 'rainbow'
};
```

**Lesson:** Treating state as data enables flexibility

---

### Opportunity Case: Config.js

**Current:** 158 lines of hard-coded game content  
**Proposed:** Extract to JSON, keep primitives in code

**Impact:**
- Faster iteration on stages/items/abilities
- Designers can modify content safely
- Version control per content type
- Testing with alternate configs

**Lesson:** This is the exact pattern we're implementing

---

## Decision Framework

### Question 1: Is this data or code?

- **Data:** Information that defines "what" (stages, items, colors)
- **Code:** Logic that defines "how" (physics calculations, rendering)

### Question 2: Who changes it and how often?

| Who | How Often | Decision |
|-----|-----------|----------|
| Developers | Rarely | Keep in code |
| Developers | Frequently | Consider externalizing |
| Non-developers | Any frequency | Externalize |
| Runtime/Users | Any frequency | Must externalize |

### Question 3: What's the cost/benefit?

**High Benefit Indicators:**
- Content changes weekly
- Multiple people edit same config
- Need to A/B test variations
- Designers request direct access
- Planning localization
- Need environment-specific configs

**High Cost Indicators:**
- Used in tight loops (performance)
- Structural/architectural data
- Complex validation required
- Team unfamiliar with async patterns

**Rule of Thumb:** If benefit > cost, externalize. If unsure, start small (one config file).

---

## Summary: Key Takeaways

### 1. **Separate Content from Code**
Code defines structure and behavior. Data defines content and configuration. Keep them separate.

### 2. **Always Provide Fallbacks**
External data can fail to load. Always have inline fallbacks to prevent crashes.

### 3. **Validate External Data**
JSON doesn't enforce types. Add validation to catch errors early.

### 4. **Start Small, Iterate**
Don't externalize everything at once. Pick the highest-pain item, prove the pattern, expand.

### 5. **Use Version Metadata**
Include version numbers in JSON files for future migrations.

### 6. **Test Failure Scenarios**
Test with missing files, malformed JSON, network failures. Your fallbacks must work.

### 7. **Document the Schema**
JSON files need documentation. What fields are required? What are valid values?

### 8. **Consider Performance**
Load config once at startup, not in game loops. Cache loaded data.

---

## Further Reading

- [Config.js Externalization Analysis](./config_externalization_analysis.md) - Specific implementation options for our project
- [Local Storage Analysis](./local_storage_analysis.md) - Patterns for data persistence
- [Item System Architecture](./item_system_architecture.md) - Example of data-driven entity system
- [Coding Standards](./coding_standards.md) - Project conventions and patterns

---

## Changelog

- **2026-01-23**: Initial document created from Config.js analysis
- Future updates should be logged here

---

**Remember:** The goal isn't to externalize everything—it's to externalize the right things for the right reasons. When in doubt, ask: "Does this change frequently, and would externalizing it reduce friction?" If yes, externalize. If no, keep it simple and in code.

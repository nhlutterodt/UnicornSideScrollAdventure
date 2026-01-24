# Config.js Externalization Analysis

**Date:** January 23, 2026  
**Purpose:** Analyze hard-coded configuration in Config.js and propose data-driven alternatives  
**Scope:** Config.js refactoring to externalize data while maintaining fallback capabilities

---

## Executive Summary

Config.js currently contains **158 lines** of hard-coded game configuration data. While this provides a centralized source of truth, it creates several maintainability and extensibility challenges:

- **Hard-coded business logic** (STAGES, ITEMS, ABILITIES) makes iteration slow
- **No runtime modification** without code changes and redeployment
- **Difficult to A/B test** or create variations of content
- **Merge conflicts** when multiple developers modify configuration
- **No versioning** of game content separate from code

This analysis proposes two distinct approaches to make Config.js data-driven while maintaining its role as a **robust fallback system**.

---

## Current State Analysis

### Configuration Categories

Config.js can be categorized into three distinct types of data:

#### 1. **Primitive Constants** (Low volatility, high performance sensitivity)
```javascript
GRAVITY: 1500
JUMP_FORCE: -650
GROUND_HEIGHT: 60
MAX_GAME_SPEED: 1200
DEBUG: true
```
**Characteristics:**
- Simple numeric/boolean values
- Frequently accessed during game loop
- Rarely change after initial tuning
- Performance-critical (used in physics calculations)

#### 2. **System Configuration** (Medium volatility, structural)
```javascript
LEVEL_PROGRESSION: { ... }
SPAWN_INTERVAL_MIN: 1.0
PLATFORM_PLACEMENT_MODE: 'probabilistic'
PARTICLE_SYSTEM: { ... }
```
**Characteristics:**
- Nested objects with related settings
- Define system behavior
- Change during balancing phases
- Not content, but tuning parameters

#### 3. **Content Data** (High volatility, business logic)
```javascript
STAGES: [ ... ]        // 3 stage definitions with themes
ITEMS: [ ... ]         // 7 item configurations
ABILITIES: [ ... ]     // 2 ability definitions
ENVIRONMENT_MAPPING: { ... }
```
**Characteristics:**
- Rich, nested data structures
- Define game content and experiences
- Likely to expand (more stages, items, abilities)
- Non-technical stakeholders may want to modify
- Ideal candidates for external files

### Problems with Current Approach

1. **Monolithic File**: 158 lines mixing constants, systems, and content
2. **Version Control Conflicts**: Multiple developers editing same file
3. **No Content Versioning**: Can't rollback just "Stage 3" without code rollback
4. **Iteration Speed**: Requires code change → save → reload to test content
5. **No Hot-Reloading**: Can't update content in dev without restart
6. **Testing Difficulty**: Hard to test with alternate configurations
7. **Localization Blocked**: Stage names, item names hard-coded
8. **Designer Friction**: Non-coders can't safely edit game content

---

## Option 1: Hybrid Externalization (Recommended)

### Philosophy
**"Config.js owns primitives and system structure. JSON owns content and data."**

This approach recognizes that not all configuration should be externalized. Primitive constants remain in Config.js for performance and developer convenience, while rich content data moves to JSON files.

### Structure

```
js/
  Config.js              # Primitives + system defaults + loader logic
  config/                # NEW directory
    stages.json          # All stage definitions
    items.json           # All item definitions
    abilities.json       # All ability definitions
    progression.json     # Level progression rules
    particle-effects.json # Particle system presets
```

### Config.js Responsibilities (After Refactor)

```javascript
export const Config = {
    // --- Hard Constants (STAY in Config.js) ---
    GRAVITY: 1500,
    JUMP_FORCE: -650,
    GROUND_HEIGHT: 60,
    INITIAL_GAME_SPEED: 350,
    MAX_GAME_SPEED: 1200,
    DEBUG: true,
    SHOW_COLLIDERS: false,
    LOG_LEVEL: 'DEBUG',

    // --- Structural Defaults (STAY in Config.js) ---
    ITEM_TYPES: {
        ABILITY: 'ability',
        LIFE: 'life',
        PHYSICS: 'physics',
        INVINCIBILITY: 'invincibility',
        WORLD: 'world'
    },

    // --- Paths to External Data (NEW) ---
    CONFIG_PATHS: {
        STAGES: './js/config/stages.json',
        ITEMS: './js/config/items.json',
        ABILITIES: './js/config/abilities.json',
        PROGRESSION: './js/config/progression.json',
        PARTICLES: './js/config/particle-effects.json'
    },

    // --- Inline Fallbacks (NEW - used if fetch fails) ---
    FALLBACK: {
        STAGES: [ /* Minimal safe defaults */ ],
        ITEMS: [ /* Basic items only */ ],
        ABILITIES: [ /* Core abilities */ ]
    },

    // --- Loader Methods (NEW) ---
    async loadExternalConfig() {
        const loaded = {
            stages: await this._fetchConfig('STAGES'),
            items: await this._fetchConfig('ITEMS'),
            abilities: await this._fetchConfig('ABILITIES'),
            progression: await this._fetchConfig('PROGRESSION')
        };
        
        // Merge into Config object
        Object.assign(this, loaded);
        return loaded;
    },

    async _fetchConfig(key) {
        try {
            const path = this.CONFIG_PATHS[key];
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            Logger.warn('Config', `Failed to load ${key}, using fallback`, error);
            return this.FALLBACK[key] || [];
        }
    }
};
```

### Example External File: `stages.json`

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
    },
    {
      "levelStart": 5,
      "name": "Twilight Clouds",
      "theme": {
        "primary": "#a29bfe",
        "secondary": "#6c5ce7",
        "background": "#2d3436",
        "elements": ["✨", "⭐", "☁️"]
      },
      "modifiers": {
        "gravityMultiplier": 0.8,
        "timeScale": 1.1,
        "friction": 0.5,
        "bounciness": 0.3
      }
    }
  ]
}
```

### Implementation Steps

1. **Create `js/config/` directory**
2. **Extract content to JSON files** with versioning metadata
3. **Add loader methods** to Config.js with fallback logic
4. **Update initialization sequence** in main.js:
   ```javascript
   async function init() {
       await Config.loadExternalConfig();
       // ... rest of initialization
   }
   ```
5. **Add validation layer** (optional but recommended):
   ```javascript
   validateStage(stage) {
       if (!stage.name || !stage.levelStart) {
           Logger.error('Config', 'Invalid stage data', stage);
           return false;
       }
       return true;
   }
   ```

### Pros
✅ **Separation of concerns**: Code vs. content  
✅ **Performance preserved**: Primitives still inline  
✅ **Graceful degradation**: Fallbacks prevent crashes  
✅ **Version control friendly**: Separate file histories  
✅ **Hot-reload capable**: Can watch JSON files in dev  
✅ **Designer accessible**: JSON easier than JavaScript  
✅ **Testable**: Can inject mock configs easily  
✅ **Incremental**: Can migrate category by category  

### Cons
❌ **Async initialization**: Game must wait for fetch  
❌ **Two sources of truth**: Code fallbacks + JSON files  
❌ **Network dependency**: Requires working fetch (mitigated by fallbacks)  
❌ **Validation needed**: JSON doesn't enforce types  

### Migration Complexity: **Medium** (3-5 hours)

---

## Option 2: Full Externalization with Schema Validation

### Philosophy
**"Config.js is a loader and validator. All data lives externally."**

This approach treats Config.js as pure infrastructure—a configuration loader with schema validation and environment-specific overrides. ALL configuration, including primitives, moves to external files.

### Structure

```
js/
  Config.js              # Pure loader + validator + schema definitions
  ConfigSchema.js        # JSON Schema definitions (NEW)
  config/
    base/
      physics.json       # Gravity, jump force, etc.
      systems.json       # Spawn intervals, debug flags
      progression.json   # Level progression rules
      content.json       # Master list of content files
    content/
      stages.json
      items.json
      abilities.json
      particles.json
      platforms.json
    environments/          # Optional override layer
      development.json    # Dev-specific settings
      production.json     # Prod-specific settings
      testing.json        # Test configurations
```

### Config.js as Loader (After Refactor)

```javascript
import { ConfigSchema } from './ConfigSchema.js';

export class ConfigLoader {
    constructor() {
        this.config = {};
        this.environment = this._detectEnvironment();
        this.isLoaded = false;
    }

    /**
     * Load all configuration files with environment overrides
     * @returns {Promise<Object>} Fully merged and validated config
     */
    async load() {
        try {
            // 1. Load base configurations
            const base = await this._loadBaseConfig();
            
            // 2. Load content configurations
            const content = await this._loadContentConfig();
            
            // 3. Apply environment overrides
            const overrides = await this._loadEnvironmentOverrides();
            
            // 4. Merge with priority: base < content < environment
            this.config = this._deepMerge(base, content, overrides);
            
            // 5. Validate against schema
            const validation = ConfigSchema.validate(this.config);
            if (!validation.valid) {
                throw new Error(`Config validation failed: ${validation.errors}`);
            }
            
            this.isLoaded = true;
            Logger.info('Config', `Loaded config for ${this.environment} environment`);
            return this.config;
            
        } catch (error) {
            Logger.error('Config', 'Failed to load configuration', error);
            return this._loadHardcodedFallback();
        }
    }

    async _loadBaseConfig() {
        const [physics, systems, progression] = await Promise.all([
            this._fetchJson('./js/config/base/physics.json'),
            this._fetchJson('./js/config/base/systems.json'),
            this._fetchJson('./js/config/base/progression.json')
        ]);
        
        return { ...physics, ...systems, ...progression };
    }

    async _loadContentConfig() {
        // Read content manifest
        const manifest = await this._fetchJson('./js/config/base/content.json');
        
        // Load all content files in parallel
        const contentPromises = Object.entries(manifest.files).map(
            async ([key, path]) => {
                const data = await this._fetchJson(path);
                return [key, data];
            }
        );
        
        const contentArray = await Promise.all(contentPromises);
        return Object.fromEntries(contentArray);
    }

    async _loadEnvironmentOverrides() {
        const envPath = `./js/config/environments/${this.environment}.json`;
        try {
            return await this._fetchJson(envPath);
        } catch {
            return {}; // No overrides for this environment
        }
    }

    _detectEnvironment() {
        // Check URL, hostname, or explicit flag
        if (window.location.hostname === 'localhost') return 'development';
        if (window.location.search.includes('test=1')) return 'testing';
        return 'production';
    }

    _deepMerge(...objects) {
        // Deep merge implementation
    }

    async _fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);
        return response.json();
    }

    _loadHardcodedFallback() {
        // Minimal inline fallback for catastrophic failures
        return {
            GRAVITY: 1500,
            JUMP_FORCE: -650,
            STAGES: [{ name: 'Safe Mode', levelStart: 1 }],
            // ... absolute minimum config
        };
    }

    // Convenience getters
    get(path, defaultValue) {
        return this._getByPath(this.config, path) ?? defaultValue;
    }

    _getByPath(obj, path) {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
    }
}

// Export singleton instance
export const Config = new ConfigLoader();
```

### ConfigSchema.js (Validation)

```javascript
export const ConfigSchema = {
    physics: {
        GRAVITY: { type: 'number', min: 0, max: 5000 },
        JUMP_FORCE: { type: 'number', min: -2000, max: 0 },
        GROUND_HEIGHT: { type: 'number', min: 0, max: 200 }
    },
    
    stages: {
        type: 'array',
        minLength: 1,
        items: {
            type: 'object',
            required: ['levelStart', 'name', 'theme', 'modifiers'],
            properties: {
                levelStart: { type: 'number', min: 1 },
                name: { type: 'string', minLength: 1 },
                theme: {
                    type: 'object',
                    required: ['primary', 'secondary', 'background']
                }
            }
        }
    },
    
    validate(config) {
        // Validation logic using schema definitions
        const errors = [];
        
        // Validate each section
        if (typeof config.GRAVITY !== 'number' || config.GRAVITY < 0) {
            errors.push('GRAVITY must be a positive number');
        }
        
        if (!Array.isArray(config.STAGES) || config.STAGES.length === 0) {
            errors.push('STAGES must be a non-empty array');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
};
```

### Example: `config/base/content.json` (Manifest)

```json
{
  "version": "1.0.0",
  "files": {
    "STAGES": "./js/config/content/stages.json",
    "ITEMS": "./js/config/content/items.json",
    "ABILITIES": "./js/config/content/abilities.json",
    "PARTICLES": "./js/config/content/particles.json",
    "PLATFORMS": "./js/config/content/platforms.json"
  }
}
```

### Example: `config/environments/development.json`

```json
{
  "DEBUG": true,
  "SHOW_COLLIDERS": true,
  "LOG_LEVEL": "DEBUG",
  "INITIAL_GAME_SPEED": 200,
  "STAGES": [
    {
      "name": "Test Stage",
      "levelStart": 1,
      "theme": {
        "primary": "#ff00ff",
        "secondary": "#00ffff",
        "background": "#000000",
        "elements": ["🧪", "🔬"]
      },
      "modifiers": {
        "gravityMultiplier": 0.5,
        "timeScale": 0.5
      }
    }
  ]
}
```

### Implementation Steps

1. **Create ConfigSchema.js** with validation rules
2. **Refactor Config.js** to ConfigLoader class
3. **Create directory structure** (base, content, environments)
4. **Extract ALL config** to appropriate JSON files
5. **Create content manifest** file
6. **Implement deep merge** algorithm
7. **Add schema validation** with helpful error messages
8. **Update all imports**:
   ```javascript
   // BEFORE
   import { Config } from './Config.js';
   const gravity = Config.GRAVITY;
   
   // AFTER
   import { Config } from './Config.js';
   await Config.load(); // In init
   const gravity = Config.get('GRAVITY');
   ```
9. **Add config hot-reload** for development (optional):
   ```javascript
   if (Config.environment === 'development') {
       setInterval(() => Config.reload(), 5000);
   }
   ```

### Pros
✅ **Complete separation**: Zero hard-coded values  
✅ **Environment-aware**: Different configs per environment  
✅ **Type safety**: Schema validation catches errors early  
✅ **Hot-reload ready**: Can watch and reload configs  
✅ **A/B testing**: Easy to swap config files  
✅ **Content versioning**: Full history per config file  
✅ **Override system**: Base + environment layering  
✅ **Professional**: Industry-standard approach  

### Cons
❌ **High complexity**: Significant architectural change  
❌ **Breaking changes**: All imports must be updated  
❌ **Async everything**: Must await Config.load() before use  
❌ **Debugging harder**: Config values come from multiple sources  
❌ **Validation overhead**: Schema must be maintained  
❌ **Initial cost**: 8-12 hours of refactoring  

### Migration Complexity: **High** (8-12 hours)

---

## Comparison Matrix

| Criteria | Option 1: Hybrid | Option 2: Full External |
|----------|------------------|------------------------|
| **Development Time** | 3-5 hours | 8-12 hours |
| **Breaking Changes** | Minimal | Extensive |
| **Code Complexity** | Low-Medium | High |
| **Performance Impact** | Negligible | Minimal (one-time load) |
| **Hot-Reload Support** | Partial | Full |
| **Environment Overrides** | Manual | Built-in |
| **Type Safety** | None | Schema validation |
| **Backward Compatible** | Yes | No |
| **Content Versioning** | Content only | Everything |
| **A/B Testing** | Manual | Easy |
| **Designer Friendly** | Yes | Very Yes |
| **Testing Support** | Good | Excellent |

---

## Recommendations

### For Immediate Implementation: **Option 1 (Hybrid)**

**Why:**
- Minimal risk and breaking changes
- Solves the core problem (hard-coded content)
- Preserves performance-critical inline constants
- Incremental migration path
- Can be done in a single development session

**Next Steps:**
1. Create `js/config/` directory
2. Extract STAGES to `stages.json` (test first)
3. Add loader method to Config.js
4. Test thoroughly
5. Extract ITEMS, then ABILITIES
6. Add fallback mechanisms
7. Document usage patterns

### For Future Evolution: **Option 2 (Full External)**

**When to consider:**
- After Option 1 is stable and proven
- When you need environment-specific configs
- When A/B testing becomes a priority
- When non-technical stakeholders need full control
- When you have time for a major refactor

**Migration Path from Option 1:**
1. Create ConfigSchema.js gradually
2. Add environment overrides alongside existing system
3. Migrate primitives to JSON one category at a time
4. Update imports incrementally
5. Remove old inline values last

---

## Implementation Checklist (Option 1)

### Phase 1: Setup (30 minutes)
- [ ] Create `js/config/` directory
- [ ] Create empty JSON files (stages.json, items.json, abilities.json)
- [ ] Add `.gitignore` rules if needed
- [ ] Create backup of current Config.js

### Phase 2: Extract Content (2 hours)
- [ ] Extract STAGES array to stages.json
- [ ] Extract ITEMS array to items.json  
- [ ] Extract ABILITIES array to abilities.json
- [ ] Add version metadata to each JSON file
- [ ] Validate JSON syntax

### Phase 3: Loader Implementation (1.5 hours)
- [ ] Add CONFIG_PATHS constant to Config.js
- [ ] Implement loadExternalConfig() method
- [ ] Implement _fetchConfig() helper with error handling
- [ ] Add FALLBACK object with minimal safe defaults
- [ ] Test loader with intentionally broken JSON

### Phase 4: Integration (1 hour)
- [ ] Update main.js initialization to await config load
- [ ] Update any systems that reference Config.STAGES, etc.
- [ ] Test in browser
- [ ] Test fallback by disconnecting network
- [ ] Update documentation

### Phase 5: Validation (30 minutes)
- [ ] Manual QA: Do stages load correctly?
- [ ] Manual QA: Do items spawn correctly?
- [ ] Manual QA: Do abilities work?
- [ ] Test fallback scenario
- [ ] Verify no console errors
- [ ] Performance check (load time)

---

## Testing Strategy

### Unit Tests
```javascript
describe('Config Loader', () => {
    it('should load stages from JSON', async () => {
        await Config.loadExternalConfig();
        expect(Config.STAGES).toHaveLength(3);
        expect(Config.STAGES[0].name).toBe('Morning Meadow');
    });
    
    it('should use fallback on fetch failure', async () => {
        // Mock fetch to fail
        global.fetch = jest.fn(() => Promise.reject('Network error'));
        await Config.loadExternalConfig();
        expect(Config.STAGES).toEqual(Config.FALLBACK.STAGES);
    });
    
    it('should validate JSON structure', async () => {
        // Test with malformed JSON
    });
});
```

### Integration Tests
- Load game and verify stage transitions work
- Collect items and verify correct behavior
- Activate abilities and verify effects
- Test with empty JSON files (fallback scenario)
- Test with malformed JSON (error handling)

---

## Future Enhancements

### After Option 1 is Stable

1. **Config Editor UI** (Developer Tools)
   - Visual editor for stages, items, abilities
   - Live preview of changes
   - Export to JSON button

2. **Hot-Reload in Development**
   ```javascript
   if (Config.DEBUG) {
       setInterval(async () => {
           await Config.loadExternalConfig();
           Logger.info('Config reloaded from disk');
       }, 3000);
   }
   ```

3. **Content Versioning & Migration**
   ```javascript
   async _fetchConfig(key) {
       const data = await fetch(path).then(r => r.json());
       
       // Migrate old versions
       if (data.version === '1.0.0') {
           data = migrateV1toV2(data);
       }
       
       return data;
   }
   ```

4. **Localization Support**
   ```json
   {
     "name": {
       "en": "Morning Meadow",
       "es": "Pradera Matutina",
       "fr": "Pré du Matin"
     }
   }
   ```

5. **Remote Config** (Advanced)
   - Load from CDN or API
   - Cache locally
   - Version checking
   - Feature flags

---

## Conclusion

Config.js currently serves dual purposes: **constant provider** and **content database**. This analysis proposes separating these concerns:

**Option 1 (Hybrid)** provides an immediate, low-risk solution that addresses 80% of the pain points with 20% of the effort. It maintains Config.js as a fallback while externalizing volatile content data.

**Option 2 (Full External)** represents a more comprehensive architectural shift suitable for larger projects with complex environment needs and content pipelines.

**Recommendation**: Start with Option 1, prove the pattern, then evaluate Option 2 based on actual needs and pain points discovered during Option 1 usage.

Both approaches transform Config.js from a **monolithic data file** into a **smart configuration loader** that serves as a safety net while empowering data-driven game design.

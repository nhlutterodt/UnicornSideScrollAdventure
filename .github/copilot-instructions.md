# Copilot Instructions for Unicorn Magic Run

## Project Overview
This is a vanilla JavaScript HTML5 Canvas game using a data-driven, Entity-Component-System (ECS) architecture. The codebase follows **strict separation of concerns**: entities are pure state containers, systems contain logic, and configuration lives in external JSON files.

## Critical Architecture Patterns

### 0. Initialization & Load Order (CRITICAL FOR GAME START)
**MUST READ**: [.github/initialization-guidelines.md](.github/initialization-guidelines.md) before modifying Game.js or main.js.

**CRITICAL**: HTML pages load ONLY their main module:
- `index.html` → `main.js`
- `customize.html` → `customize-main.js`
- `settings.html` → `settings-main.js`

**NEVER add separate `<script>` tags for libraries**. For UMD libraries (like Howler.js), create ESM wrappers that dynamically load via script injection (see `js/libs/howler-wrapper.js` as reference pattern).

All initialization follows strict order:
1. **Async Config Loading** - `await Config.loadExternalConfig()` BEFORE `new Game()`
2. **DOM Ready** - Initialize ONLY in `DOMContentLoaded` event
3. **Validation** - Check all DOM elements exist with clear error messages
4. **Event Binding** - Register handlers AFTER elements validated
5. **Loop Start** - Game loop runs continuously, but logic gated by state

**Common Issue**: "Start button doesn't work" → Check button exists before binding:
```javascript
const buttons = Dom.all('.js-start-btn');
if (buttons.length === 0) {
    logger.warn('Game', 'No start buttons found');
}
```

**Debug Tool**: `scripts/init-diagnostics.js` - Copy to browser console to diagnose initialization issues.

### 1. Entity-Registry Pattern (Core Foundation)
All game objects MUST extend `Entity` from [js/core/Entity.js](js/core/Entity.js):
- Entities auto-register with the singleton `engineRegistry` (from [js/core/Registry.js](js/core/Registry.js))
- The Registry provides lifecycle management: `updateAll()`, `drawAll()`, `getByType()`, `clear()`
- Entities get unique IDs like `obstacle_5` or `player_1` automatically
- Cleanup via `entity.destroy()` which sets `isDead=true` and unregisters from Registry
- **Anti-pattern**: Creating game objects that don't extend Entity breaks collision detection, rendering, and update loops

```javascript
// CORRECT: All entities inherit from Entity
import { Entity } from './core/Entity.js';
export class MyEntity extends Entity {
    constructor(x, y) {
        super(x, y, 50, 50, 'my-entity-type'); // Auto-registers
    }
}
```

### 2. Manager Pattern (Strict Decoupling)
Business logic lives in **static System classes**, NOT in entities. See [docs/coding_standards.md](docs/coding_standards.md) section 4.4.

**Example**: [js/systems/AbilityManager.js](js/systems/AbilityManager.js) handles all item effects instead of cluttering `Player.js` with switch statements.
- Entities emit events via `EventManager`

### 2.5. Audio Integration with Howler.js
The project uses [Howler.js v2.2.3](js/libs/howler.min.js) hosted locally for offline gameplay.

**Critical Rules**:
- **NEVER use `html5: true`** for short sound effects or procedurally generated audio
- `html5: true` is ONLY for large files (>5MB) or streaming audio (live streams, long music tracks)
- Short sounds (<5 seconds) should use **Web Audio API** (Howler's default)
- Base64 data URLs work perfectly with Web Audio API
- HTML5 Audio has a limited pool (default: 10 elements) that exhausts quickly

**Correct Pattern**:
```javascript
// ✅ CORRECT - Short sound, let Howler use Web Audio API
const sound = new Howl({
    src: ['sound.mp3'],  // or base64 data URL
    volume: 0.5
});

// ❌ WRONG - html5: true causes "HTML5 Audio pool exhausted" errors
const sound = new Howl({
    src: ['short-effect.mp3'],
    html5: true  // Don't use this for short sounds!
});

// ✅ CORRECT - Large file or streaming
const music = new Howl({
    src: ['long-soundtrack.mp3'],
    html5: true,  // OK for large files
    loop: true
});
```

**Audio Generation Pipeline** (for procedural sounds):
1. Web Audio API `OfflineAudioContext` generates waveforms
2. Convert `AudioBuffer` to WAV format (PCM 16-bit)
3. Encode WAV `ArrayBuffer` to base64
4. Create data URL: `data:audio/wav;base64,{base64}`
5. Load into Howl with Web Audio API (default)

See [audio-test.html](audio-test.html) and [js/audio-test-main.js](js/audio-test-main.js) for reference implementation.
- Systems subscribe to events and apply state changes
- **Anti-pattern**: Adding item application logic directly to `Player.js` creates a "God Object"

```javascript
// WRONG: Logic in entity
class Player {
    onItemPickup(item) {
        if (item.type === 'health') this.lives++;  // ❌ Business logic in entity
    }
}

// CORRECT: Logic in manager
eventManager.on('ITEM_PICKED_UP', ({ player, itemData }) => {
    AbilityManager.apply(player, itemData);  // ✅ System handles logic
});
```

### 3. Data-Driven Configuration
All game content (stages, items, abilities) is externalized to JSON files in [js/config/](js/config/). See [docs/data_driven_design_pattern.md](docs/data_driven_design_pattern.md).

- **Never hardcode** level progression, item stats, or physics values in `.js` files
- Config files have schemas documented in [docs/config_json_schemas.md](docs/config_json_schemas.md)
- Always provide fallback defaults in `Config.js` (e.g., `FALLBACK_STAGES`) for offline/error scenarios
- JSON files MUST include `version` and `lastModified` metadata

## Development Workflow

### Running & Testing
```bash
npm test          # Runs standard-checker.js - aggressive linting for inline CSS/JS violations
npm run lint      # Alias for npm test
```

- **No build step**: Open `index.html` directly or use Live Server
- **Testing**: Script at [scripts/standard-checker.js](scripts/standard-checker.js) enforces zero inline styles/scripts/handlers
- **Quality Gate**: All code changes MUST pass `npm test` before commit

### Quality Protocol (Mandatory)
Before completing ANY task, verify against [docs/ai_quality_protocol.md](docs/ai_quality_protocol.md):

1. **Accessibility**: All `<input>`/`<select>` have `<label for="id">` and `aria-label` where needed
2. **CSS Standards**:
   - NO ID selectors for styling (IDs are JS hooks only)
   - Always include vendor prefixes: `-webkit-backdrop-filter` alongside `backdrop-filter`
   - Use CSS variables from [css/variables.css](css/variables.css) (`--primary-pink`, `--transition-mid`, etc.)
3. **JS Standards**:
   - Use `Logger.js` instead of `console.log()`
   - Use `Storage.js` system instead of raw `localStorage`
   - All entities extend `Entity`, all systems are static classes
   - Null-check ALL DOM queries: `const el = Dom.get('myId'); if (el) { ... }`

## Key Systems & Services

### Core Systems (js/systems/)
- **CollisionSystem**: Layer-mask based collision using bitflags (see [js/utils/PhysicsUtils.js](js/utils/PhysicsUtils.js))
- **ParticleSystem**: High-performance object pooling for visual effects (particles skip Registry for perf)
- **AbilityManager**: Centralized item effect application (life, invincibility, physics mods, abilities)
- **EventManager**: Pub/sub for cross-system communication (e.g., `LEVEL_UP`, `ITEM_PICKED_UP`)
- **ScoreManager**: Score tracking with `getScore()`, `addPoints()`, `reset()`
- **UIManager**: DOM updates for HUD, lives, abilities inventory

### Utilities (js/utils/)
- **Logger**: Structured logging with levels (debug, info, warn, error)
- **Dom**: Safe DOM helpers (`Dom.get()`, `Dom.all()`)
- **ErrorHandler**: Centralized error handling with contextual logging

## Collision Layer System (Critical)

The collision system uses **bitflags** for efficient layer-based collision filtering. Each entity has:
- `collisionLayer`: What layer(s) this entity is ON (bitflag)
- `collisionMask`: What layer(s) this entity can COLLIDE WITH (bitflag)

### Available Layers (from [js/utils/PhysicsUtils.js](js/utils/PhysicsUtils.js))
```javascript
CollisionLayers = {
    NONE: 0,
    PLAYER: 1 << 0,      // Binary: 0001 (1)
    OBSTACLE: 1 << 1,    // Binary: 0010 (2)
    PLATFORM: 1 << 2,    // Binary: 0100 (4)
    PARTICLE: 1 << 3,    // Binary: 1000 (8)
    ITEM: 1 << 4,        // Binary: 10000 (16)
    ALL: 0xFFFFFFFF
}
```

### Real Example: Player Setup
```javascript
// From js/entities/Player.js
this.collisionLayer = CollisionLayers.PLAYER;  // Player is on PLAYER layer
this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM | CollisionLayers.ITEM;
// Player can collide with: obstacles, platforms, and items
```

### Real Example: Obstacle Setup
```javascript
// From js/entities/Obstacle.js
this.collisionLayer = CollisionLayers.OBSTACLE;  // Obstacle is on OBSTACLE layer
this.collisionMask = CollisionLayers.PLAYER;     // Can only collide with player
```

### Collision Check Logic
```javascript
// CollisionSystem checks if A and B should collide:
const aCanHitB = (a.collisionMask & b.collisionLayer) !== 0;
const bCanHitA = (b.collisionMask & a.collisionLayer) !== 0;
return aCanHitB || bCanHitA;
```

**Why bitflags?** One entity can be on multiple layers (`PLAYER | PARTICLE`) and collide with multiple layers efficiently in a single bitmask operation.

## Common Patterns

### Adding a New Entity Type
1. Create class extending `Entity` in [js/entities/](js/entities/)
2. Call `super(x, y, width, height, 'entity-type')` in constructor
3. Override `update(dt, context)` and `draw(ctx)` methods
4. Set collision properties: `this.collisionLayer`, `this.collisionMask` (see above)
5. Implement `onCollision(other, particles, context)` if needed

**Real Example - Obstacle Entity** ([js/entities/Obstacle.js](js/entities/Obstacle.js)):
```javascript
import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

export class Obstacle extends Entity {
    constructor(x, y) {
        const width = 40;
        const height = 40 + Math.random() * 20;
        
        super(x, y - height, width, height, 'obstacle');  // Register as 'obstacle'
        this.type = Math.random() > 0.5 ? '💎' : '🌵';

        // Set collision properties
        this.collisionLayer = CollisionLayers.OBSTACLE;
        this.collisionMask = CollisionLayers.PLAYER;
    }

    update(dt, context) {
        const { gameSpeed, logicalHeight, config } = context;
        this.x -= gameSpeed * dt;  // Move left with game speed
        this.y = logicalHeight - config.GROUND_HEIGHT - this.height;
    }

    draw(ctx) {
        ctx.font = '40px serif';
        ctx.fillText(this.type, this.x, this.y + this.height);
    }

    get isOffscreen() {
        return this.x + this.width < 0;  // Auto-pruned by Registry
    }
}
```

**Key Points**:
- Constructor dimensions calculated before `super()` call
- `gameSpeed` comes from `context` parameter (injected by Game.js)
- `isOffscreen` getter triggers auto-pruning in Registry.updateAll()
- Draw uses emoji - keep rendering simple, visual polish goes in ParticleSystem

### Adding New Game Content
1. Edit JSON in [js/config/](js/config/) (stages, items, or abilities)
2. Validate against schemas in [docs/config_json_schemas.md](docs/config_json_schemas.md)
3. Increment `version` and update `lastModified` timestamp
4. Test with `Config.loadStages()` / `Config.loadItems()` / `Config.loadAbilities()`

**Real Example - Player Entity State** ([js/entities/Player.js](js/entities/Player.js)):
```javascript
export class Player extends Entity {
    constructor(outfit = null) {
        super(80, 0, 50, 50, 'player');  // Fixed x=80, entities auto-register
        this.vy = 0;
        this.isGrounded = false;

        // Collision Setup
        this.collisionLayer = CollisionLayers.PLAYER;
        this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM | CollisionLayers.ITEM;
        this.collisionPadding = 10;  // Shrinks hitbox for fairness

        // Pure state - no complex logic here
        this.abilities = [];
        this.lives = 1;
        this.invincibleTimer = 0;
        this.physicsMod = { gravityMultiplier: 1, jumpMultiplier: 1 };
    }

    update(dt, context) {
        // Simple physics integration
        const gravity = config.GRAVITY * this.physicsMod.gravityMultiplier;
        this.vy += gravity * dt;
        this.y += this.vy * dt;
        
        // Ground collision
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
        }
    }
}
```

**Key Points**:
- Player is mostly **state container** with simple physics
- Complex logic (item pickups, ability effects) handled by `AbilityManager`
- Uses `collisionPadding` to make hitbox "forgiving" for better gameplay
- `context` parameter provides game state (config, dimensions, platforms)
- Timer-based effects (invincibility, physics mods) managed in entity, applied by systems

### Memory Management (Critical for Performance)
From [docs/coding_standards.md](docs/coding_standards.md) section 4.4:
- **Object pooling**: Reuse particles/projectiles instead of `new Particle()` every frame
- **Pre-allocation**: Create arrays/objects outside game loop
- **Avoid closures in loops**: Don't define functions inside `update()` or `draw()`

## File Structure Quick Reference
```
js/
├── Config.js              # Central config loader with fallbacks
├── Game.js                # Main coordinator, initializes all systems
├── core/
│   ├── Entity.js          # Base class for all game objects
│   ├── Registry.js        # Singleton entity tracker
│   ├── GameLoop.js        # requestAnimationFrame wrapper
│   └── StateController.js # Game state machine (START/PLAYING/GAMEOVER)
├── systems/               # All business logic lives here
│   ├── AbilityManager.js  # Item effect application
│   ├── CollisionSystem.js # Physics resolution
│   └── ...
├── entities/              # Pure state containers extending Entity
├── factories/             # Constructors for complex entities (e.g., PlayerFactory)
└── config/                # External JSON data (stages.json, items.json, abilities.json)
```

## Anti-Patterns to Avoid

1. **God Objects**: Don't add multi-responsibility logic to `Player.js` or `Game.js` - extract to systems
2. **Inline Everything**: No inline styles (`style=""`), scripts, or event handlers in HTML
3. **Global Pollution**: No `let myVar` at file scope - use classes or IIFEs
4. **Bypass Systems**: Don't manipulate localStorage directly, use `Storage.js`
5. **Hardcoded Content**: Don't add stage/item data to `.js` files, use JSON configs
6. **Missing Cleanup**: If you add event listeners, implement `dispose()` to remove them

## Known Project Gaps & Limitations

### Testing Infrastructure (CRITICAL GAP)
- ⚠️ **No unit test framework**: Only 1 test file ([js/systems/ScoreManager.test.js](js/systems/ScoreManager.test.js)) with manual assertions
- ⚠️ **No integration tests**: Complex interactions (collision, level progression, item effects) untested
- ⚠️ **No CI/CD**: `npm test` only runs linting (standard-checker.js), not actual tests
- **Impact**: Regressions can slip through, refactoring is risky
- **Workaround**: Manual testing in browser + test HTML pages (item-lab.html, particle-test.html, powers-test.html)

### Documentation Gaps
- ⚠️ **No API documentation**: Systems like `EventManager`, `CollisionSystem` lack JSDoc for public methods
- ⚠️ **Incomplete type hints**: JavaScript without TypeScript means no compile-time type checking
- ⚠️ **Event catalog missing**: No central list of all `EventManager` events and their payloads
- **Workaround**: Grep search for `eventManager.emit()` to discover events

### Performance & Scalability
- ⚠️ **No profiling tools**: Can't measure frame times, memory allocation, or GC pauses
- ⚠️ **Particle pooling incomplete**: Only particles use pooling, not other short-lived entities
- ⚠️ **No level streaming**: All config loaded at startup (will fail with 1000+ stages)
- **Workaround**: Keep JSON files small (<100 entries per array)

### Browser Compatibility
- ⚠️ **Safari/iOS specific issues**: `-webkit-` prefixes added after initial launch (tech debt)
- ⚠️ **No polyfills**: Code assumes modern ES6+ browser (no IE11 support)
- ⚠️ **Touch input basic**: No multi-touch, gestures, or haptic feedback
- **Target**: Chrome/Firefox/Safari latest versions only

### Security & Validation
- ⚠️ **No JSON schema validation**: External config loaded without runtime validation
- ⚠️ **No input sanitization**: User settings from localStorage used directly
- ⚠️ **Fallback safety only**: `Config.js` has hardcoded fallbacks but doesn't validate structure
- **Risk**: Corrupted localStorage or malicious JSON could break game

### Mobile & Accessibility
- ⚠️ **Limited mobile optimization**: Viewport scaling exists but not thoroughly tested on small screens
- ⚠️ **No screen reader support**: Game canvas has no ARIA live regions for state changes
- ⚠️ **Keyboard-only navigation incomplete**: Settings/customize screens lack full keyboard support
- **Status**: Basic WCAG compliance for forms, game itself is visual-only

### Architecture Debt
- ⚠️ **`Game.js` coordination complexity**: 200+ lines, orchestrates 15+ systems (could be split)
- ⚠️ **Context parameter bloat**: `update(dt, context)` passes 10+ properties (consider dedicated ContextObject)
- ⚠️ **EventManager global state**: Singleton pattern makes testing difficult
- **Trade-off**: Simplicity vs. testability (project prioritizes simplicity)

### What Works Well (Don't Break These)
✅ Entity-Registry lifecycle management (auto-registration, ID generation, pruning)
✅ Manager Pattern for decoupling (AbilityManager, SpawnManager, UIManager)
✅ Data-driven config externalization (stages, items, abilities in JSON)
✅ Collision layer bitmask system (efficient, extensible)
✅ Logger abstraction (central logging with levels)
✅ Standard-checker.js enforcement (catches 90% of common mistakes)

## Specialized Prompt Library

For deep dives into specific workflows, see [.github/prompts/](prompts/):

**Core Guides**:
- [performance.md](prompts/performance.md) - Memory management, GC optimization, profiling
- [entity-template.md](prompts/entity-template.md) - Complete entity boilerplate
- [game-balance.md](prompts/game-balance.md) - Physics tuning, spawn rates, difficulty curves
- [visual-effects.md](prompts/visual-effects.md) - Particle recipes and animation patterns
- [debugging.md](prompts/debugging.md) - Visual debugging, console commands, profiling
- [events.md](prompts/events.md) - EventManager patterns and cross-system communication
- [troubleshooting.md](prompts/troubleshooting.md) - Common pitfalls and quick fixes

**Task Templates**:
- [create-entity.md](prompts/tasks/create-entity.md) - Step-by-step entity creation checklist
- [add-stage.md](prompts/tasks/add-stage.md) - Complete stage/level addition guide
- [debug-collision.md](prompts/tasks/debug-collision.md) - Collision debugging workflow

## Documentation References
- [docs/architecture.md](docs/architecture.md) - High-level system design
- [docs/coding_standards.md](docs/coding_standards.md) - Style guide and patterns
- [docs/ai_quality_protocol.md](docs/ai_quality_protocol.md) - Mandatory verification checklist
- [docs/data_driven_design_pattern.md](docs/data_driven_design_pattern.md) - Config externalization philosophy
- [docs/item_system_architecture.md](docs/item_system_architecture.md) - Item/ability manager details

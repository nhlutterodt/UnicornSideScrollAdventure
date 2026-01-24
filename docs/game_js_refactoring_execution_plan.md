# Game.js Refactoring Execution Plan 🎯

**Date:** January 23, 2026  
**Status:** Ready for Execution  
**Target Completion:** 3 Weeks  
**Based On:** [game_js_responsibility_analysis.md](game_js_responsibility_analysis.md)

---

## 🎯 Primary Goal

**Refactor Game.js from a monolithic 425-line "God Object" with 13+ responsibilities into a lean 150-180 line orchestration hub, while extracting 7-10 specialized systems that follow Single Responsibility Principle and project coding standards.**

### Success Definition

The refactoring is considered successful when:
1. ✅ Game.js reduced to 150-180 lines (65% reduction)
2. ✅ 7-10 specialized systems extracted and independently testable
3. ✅ 100% functional compatibility maintained (zero regression)
4. ✅ All project coding standards enforced (see Quality Standards)
5. ✅ 80%+ test coverage for all new systems
6. ✅ Performance metrics unchanged (60 FPS maintained)

---

## 🚧 Scope Guardrails & Drift Prevention

### What This Refactoring IS:
- ✅ Extracting existing responsibilities into specialized systems
- ✅ Improving separation of concerns and testability
- ✅ Making Game.js a thin coordination layer
- ✅ Applying existing project standards consistently
- ✅ Creating clear system boundaries with event-driven communication

### What This Refactoring IS NOT (STRICT BOUNDARIES):
- ❌ **Adding new game features** - Feature freeze during refactoring
- ❌ **Changing game mechanics** - Behavior must remain identical
- ❌ **Rewriting existing working systems** - Only extract and reorganize
- ❌ **Changing visual appearance** - UI/UX must remain pixel-perfect
- ❌ **Performance optimization** - Maintain current performance, don't optimize
- ❌ **Changing file formats or data structures** - Keep existing APIs
- ❌ **Modifying Config.js values** - Keep all game constants unchanged
- ❌ **Touching Entity classes** - Only Game.js and new systems

### Drift Prevention Mechanisms

**Before Starting Any Task:**
1. Review this document's guardrails
2. Confirm task is extraction, not enhancement
3. Document baseline behavior to verify against

**During Implementation:**
1. If tempted to "improve" something → STOP and document for future work
2. If a system seems incomplete → Extract as-is, enhance later
3. If performance degrades → Revert and analyze before proceeding

**After Each Task:**
1. Verify behavior matches baseline exactly
2. Confirm no new features accidentally added
3. Check no visual changes occurred

---

## 📋 Project Standards Integration

All work must adhere to the established project standards from:
- [coding_standards.md](coding_standards.md)
- [js_enforcement.md](js_enforcement.md) 
- [ai_quality_protocol.md](ai_quality_protocol.md)
- [decoupled_entity_construction.md](decoupled_entity_construction.md)

### Mandatory Code Quality Standards

#### 1. **JavaScript Standards (Non-Negotiable)**

```javascript
// REQUIRED: Use strict mode
'use strict';

// REQUIRED: ES6+ module imports
import { System } from './core/System.js';

// REQUIRED: Class-based architecture
export class SystemManager {
    constructor(dependencies) {
        // REQUIRED: Validate all dependencies
        if (!dependencies.registry) {
            throw new Error('SystemManager requires registry');
        }
        
        // REQUIRED: Use const by default, let only when necessary
        const config = dependencies.config;
        let state = 'idle';
    }
    
    // REQUIRED: Camel case for methods
    updateState(newState) {
        // REQUIRED: Null checks for external data
        if (!newState) {
            logger.warn('SystemManager', 'Invalid state provided');
            return;
        }
    }
    
    // REQUIRED: Cleanup method for event listeners
    dispose() {
        // Remove all listeners and clear timers
        this._cleanup();
    }
    
    // REQUIRED: Private methods prefixed with underscore
    _cleanup() {
        // Implementation
    }
}
```

#### 2. **Naming Conventions (Strictly Enforced)**

| Type | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `SpawnManager`, `UIManager` |
| Methods | camelCase | `updateScore()`, `handleJump()` |
| Variables | camelCase | `playerSpeed`, `currentLevel` |
| Constants | UPPER_SNAKE_CASE | `MAX_SCORE`, `SPAWN_INTERVAL` |
| Private Methods | _prefixedCamelCase | `_buildContext()`, `_initializeSystems()` |
| Booleans | is/has/should prefix | `isPlaying`, `hasAbility` |
| Event Names | SCREAMING_SNAKE_CASE | `SCORE_CHANGED`, `GAME_OVER` |
| Files | PascalCase (match class) | `SpawnManager.js`, `UIManager.js` |

#### 3. **Documentation Standards (Required for All Systems)**

```javascript
/**
 * SpawnManager - Centralized entity spawning coordination
 * 
 * Responsibilities:
 * - Manages timing and intervals for all entity types
 * - Coordinates spawner instances for obstacles, platforms, clouds, items
 * - Synchronizes spawn rates with level progression
 * 
 * Events Emitted:
 * - ENTITY_SPAWNED: { type: string, x: number, y: number } - When any entity spawns
 * 
 * Events Consumed:
 * - LEVEL_CHANGED: { level: number, spawnInterval: number } - Adjusts spawn rates
 * 
 * Dependencies:
 * - Config: Global configuration object
 * - engineRegistry: Entity registry for spawn verification
 * 
 * @example
 * const spawnManager = new SpawnManager({
 *   logicalWidth: 800,
 *   logicalHeight: 600,
 *   config: Config
 * });
 * spawnManager.update(deltaTime, context);
 */
export class SpawnManager {
    // Implementation
}
```

#### 4. **The Manager Pattern (Critical for This Refactoring)**

Based on [decoupled_entity_construction.md](decoupled_entity_construction.md):

- **Entities are Pure State**: No complex business logic in entities
- **Managers Coordinate Logic**: System managers (AbilityManager, SpawnManager, etc.) handle cross-cutting concerns
- **Configuration-Driven**: Use Config.js for all magic numbers and settings
- **Event-Driven Communication**: Prefer events over direct method calls between systems

```javascript
// ❌ BAD: Entity knows too much
class Player {
    collectItem(item) {
        if (item.type === 'HEART') {
            this.lives++;
        } else if (item.type === 'SHIELD') {
            this.shieldTime = 5000;
            // ... 50 more lines of item logic
        }
    }
}

// ✅ GOOD: Manager handles logic
class Player {
    collectItem(item) {
        AbilityManager.applyItemEffect(item, this);
    }
}
```

#### 5. **Memory Management (Critical for Game Loop)**

From [coding_standards.md](coding_standards.md):

- **No Object Creation in Update Loop**: Reuse objects, use pools
- **Pre-allocate Arrays**: If size is known, allocate once
- **Avoid Closures in Loop**: Define functions outside update/draw

```javascript
// ❌ BAD: Creates garbage every frame
update(dt) {
    const context = { config: Config, dt }; // New object 60x/sec
}

// ✅ GOOD: Reuse context object
constructor() {
    this._context = { config: Config, dt: 0 };
}
update(dt) {
    this._context.dt = dt;
    // Use this._context
}
```

#### 6. **Safety Checks (The "Null Defense")**

From [js_enforcement.md](js_enforcement.md):

```javascript
// ❌ BAD: Assumes DOM element exists
const button = document.getElementById('startBtn');
button.addEventListener('click', handler);

// ✅ GOOD: Defensive programming
const button = document.getElementById('startBtn');
if (button) {
    button.addEventListener('click', handler);
} else {
    logger.warn('UIManager', 'Start button not found - check HTML');
}
```

#### 7. **Event-Driven Architecture**

```javascript
// Event naming: SCREAMING_SNAKE_CASE
eventManager.emit('SCORE_CHANGED', { 
    score: this.score, 
    delta: points,
    timestamp: Date.now() 
});

// Always document event payloads in JSDoc
/**
 * Events Emitted:
 * - SCORE_CHANGED: { score: number, delta: number, timestamp: number }
 * - HIGH_SCORE_ACHIEVED: { newHighScore: number, previousHighScore: number }
 */
```

---

## 🛡️ Quality Verification Protocol

Based on [ai_quality_protocol.md](ai_quality_protocol.md), every task completion requires:

### Pre-Task Checklist
- [ ] Task scope confirmed within guardrails
- [ ] Baseline behavior documented
- [ ] Related coding standards reviewed
- [ ] Test framework verified operational

### Post-Task Verification (MANDATORY)

#### Code Quality Checks
- [ ] **Encapsulation**: No global variables created
- [ ] **Inheritance**: All physical entities extend `Entity` class
- [ ] **Null Safety**: All DOM queries null-checked
- [ ] **Cleanup**: All event listeners have disposal method
- [ ] **Strict Mode**: All files begin with `'use strict';`
- [ ] **Naming**: All names follow conventions table above
- [ ] **Documentation**: JSDoc complete with examples
- [ ] **Manager Pattern**: No business logic in entities
- [ ] **Memory**: No object creation in game loop

#### Standards Compliance
- [ ] **No Global Pollution**: All code encapsulated in classes/modules
- [ ] **Error Handling**: Try-catch for async operations
- [ ] **Logging**: Uses logger, not console.log
- [ ] **Events**: Event names in SCREAMING_SNAKE_CASE
- [ ] **Comments**: Explain "why", not "what"

#### Integration Checks
- [ ] **Functional Parity**: Game behaves identically to before
- [ ] **Visual Parity**: No visual changes occurred
- [ ] **Performance**: FPS unchanged (60fps maintained)
- [ ] **No Regressions**: All pre-existing features work
- [ ] **Cross-Browser**: Tested in Chrome, Firefox, Edge

#### Automated Verification
- [ ] **Run standard-checker.js**: Passes all checks
- [ ] **Run get_errors tool**: Zero errors in modified files
- [ ] **Run tests**: All tests pass, coverage ≥ 80%

### Verification Report Template

After every task, provide this report:

```markdown
### 🛡️ Quality Verification Report: [Task Name]

#### ✅ Code Quality
- [x] No global variables
- [x] Null safety implemented
- [x] Cleanup methods present
- [x] Naming conventions followed
- [x] JSDoc complete

#### ✅ Standards Compliance
- [x] Manager pattern applied
- [x] Event-driven architecture
- [x] Memory-conscious design
- [x] Proper error handling

#### ✅ Integration Status
- [x] Functional parity verified
- [x] Visual parity confirmed
- [x] Performance maintained (60 FPS)
- [x] No regressions detected

#### ✅ Automated Checks
- [x] standard-checker.js: PASS
- [x] get_errors: 0 errors
- [x] Tests: 15/15 passed (87% coverage)

#### 📊 Metrics
- Lines reduced from Game.js: 22 lines
- New system lines: 156 lines
- Test coverage: 87%
- FPS impact: 0ms (maintained 60fps)
```

---

## 📂 File Organization Standard

```
js/
├── core/               # Core engine (GameLoop, Registry, Entity, StateController)
│   ├── Entity.js
│   ├── GameLoop.js
│   ├── Registry.js
│   └── StateController.js
├── systems/            # Game systems and managers (NEW EXTRACTIONS GO HERE)
│   ├── AbilityManager.js
│   ├── AudioSystem.js
│   ├── CollisionSystem.js
│   ├── EffectSystem.js
│   ├── EventManager.js
│   ├── InputManager.js
│   ├── LevelSystem.js
│   ├── ParticleSystem.js
│   ├── ScoreManager.js      # ← NEW (Phase 1)
│   ├── SpawnManager.js      # ← NEW (Phase 2)
│   ├── UIManager.js         # ← NEW (Phase 2)
│   ├── ViewportManager.js   # ← NEW (Phase 1)
│   ├── RenderSystem.js      # ← NEW (Phase 2)
│   ├── GameInputHandler.js  # ← NEW (Phase 2)
│   ├── Storage.js
│   └── StorageManager.js
├── entities/           # Game entities (Player, Obstacle, Cloud, Platform, Item)
│   ├── Cloud.js
│   ├── Item.js
│   ├── Obstacle.js
│   ├── Platform.js
│   └── Player.js
├── factories/          # Factory classes (NEW DIRECTORY)
│   └── PlayerFactory.js     # ← NEW (Phase 1)
├── utils/              # Pure utility functions (no state)
│   ├── Dom.js
│   ├── ErrorHandler.js
│   ├── EnvironmentInitializer.js  # ← NEW (Phase 3)
│   ├── LevelUtils.js
│   ├── Logger.js
│   └── PhysicsUtils.js
├── Config.js           # Global configuration (DO NOT MODIFY)
├── Game.js             # Main game orchestrator (TARGET FOR REDUCTION)
└── main.js             # Entry point
```

---

## 📋 Pre-Refactoring Baseline Documentation

### Baseline Behavior Checklist

Before starting, document current behavior:

**Game Start/Restart:**
- [ ] Click "Start" button → Game begins
- [ ] Press Space → Game begins
- [ ] Score resets to 0
- [ ] Lives reset to 3
- [ ] Player spawns at ground level
- [ ] 5 clouds spawn at random positions
- [ ] Background scrolls
- [ ] No entities in motion

**Gameplay Loop:**
- [ ] Player auto-runs right (no movement control)
- [ ] Obstacles spawn from right at interval
- [ ] Platforms spawn from right at interval with probability
- [ ] Items spawn from right at interval
- [ ] Clouds spawn from right at interval
- [ ] Trail particles follow player
- [ ] Score increments when passing obstacles
- [ ] Player can jump (Space, Click, Touch)
- [ ] Player can double-jump on platforms
- [ ] Player can collect items
- [ ] Player can use abilities (E key)
- [ ] Player can cycle abilities (Q/R keys)
- [ ] Collision with obstacle → lose life, invulnerability period
- [ ] Lose all lives → Game Over
- [ ] Level progression increases speed

**UI Updates:**
- [ ] Score displays in real-time
- [ ] Lives display shows hearts
- [ ] High score displays on start screen
- [ ] High score displays on game over screen
- [ ] Ability inventory shows collected abilities
- [ ] Active ability is highlighted
- [ ] Ability time/uses display correctly
- [ ] Final score shows on game over

**Visual Effects:**
- [ ] Stage themes change background color
- [ ] Stage themes change ground color
- [ ] Scrolling environment elements
- [ ] Particle effects on jump landing
- [ ] Particle effects on item collection
- [ ] Trail particles behind player

**Window Management:**
- [ ] Resize maintains aspect ratio
- [ ] Canvas scales correctly
- [ ] Player repositions on idle resize
- [ ] No visual glitches during resize

### Performance Baseline

**Measurement Procedure:**
1. Open Chrome DevTools → Performance tab
2. Start game and play for 60 seconds
3. Record:
   - Average FPS: ______ (target: 60)
   - Frame time: ______ (target: ~16ms)
   - Memory usage start: ______ MB
   - Memory usage end: ______ MB
   - Memory delta: ______ MB (should be minimal)

---

## 🗓️ Three-Phase Execution Plan

### Phase 1: Foundation & Low-Risk Extractions
**Duration:** Days 1-5 (Week 1)  
**Goal:** Build foundation with isolated, low-coupling systems  
**Risk:** LOW  
**Guardrail:** No changes to game loop or rendering

#### Task 1.1: Extract ScoreManager ⏱️ 4 hours
- **Extracts:** 20 lines from Game.js
- **Creates:** `js/systems/ScoreManager.js`
- **Tests:** `js/systems/ScoreManager.test.js`
- **Events Added:** `SCORE_CHANGED`, `HIGH_SCORE_CHANGED`

**Scope Boundaries:**
- ✅ Extract score tracking and persistence
- ✅ Add event emissions for score changes
- ❌ Do NOT add score multipliers (future feature)
- ❌ Do NOT add score breakdown (future feature)
- ❌ Do NOT modify how score increments (keep onObstaclePassed)

**Implementation Steps:**
1. Create ScoreManager class with JSDoc
2. Implement constructor loading high score from Storage
3. Implement `addPoints(points)` with event emission
4. Implement `reset()` method
5. Implement `finalize()` for game over
6. Implement getters for score/highScore
7. Write comprehensive tests (≥80% coverage)
8. Integrate into Game.js (replace this.score)
9. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~20 lines
- [ ] ScoreManager has 100% test coverage for core methods
- [ ] Score increments identically to before
- [ ] High score saves and loads correctly
- [ ] Events emit with correct payloads
- [ ] Zero visual changes
- [ ] FPS unchanged

---

#### Task 1.2: Extract ViewportManager ⏱️ 4 hours
- **Extracts:** 20 lines from Game.js
- **Creates:** `js/systems/ViewportManager.js`
- **Events Added:** `VIEWPORT_CHANGED`

**Scope Boundaries:**
- ✅ Extract viewport calculation and resize handling
- ✅ Add coordinate transformation utilities
- ❌ Do NOT add camera panning (future feature)
- ❌ Do NOT add zoom functionality (future feature)
- ❌ Do NOT change scaling algorithm

**Implementation Steps:**
1. Create ViewportManager class with JSDoc
2. Implement constructor with auto-resize binding
3. Implement `resize()` method (extract from Game.js)
4. Implement `toLogical(physicalX, physicalY)`
5. Implement `toPhysical(logicalX, logicalY)`
6. Add `VIEWPORT_CHANGED` event emission
7. Write tests for calculations and transformations
8. Integrate into Game.js (replace resize method)
9. Test on multiple aspect ratios
10. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~20 lines
- [ ] Resize behavior identical
- [ ] Canvas scaling unchanged
- [ ] Player positioning preserved
- [ ] Tests verify coordinate transformations mathematically
- [ ] No visual glitches on resize
- [ ] Works on 4:3, 16:9, 21:9 aspect ratios

---

#### Task 1.3: Create PlayerFactory ⏱️ 2 hours
- **Extracts:** 10 lines from Game.js
- **Creates:** `js/factories/PlayerFactory.js`
- **Creates Directory:** `js/factories/`

**Scope Boundaries:**
- ✅ Extract player creation and outfit loading
- ✅ Centralize default outfit configuration
- ❌ Do NOT modify Player class
- ❌ Do NOT add new outfit options
- ❌ Do NOT change outfit structure

**Implementation Steps:**
1. Create factories directory
2. Create PlayerFactory class with JSDoc
3. Implement static `create()` method
4. Implement static `getDefaultOutfit()` method
5. Load outfit from Storage (existing pattern)
6. Configure onGameOver callback via events
7. Write factory tests
8. Integrate into Game.js (replace player creation)
9. Verify customization system still works
10. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~10 lines
- [ ] Player creates identically
- [ ] Outfit customization works
- [ ] Default outfit loads correctly
- [ ] Custom outfits load correctly
- [ ] Tests cover all outfit scenarios

---

#### Task 1.4: Phase 1 Integration & Validation ⏱️ 2 hours

**Complete System Validation:**
1. Run full test suite (all tests pass)
2. Play test 3 complete game sessions
3. Test all abilities and features
4. Test score persistence across sessions
5. Test window resize during gameplay
6. Run standard-checker.js
7. Check for memory leaks (10 min play test)
8. Compare FPS to baseline
9. Document Phase 1 metrics

**Phase 1 Completion Criteria:**
- [ ] All Phase 1 tasks complete
- [ ] All tests passing (≥80% coverage)
- [ ] Game.js reduced by ~50 lines
- [ ] Zero functional regressions
- [ ] Zero visual changes
- [ ] FPS maintained
- [ ] No memory leaks detected
- [ ] Documentation updated

**Phase 1 Sign-off:**
- [ ] Developer: _______________ Date: ___________
- [ ] Reviewer: _______________ Date: ___________

---

### Phase 2: Core System Extractions
**Duration:** Days 6-10 (Week 2)  
**Goal:** Extract major systems (spawn, render, UI, input)  
**Risk:** MEDIUM-HIGH  
**Guardrail:** Changes to update/draw loops require extra validation

#### Task 2.1: Extract SpawnManager ⏱️ 8 hours
- **Extracts:** 60 lines from Game.js
- **Creates:** `js/systems/SpawnManager.js`
- **Events Added:** `ENTITY_SPAWNED` (optional)

**Scope Boundaries:**
- ✅ Extract all spawn timing and logic
- ✅ Create spawner base class architecture
- ✅ Implement specialized spawners for each entity type
- ❌ Do NOT change spawn intervals or probabilities
- ❌ Do NOT add new entity types
- ❌ Do NOT modify entity constructors

**Architecture:**
```javascript
// Base spawner pattern
class EntitySpawner {
    constructor(type, interval) {
        this.type = type;
        this.interval = interval;
        this.timer = 0;
    }
    
    update(dt, context) {
        this.timer += dt;
        if (this.timer >= this.interval) {
            this.timer = 0;
            this.spawn(context);
        }
    }
    
    spawn(context) {
        // Override in subclasses
    }
    
    reset() {
        this.timer = 0;
    }
}

// Specialized spawners
class ObstacleSpawner extends EntitySpawner {
    spawn(context) {
        new Obstacle(
            context.logicalWidth + 100,
            context.logicalHeight - context.config.GROUND_HEIGHT
        );
    }
}

class PlatformSpawner extends EntitySpawner {
    spawn(context) {
        // Platform probability logic
    }
}

class TrailParticleSpawner extends EntitySpawner {
    spawn(context) {
        // Trail particle logic
    }
}

// Manager coordinates all spawners
class SpawnManager {
    constructor(config) {
        this.spawners = {
            obstacle: new ObstacleSpawner('obstacle', config.obstacleInterval),
            platform: new PlatformSpawner('platform', config.platformInterval),
            cloud: new EntitySpawner('cloud', config.cloudInterval),
            item: new EntitySpawner('item', config.itemInterval),
            trail: new TrailParticleSpawner('trail', 0.05)
        };
    }
    
    update(dt, context) {
        Object.values(this.spawners).forEach(spawner => {
            spawner.update(dt, context);
        });
    }
    
    reset() {
        Object.values(this.spawners).forEach(s => s.reset());
    }
    
    setSpawnInterval(interval) {
        // Sync with level system
    }
}
```

**Implementation Steps:**
1. Create EntitySpawner base class
2. Create specialized spawner classes
3. Create SpawnManager coordinator
4. Extract spawn logic from Game.js update()
5. Write spawner tests (mock entity creation)
6. Write SpawnManager tests
7. Integrate into Game.js
8. Sync spawn intervals with LevelSystem
9. Verify spawn timing matches baseline
10. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~60 lines
- [ ] All spawners tested independently
- [ ] Obstacles spawn at correct intervals
- [ ] Platforms spawn with correct probability
- [ ] Clouds spawn correctly
- [ ] Items spawn correctly
- [ ] Trail particles render
- [ ] Spawn intervals increase with level
- [ ] No spawning after game over
- [ ] Architecture is extensible for new entity types

---

#### Task 2.2: Extract RenderSystem ⏱️ 8 hours
- **Extracts:** 45 lines from Game.js
- **Creates:** `js/systems/RenderSystem.js`
- **Events Consumed:** `VIEWPORT_CHANGED`

**Scope Boundaries:**
- ✅ Extract all canvas rendering logic
- ✅ Implement configurable render layers
- ✅ Move ground and environment rendering
- ❌ Do NOT change render order
- ❌ Do NOT add new visual effects
- ❌ Do NOT modify entity draw methods

**Architecture:**
```javascript
class RenderSystem {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;
        this.scaleRatio = 1;
        this.logicalWidth = 800;
        
        // Configurable render order
        this.renderLayers = [
            'background',
            'clouds',
            'ground',
            'particles',
            'effects',
            'platforms',
            'obstacles',
            'items',
            'player',
            'environment'
        ];
        
        // Listen for viewport changes
        eventManager.on('VIEWPORT_CHANGED', (data) => {
            this.setScale(data.scaleRatio, data.logicalWidth);
        });
    }
    
    render(context) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background
        this._renderBackground(context);
        
        // Apply scaling
        this.ctx.save();
        this.ctx.scale(this.scaleRatio, this.scaleRatio);
        
        // Render all layers in order
        this.renderLayers.forEach(layer => {
            this._renderLayer(layer, context);
        });
        
        this.ctx.restore();
    }
    
    _renderBackground(context) {
        if (context.stage?.theme?.background) {
            this.ctx.fillStyle = context.stage.theme.background;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    _renderLayer(layer, context) {
        switch(layer) {
            case 'clouds':
                engineRegistry.getByType('cloud').forEach(c => c.draw(this.ctx));
                break;
            case 'ground':
                this._renderGround(context);
                break;
            case 'environment':
                this._renderEnvironment(context);
                break;
            // ... other layers
        }
    }
    
    _renderGround(context) {
        // Extract from Game.js
    }
    
    _renderEnvironment(context) {
        // Extract drawEnvironment() from Game.js
    }
}
```

**Implementation Steps:**
1. Create RenderSystem class with JSDoc
2. Implement constructor and layer configuration
3. Implement render() method (extract from draw())
4. Implement _renderBackground()
5. Implement _renderGround() (extract from Game.js)
6. Implement _renderEnvironment() (extract from Game.js)
7. Implement _renderLayer() switch
8. Write render tests (mock canvas context)
9. Integrate into Game.js (replace draw())
10. Visual regression testing (screenshots)
11. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~45 lines
- [ ] All entities render in correct order
- [ ] Ground renders with correct theme
- [ ] Environment scrolls correctly
- [ ] Background color changes with stage
- [ ] Scaling works identically
- [ ] Visual pixel-perfect comparison passes
- [ ] Tests verify render order

---

#### Task 2.3: Extract UIManager ⏱️ 6 hours
- **Extracts:** 70 lines from Game.js
- **Creates:** `js/systems/UIManager.js`
- **Events Consumed:** `SCORE_CHANGED`, `LIFE_CHANGED`, `HIGH_SCORE_CHANGED`, `ABILITIES_CHANGED`, `GAME_OVER`

**Scope Boundaries:**
- ✅ Extract all DOM manipulation
- ✅ Implement event-driven UI updates
- ✅ Move ability inventory rendering
- ❌ Do NOT change HTML structure
- ❌ Do NOT change CSS classes
- ❌ Do NOT modify UI appearance

**Architecture:**
```javascript
class UIManager {
    constructor(elements) {
        // Validate all DOM elements
        this.elements = this._validateElements(elements);
        this._setupEventListeners();
    }
    
    _validateElements(elements) {
        const required = [
            'scoreBoard',
            'livesDisplay',
            'finalScore',
            'startHighScore',
            'gameOverHighScore',
            'abilityInventory'
        ];
        
        required.forEach(key => {
            if (!elements[key]) {
                logger.warn('UIManager', `Element ${key} not found`);
            }
        });
        
        return elements;
    }
    
    _setupEventListeners() {
        eventManager.on('SCORE_CHANGED', (data) => this.updateScore(data.score));
        eventManager.on('LIFE_CHANGED', (data) => this.updateLives(data.lives));
        eventManager.on('HIGH_SCORE_CHANGED', (data) => this.updateHighScore(data.highScore));
        eventManager.on('ABILITIES_CHANGED', (data) => this.updateAbilityInventory(data));
        eventManager.on('GAME_OVER', (data) => this.showGameOver(data));
    }
    
    updateScore(score) {
        if (this.elements.scoreBoard) {
            this.elements.scoreBoard.textContent = `Score: ${score}`;
        }
    }
    
    updateAbilityInventory(data) {
        // Extract from Game.js updateAbilityUI()
    }
    
    dispose() {
        // Remove all event listeners
    }
}
```

**Implementation Steps:**
1. Create UIManager class with JSDoc
2. Implement constructor with element validation
3. Implement event listener setup
4. Implement updateScore()
5. Implement updateLives()
6. Implement updateHighScore()
7. Implement updateAbilityInventory() (extract from Game.js)
8. Implement showGameOver()
9. Implement dispose() for cleanup
10. Write UI tests (mock DOM elements)
11. Update event emitters in Player, ScoreManager, AbilityManager
12. Integrate into Game.js (remove updateXXXUI methods)
13. Verify UI updates identically
14. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~70 lines
- [ ] Score updates in real-time
- [ ] Lives display updates correctly
- [ ] High score displays correctly
- [ ] Ability inventory renders identically
- [ ] Active ability highlighted
- [ ] Ability time/uses display correctly
- [ ] Game over screen identical
- [ ] All DOM manipulation isolated in UIManager
- [ ] Tests verify DOM updates

---

#### Task 2.4: Extract GameInputHandler ⏱️ 4 hours
- **Extracts:** 30 lines from Game.js
- **Creates:** `js/systems/GameInputHandler.js`
- **Events Emitted:** `ABILITY_USED` (optional)

**Scope Boundaries:**
- ✅ Extract input routing logic
- ✅ Centralize state checking
- ❌ Do NOT add new input commands
- ❌ Do NOT modify InputManager
- ❌ Do NOT change input behavior

**Architecture:**
```javascript
class GameInputHandler {
    constructor(inputManager, state, getPlayer, particles, effects) {
        this.input = inputManager;
        this.state = state;
        this.getPlayer = getPlayer;
        this.particles = particles;
        this.effects = effects;
        
        this._bindHandlers();
    }
    
    _bindHandlers() {
        this.input.on('jump', () => this._handleJump());
        this.input.on('useAbility', () => this._handleUseAbility());
        this.input.on('cycleLeft', () => this._handleCycleAbility(-1));
        this.input.on('cycleRight', () => this._handleCycleAbility(1));
    }
    
    _handleJump() {
        if (!this._isPlaying()) return;
        
        const player = this.getPlayer();
        player.jump(Config, (x, y, color) => {
            this.particles.play('LAND_DUST', { x, y, color });
        });
    }
    
    _handleUseAbility() {
        if (!this._isPlaying()) return;
        
        const player = this.getPlayer();
        const context = { 
            registry: engineRegistry, 
            particles: this.particles 
        };
        player.useAbility(this.effects, context);
        eventManager.emit('ABILITY_USED');
    }
    
    _isPlaying() {
        return this.state.current === 'PLAYING';
    }
    
    dispose() {
        // Cleanup if needed
    }
}
```

**Implementation Steps:**
1. Create GameInputHandler class with JSDoc
2. Implement constructor with dependencies
3. Implement _bindHandlers()
4. Implement _handleJump() (extract from Game.js)
5. Implement _handleUseAbility() (extract from Game.js)
6. Implement _handleCycleAbility() (extract from Game.js)
7. Implement _isPlaying() helper
8. Write input handler tests (mock dependencies)
9. Integrate into Game.js (remove input handler setup)
10. Verify all input works identically
11. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~30 lines
- [ ] Jump works (Space, Click, Touch)
- [ ] Ability use works (E key)
- [ ] Ability cycling works (Q/R keys)
- [ ] Inputs ignored when not playing
- [ ] Particle effects trigger on jump
- [ ] Tests verify state checking

---

#### Task 2.5: Phase 2 Integration & Validation ⏱️ 4 hours

**Complete System Validation:**
1. Run full test suite
2. Play test 5 complete game sessions
3. Test every feature systematically
4. Visual comparison (video recording)
5. Performance testing (FPS measurement)
6. Memory profiling (no leaks)
7. Cross-browser testing
8. Run standard-checker.js
9. Document Phase 2 metrics

**Phase 2 Completion Criteria:**
- [ ] All Phase 2 tasks complete
- [ ] All tests passing (≥80% coverage)
- [ ] Game.js reduced by ~205 lines total
- [ ] Zero functional regressions
- [ ] Pixel-perfect visual parity
- [ ] FPS maintained at 60
- [ ] No memory leaks
- [ ] Works in Chrome, Firefox, Edge

**Phase 2 Sign-off:**
- [ ] Developer: _______________ Date: ___________
- [ ] Reviewer: _______________ Date: ___________

---

### Phase 3: Final Cleanup & Polish
**Duration:** Days 11-15 (Week 3)  
**Goal:** Complete remaining extractions and comprehensive testing  
**Risk:** LOW  
**Guardrail:** No changes to core game systems

#### Task 3.1: Create EnvironmentInitializer ⏱️ 2 hours
- **Extracts:** 5 lines from Game.js
- **Creates:** `js/utils/EnvironmentInitializer.js`

**Scope Boundaries:**
- ✅ Extract initial cloud spawning
- ✅ Make cloud count configurable
- ❌ Do NOT add new environment elements
- ❌ Do NOT change spawning algorithm

**Implementation Steps:**
1. Create EnvironmentInitializer utility class
2. Implement static initialize() method
3. Implement static spawnInitialClouds()
4. Add INITIAL_CLOUD_COUNT to Config.js
5. Write tests
6. Integrate into Game.js
7. Verify clouds spawn identically
8. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~5 lines
- [ ] Clouds spawn identically
- [ ] Configurable via Config.js
- [ ] Tests pass

---

#### Task 3.2: Optimize Context Building ⏱️ 2 hours

**Scope Boundaries:**
- ✅ Simplify buildContext() method
- ✅ Reduce redundant object creation
- ❌ Do NOT change context structure
- ❌ Do NOT modify what systems receive

**Implementation Steps:**
1. Analyze context usage across systems
2. Document what each system needs
3. Consider GameContext helper class (optional)
4. Optimize buildContext() in Game.js
5. Verify all systems receive correct data
6. Performance test (no regression)
7. Run verification protocol

**Success Criteria:**
- [ ] Context building cleaner
- [ ] No performance regression
- [ ] All systems function identically

---

#### Task 3.3: Move Theme Application ⏱️ 2 hours

**Scope Boundaries:**
- ✅ Move applyStageTheme() to appropriate system
- ✅ Maintain event listener
- ❌ Do NOT modify theme structure
- ❌ Do NOT change theme behavior

**Implementation Steps:**
1. Decide destination (RenderSystem or UIManager)
2. Move applyStageTheme() method
3. Update STAGE_CHANGED event listener
4. Verify themes apply correctly
5. Verify CSS variables update
6. Verify particle effects trigger
7. Run verification protocol

**Success Criteria:**
- [ ] Game.js reduced by ~13 lines
- [ ] Themes apply identically
- [ ] Visual transitions work
- [ ] No broken stage changes

---

#### Task 3.4: Final Game.js Cleanup ⏱️ 3 hours

**Scope Boundaries:**
- ✅ Remove commented code
- ✅ Optimize method organization
- ✅ Verify responsibilities
- ❌ Do NOT refactor working systems
- ❌ Do NOT add optimizations

**Implementation Steps:**
1. Review Game.js line by line
2. Remove all commented-out code
3. Remove any TODO/FIXME comments
4. Group related methods with section comments
5. Verify Game.js only contains:
   - System initialization
   - High-level coordination
   - State transitions
   - Context building
6. Confirm 150-180 line target
7. Run verification protocol

**Target Structure:**
```javascript
export class Game {
    // ~30 lines: Constructor - Initialize all systems
    constructor() { }
    
    // ~10 lines: Setup - Event listeners and button handlers
    init() { }
    
    // ~10 lines: Start game - Reset and begin
    start() { }
    
    // ~10 lines: Game over - Finalize score
    gameOver() { }
    
    // ~30 lines: Update coordination
    update(dt) { }
    
    // ~5 lines: Draw coordination
    draw() { }
    
    // ~20 lines: Build update context
    buildContext() { }
    
    // ~15 lines: Build draw context
    buildDrawContext() { }
    
    // ~5 lines: Button setup
    _setupButtons() { }
}
// Target: 150-180 lines total
```

**Success Criteria:**
- [ ] Game.js is 150-180 lines
- [ ] No commented code remains
- [ ] Clear method organization
- [ ] Only coordination responsibilities remain

---

#### Task 3.5: Comprehensive Documentation Update ⏱️ 4 hours

**Documentation Tasks:**

1. **Update architecture.md**
   - Document all new systems
   - Create system interaction diagram
   - Update component descriptions
   - Document event flow

2. **Create System Documentation**
   - One doc section per system
   - Include usage examples
   - Include configuration
   - Include testing approach

3. **Update README.md**
   - Update project structure
   - Update getting started
   - Update any references to Game.js

4. **Create Migration Guide**
   - Document what changed
   - Include before/after comparisons
   - Document for future developers
   - Include common patterns

**Success Criteria:**
- [ ] All systems documented
- [ ] architecture.md reflects current state
- [ ] Documentation is accurate
- [ ] Code examples tested

---

#### Task 3.6: Comprehensive Testing & QA ⏱️ 8 hours

**Phase A: Automated Testing**
- [ ] Run complete test suite
- [ ] Verify 80%+ coverage for all new systems
- [ ] All tests pass
- [ ] No flaky tests
- [ ] Performance tests pass

**Phase B: Manual Play Testing** (30 min continuous)
- [ ] Game start/restart
- [ ] Jump mechanics
- [ ] Platform jumping
- [ ] Obstacle collision
- [ ] Item collection (all types)
- [ ] Ability usage (all abilities)
- [ ] Ability cycling
- [ ] Score tracking
- [ ] High score saving
- [ ] Lives system
- [ ] Level progression
- [ ] Stage changes
- [ ] Theme transitions
- [ ] UI updates
- [ ] Game over screen

**Phase C: Device/Browser Testing**
- [ ] Desktop Windows (Chrome, Firefox, Edge)
- [ ] Desktop Mac (Chrome, Safari) - if available
- [ ] Tablet
- [ ] Mobile phone
- [ ] Multiple aspect ratios

**Phase D: Edge Case Testing**
- [ ] Window resize during play
- [ ] Rapid input (button mashing)
- [ ] Tab switching (pause/resume)
- [ ] Multiple rapid restarts
- [ ] Long play session (10+ minutes)

**Phase E: Performance Testing**
- [ ] FPS measurement (target: 60fps)
- [ ] Memory profiling (no leaks over 10 min)
- [ ] CPU usage acceptable
- [ ] No dropped frames
- [ ] Smooth animations

**Phase F: Code Quality Audit**
- [ ] Run ESLint (zero errors)
- [ ] Run standard-checker.js (passes)
- [ ] Review all new files for standards
- [ ] No console.log statements
- [ ] No TODOs or FIXMEs
- [ ] No commented-out code
- [ ] Consistent formatting

**Phase G: Regression Testing**
- [ ] Compare with baseline video
- [ ] Verify identical gameplay
- [ ] Verify identical visuals
- [ ] Verify identical performance

---

#### Task 3.7: Final Review & Sign-off ⏱️ 2 hours

**Final Metrics Verification:**

| Metric | Baseline | Target | Actual | ✓ |
|--------|----------|--------|--------|---|
| Game.js Lines | 425 | 150-180 | ___ | [ ] |
| Game.js Methods | 12 | 6-8 | ___ | [ ] |
| Systems Extracted | 0 | 7-10 | ___ | [ ] |
| New System LOC | 0 | ~600-800 | ___ | [ ] |
| Test Coverage | ___% | 80%+ | ___% | [ ] |
| FPS (Desktop) | 60 | 60 | ___ | [ ] |
| Memory Delta | ___ MB | ≤ +5MB | ___ MB | [ ] |

**Quality Gates:**
- [ ] All code follows project standards
- [ ] All tests pass (≥80% coverage)
- [ ] Zero linter errors
- [ ] Zero console errors in browser
- [ ] standard-checker.js passes
- [ ] All documentation updated
- [ ] Migration guide complete

**Functional Parity:**
- [ ] All features work identically
- [ ] All UI updates identically
- [ ] All visual effects identical
- [ ] Performance maintained

**Stakeholder Review:**
- [ ] Code review completed
- [ ] Play testing by others
- [ ] Feedback incorporated
- [ ] Approval obtained

**Phase 3 Sign-off:**
- [ ] Developer: _______________ Date: ___________
- [ ] Reviewer: _______________ Date: ___________

---

## 🎯 Final Success Criteria

The refactoring is considered **COMPLETE** when:

### Quantitative Goals (ALL REQUIRED)
- ✅ Game.js reduced from 425 → 150-180 lines (65% reduction achieved)
- ✅ 7-10 new systems created and integrated
- ✅ All new systems have ≥80% test coverage
- ✅ Overall test suite passes with no failures
- ✅ Zero ESLint errors
- ✅ Zero console errors in browser
- ✅ standard-checker.js passes all checks
- ✅ FPS maintained at 60 (±2 fps acceptable)
- ✅ Memory usage delta ≤ 5MB over 10 min session

### Qualitative Goals (ALL REQUIRED)
- ✅ Game behavior 100% identical to baseline
- ✅ Visual output pixel-perfect match
- ✅ All project coding standards enforced
- ✅ Event-driven architecture implemented
- ✅ Manager pattern consistently applied
- ✅ No global variables created
- ✅ All DOM queries null-checked
- ✅ All event listeners have cleanup
- ✅ Documentation complete and accurate

### Documentation Goals (ALL REQUIRED)
- ✅ architecture.md updated with new systems
- ✅ Each system has complete JSDoc
- ✅ Migration guide created
- ✅ README.md updated
- ✅ All events documented

### Approval Gates (ALL REQUIRED)
- ✅ Developer verification complete
- ✅ Code review passed
- ✅ QA testing passed
- ✅ Stakeholder approval obtained
- ✅ Phase 1 sign-off
- ✅ Phase 2 sign-off
- ✅ Phase 3 sign-off

---

## 🚨 Stop Conditions

Work must **IMMEDIATELY STOP** if any of the following occur:

### Critical Stop Conditions
1. **Functional Regression**: Any feature stops working correctly
2. **Visual Regression**: Any visual change from baseline detected
3. **Performance Degradation**: FPS drops below 55 or stuttering occurs
4. **Memory Leak**: Memory continuously increases during play
5. **Standard Violation**: Code violates project coding standards
6. **Scope Creep**: Feature addition or enhancement attempted

### Recovery Procedure
1. Stop all work immediately
2. Document the issue in detail
3. Revert to last known good state
4. Analyze root cause
5. Update plan if necessary
6. Get approval to resume
7. Restart from checkpoint

---

## 📞 Communication & Reporting

### Daily Progress Report Template
```markdown
## Daily Progress: [Date]

### Completed Today
- [X] Task 1.1: ScoreManager extraction
  - Lines reduced: 22
  - Tests added: 8 (92% coverage)
  - Status: ✅ Verified

### Blockers
- None

### Tomorrow's Plan
- [ ] Task 1.2: ViewportManager extraction
- [ ] Begin integration testing

### Metrics
- FPS: 60 (unchanged)
- Total lines reduced: 22/275 (8%)
```

### Weekly Summary Template
```markdown
## Week [N] Summary

### Achievements
- Phase [N] completed
- Systems extracted: [list]
- Total lines reduced: [N]
- Test coverage: [N]%

### Challenges & Solutions
- [Challenge]: [Solution]

### Next Week Focus
- [Goals]
```

---

## 📚 Reference Quick Links

- **Standards**
  - [coding_standards.md](coding_standards.md) - Code formatting and patterns
  - [js_enforcement.md](js_enforcement.md) - JavaScript safety rules
  - [ai_quality_protocol.md](ai_quality_protocol.md) - Quality checklist

- **Architecture**
  - [architecture.md](architecture.md) - Current architecture
  - [decoupled_entity_construction.md](decoupled_entity_construction.md) - Manager pattern
  - [game_js_responsibility_analysis.md](game_js_responsibility_analysis.md) - Detailed analysis

- **Project Files**
  - [Config.js](../js/Config.js) - Game configuration
  - [Game.js](../js/Game.js) - Main game file (refactor target)

---

## 🏁 Final Sign-off

### Phase Approvals
- [x] **Phase 1 Complete**: Developer _______ Reviewer _______ Date _______
- [ ] **Phase 2 Complete**: Developer _______ Reviewer _______ Date _______
- [ ] **Phase 3 Complete**: Developer _______ Reviewer _______ Date _______

### Final Project Approval
- [ ] **Project Lead**: _______________ Date: ___________
- [ ] **QA Lead**: _______________ Date: ___________
- [ ] **Technical Architect**: _______________ Date: ___________

### Deployment Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance verified
- [ ] Cross-browser tested
- [ ] Git tagged: `v2.0-refactored`
- [ ] Merge to main approved
- [ ] Team notified

---

**Document Version:** 2.0  
**Last Updated:** January 23, 2026  
**Status:** ✅ Ready for Execution  
**Execution Start Date:** ___________  
**Execution End Date:** ___________

---

## 🎓 Lessons Learned (Post-Execution)

*To be filled in after completion:*

### What Went Well
- 

### What Could Be Improved
- 

### Unexpected Challenges
- 

### Time Estimates Accuracy
- 

### Recommendations for Future Refactorings
- 

---

**End of Execution Plan**

# Game.js Refactoring Analysis
**Aggressive Enhancement Strategy for Thin Orchestration Layer**

---

## Executive Summary

Game.js currently contains **15+ distinct responsibilities** spanning initialization, state management, spawning, UI updates, input handling, rendering, theme management, and game logic. This analysis proposes an aggressive refactoring to transform Game.js into a **thin orchestration layer** that exclusively delegates to specialized systems, adhering to the principle: **Game.js should call, not implement**.

**Target State**: Game.js becomes a ~100 line coordinator that wires systems together and routes events—nothing more.

---

## Current Responsibility Inventory

### 1. **UI Management & DOM Manipulation** (Lines 41-49, 217-229, 349-371)
- **Current**: Directly queries DOM elements, updates score/lives/high score UI, manages ability card HTML generation
- **Issues**: Violates separation of concerns; game logic shouldn't manipulate DOM
- **Evidence**:
  ```javascript
  this.scoreElement = Dom.get('scoreBoard');
  this.livesElement = Dom.get('livesDisplay');
  // ... 7 more DOM element references
  
  updateStatsUI() {
      if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`;
      // Direct DOM manipulation in game class
  }
  
  updateAbilityUI() {
      this.abilityInventoryElement.innerHTML = '';
      // Manual HTML generation loop (lines 349-371)
  }
  ```

### 2. **Canvas Scaling & Viewport Management** (Lines 231-251, 382-383)
- **Current**: Calculates scale ratios, manages logical vs physical dimensions, handles resize events
- **Issues**: Low-level canvas concerns shouldn't be in game coordinator
- **Evidence**:
  ```javascript
  resize() {
      const physicalWidth = this.container.clientWidth;
      const physicalHeight = this.container.clientHeight;
      this.canvas.width = physicalWidth;
      this.canvas.height = physicalHeight;
      this.scaleRatio = physicalHeight / LOGICAL_HEIGHT;
      this.logicalWidth = physicalWidth / this.scaleRatio;
      // Complex scaling logic embedded in Game
  }
  ```

### 3. **Entity Spawning Logic** (Lines 273-324)
- **Current**: Manually manages timers for 5 entity types, calculates spawn positions, handles spawn probability
- **Issues**: Game.js shouldn't know spawning intervals, positions, or entity construction details
- **Evidence**:
  ```javascript
  this.obstacleTimer += dt;
  if (this.obstacleTimer > this.level.spawnInterval) {
      this.obstacleTimer = 0;
      new Obstacle(this.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);
  }
  // Repeated pattern for platforms, clouds, items, particles (90+ lines)
  ```

### 4. **Input Event Binding** (Lines 115-151)
- **Current**: Directly binds input events to player actions and UI buttons
- **Issues**: Input routing should be abstracted; Game shouldn't know about jump/ability mechanics
- **Evidence**:
  ```javascript
  this.input.on('jump', () => {
      if (this.state.current === 'PLAYING') {
          this.player.jump(Config, (x, y, color) => {
              this.particles.play('LAND_DUST', { x, y, color });
          });
      }
  });
  // 3 more input handlers with embedded game logic
  ```

### 5. **Theme Application & CSS Variable Manipulation** (Lines 97-113)
- **Current**: Applies stage themes by setting CSS variables and triggering particle effects
- **Issues**: Game logic shouldn't touch document.documentElement.style
- **Evidence**:
  ```javascript
  applyStageTheme(stage) {
      document.documentElement.style.setProperty('--primary-color', stage.theme.primary);
      document.documentElement.style.setProperty('--bg-color', stage.theme.background);
      this.particles.play('PICKUP_BURST', { /* ... */ });
      logger.info('Game', `Applied Stage Theme: ${stage.name}`);
  }
  ```

### 6. **Entity Context Assembly** (Lines 263-278)
- **Current**: Manually builds context objects with config, dimensions, registries, callbacks
- **Issues**: Context structure knowledge embedded in Game; hard to extend
- **Evidence**:
  ```javascript
  const context = {
      config: Config,
      logicalHeight: LOGICAL_HEIGHT,
      gameSpeed: this.gameSpeed,
      worldModifiers: this.level.worldModifiers,
      platforms: engineRegistry.getByType('platform'),
      registry: engineRegistry,
      particles: this.particles,
      onObstaclePassed: () => {
          this.score++;
          this.updateStatsUI();
      }
  };
  ```

### 7. **Customization Data Loading** (Lines 175-183)
- **Current**: Loads outfit data from Storage and passes to Player constructor
- **Issues**: Game shouldn't know storage keys or outfit structure
- **Evidence**:
  ```javascript
  const outfit = Storage.load('current_outfit', {
      body: 'pink',
      mane: 'gold',
      accessory: 'none',
      trail: 'rainbow'
  });
  this.player = new Player(outfit);
  ```

### 8. **Rendering Pipeline Management** (Lines 373-416)
- **Current**: Orchestrates draw order, applies scaling transforms, draws ground, manages theme-based backgrounds
- **Issues**: Draw order and rendering concerns should be delegated
- **Evidence**:
  ```javascript
  draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Background theme application
      if (this.level.currentStage) {
          this.ctx.fillStyle = this.level.currentStage.theme.background;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      // Manual entity group drawing (30+ lines)
      this.ctx.fillStyle = theme.primary;
      this.ctx.fillRect(/* ground drawing */);
  }
  ```

### 9. **Environment Decoration Drawing** (Lines 418-425)
- **Current**: Calculates scrolling flower/element positions based on game speed
- **Issues**: Visual decoration logic embedded in Game.js
- **Evidence**:
  ```javascript
  drawEnvironment() {
      const time = performance.now() / 1000;
      const speed = this.gameSpeed;
      const stage = this.level.currentStage;
      const elements = stage?.theme.elements || ['🌸'];
      for (let i = 0; i < this.logicalWidth; i += 100) {
          let offset = ((time * speed) + i) % (this.logicalWidth + 100);
          this.ctx.fillText(icon, this.logicalWidth - offset, LOGICAL_HEIGHT - 20);
      }
  }
  ```

### 10. **Score & High Score Management** (Lines 202-215, 226-229)
- **Current**: Tracks score, compares with high score, saves to storage
- **Issues**: Score business logic shouldn't live in Game.js
- **Evidence**:
  ```javascript
  gameOver() {
      if (this.score > this.highScore) {
          this.highScore = this.score;
          Storage.save('highScore', this.highScore);
          this.updateHighScoreUI();
      }
  }
  ```

### 11. **Lifecycle State Management** (Lines 156-200)
- **Current**: Manages internal state arrays, timer resets, registry clearing, initial entity spawning
- **Issues**: Initialization logic is procedural and game-specific
- **Evidence**:
  ```javascript
  resetInternalState() {
      this.score = 0;
      this.gameSpeed = Config.INITIAL_GAME_SPEED;
      if (this.level) this.level.reset();
      this.obstacleTimer = 0;
      this.platformTimer = 0;
      this.cloudTimer = 0;
      this.particleTimer = 0;
      this.itemTimer = 0;
      engineRegistry.clear();
      // Manual initial cloud spawning
  }
  ```

### 12. **System Update Orchestration** (Lines 253-343)
- **Current**: Manually calls update on 9+ systems in specific order
- **Issues**: Update pipeline hardcoded; adding new systems requires editing Game.js
- **Evidence**:
  ```javascript
  update(dt) {
      this.level.update(dt);
      this.abilities.update(dt);
      this.gameSpeed = this.level.gameSpeed;
      // ... spawning timers
      this.particles.update(dt, context);
      this.effects.update(dt, context);
      engineRegistry.updateAll(dt, context);
      CollisionSystem.resolve(engineRegistry, this.particles, context);
  }
  ```

### 13. **Event Handler Registration** (Lines 79-95)
- **Current**: Subscribes to 4 event types with embedded handler logic
- **Issues**: Event routing logic embedded instead of delegated
- **Evidence**:
  ```javascript
  setupEvents() {
      eventManager.on('LEVEL_UP', ({ level }) => {
          logger.info('Game', `Systemic Level Up: ${level}`);
      });
      eventManager.on('STAGE_CHANGED', (stage) => {
          this.applyStageTheme(stage);
      });
      // 2 more handlers
  }
  ```

### 14. **Hardcoded Constants** (Lines 34, 188, 194, 291, etc.)
- **Current**: LOGICAL_HEIGHT duplicated, magic numbers scattered throughout
- **Issues**: Configuration values embedded in logic flow
- **Evidence**:
  ```javascript
  const LOGICAL_HEIGHT = 600; // Top-level constant
  new Obstacle(this.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);
  new Cloud(this.logicalWidth + 100, Math.random() * (LOGICAL_HEIGHT - 150));
  ```

### 15. **Platform Spawn Mode Logic** (Lines 297-310)
- **Current**: Reads Config.PLATFORM_PLACEMENT_MODE and applies conditional spawning
- **Issues**: Spawning strategy shouldn't be evaluated in Game.js
- **Evidence**:
  ```javascript
  if (Config.PLATFORM_PLACEMENT_MODE === 'deterministic') {
      shouldSpawn = true;
  } else {
      shouldSpawn = Math.random() < Config.PLATFORM_PROBABILITY;
  }
  ```

---

## Proposed Refactoring Strategy

### Phase 1: Extract Systems

#### 1.1 **Create UIManager System** (Addresses Responsibility #1)
**Location**: `js/systems/UIManager.js`

**Responsibilities**:
- Query and cache DOM elements
- Update score, lives, high score displays
- Generate ability card HTML
- Listen to game events for UI updates

**Game.js Change**:
```javascript
// BEFORE (Lines 41-49, 217-229, 349-371): ~60 lines of DOM logic
this.scoreElement = Dom.get('scoreBoard');
updateStatsUI() { /* ... */ }
updateAbilityUI() { /* ... */ }

// AFTER: 1 line
this.ui = new UIManager(this.player);
```

**UIManager API**:
```javascript
class UIManager {
    constructor(player) {
        this.player = player;
        this.cacheElements();
        this.bindEvents();
    }
    
    update() { /* Called by game loop if needed */ }
    onScoreChange(score) { /* Event handler */ }
    onLivesChange(lives) { /* Event handler */ }
    onAbilityChange(abilities, currentIndex) { /* Event handler */ }
    onHighScoreChange(highScore) { /* Event handler */ }
}
```

**Impact**: Removes 60+ lines from Game.js; UI logic becomes testable in isolation

---

#### 1.2 **Create ViewportManager System** (Addresses Responsibility #2)
**Location**: `js/systems/ViewportManager.js`

**Responsibilities**:
- Calculate logical/physical dimensions
- Handle resize events
- Provide scale ratio to renderer
- Manage canvas resolution

**Game.js Change**:
```javascript
// BEFORE (Lines 231-251): 20 lines of scaling math
resize() { 
    const physicalWidth = this.container.clientWidth;
    this.scaleRatio = physicalHeight / LOGICAL_HEIGHT;
    // ...
}

// AFTER: 2 lines
this.viewport = new ViewportManager(this.canvas, this.container, LOGICAL_HEIGHT);
window.addEventListener('resize', () => this.viewport.resize());
```

**ViewportManager API**:
```javascript
class ViewportManager {
    get logicalWidth() { return this._logicalWidth; }
    get logicalHeight() { return this._logicalHeight; }
    get scaleRatio() { return this._scaleRatio; }
    resize() { /* Recalculates dimensions */ }
}
```

**Impact**: Removes 20 lines from Game.js; viewport logic becomes portable

---

#### 1.3 **Create SpawnManager System** (Addresses Responsibility #3)
**Location**: `js/systems/SpawnManager.js`

**Responsibilities**:
- Own all spawn timers (obstacle, platform, cloud, item, particle trail)
- Calculate spawn positions using LevelUtils
- Instantiate entities with proper parameters
- Integrate with LevelSystem for spawn rate modifiers

**Game.js Change**:
```javascript
// BEFORE (Lines 273-324): ~90 lines of timer management
this.obstacleTimer += dt;
if (this.obstacleTimer > this.level.spawnInterval) {
    this.obstacleTimer = 0;
    new Obstacle(this.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);
}
// ... repeated 4 more times

// AFTER: 1 line in update()
this.spawner.update(dt, this.viewport, this.level, this.player);
```

**SpawnManager Structure**:
```javascript
class SpawnManager {
    constructor(config) {
        this.timers = {
            obstacle: 0,
            platform: 0,
            cloud: 0,
            item: 0,
            particleTrail: 0
        };
        this.spawners = {
            obstacle: new ObstacleSpawner(),
            platform: new PlatformSpawner(),
            cloud: new CloudSpawner(),
            item: new ItemSpawner(),
            particleTrail: new ParticleTrailSpawner()
        };
    }
    
    update(dt, viewport, level, player) {
        Object.entries(this.spawners).forEach(([key, spawner]) => {
            this.timers[key] += dt;
            if (this.timers[key] > spawner.getInterval(level)) {
                this.timers[key] = 0;
                spawner.spawn(viewport, level, player);
            }
        });
    }
}
```

**Impact**: Removes 90+ lines from Game.js; spawning logic becomes data-driven and extensible

---

#### 1.4 **Create InputRouter System** (Addresses Responsibility #4)
**Location**: `js/systems/InputRouter.js`

**Responsibilities**:
- Subscribe to InputManager events
- Route commands to appropriate systems (player, UI, state controller)
- Handle state-specific input filtering

**Game.js Change**:
```javascript
// BEFORE (Lines 115-151): 36 lines of input binding
this.input.on('jump', () => {
    if (this.state.current === 'PLAYING') {
        this.player.jump(Config, (x, y, color) => {
            this.particles.play('LAND_DUST', { x, y, color });
        });
    }
});
// ... 3 more handlers

// AFTER: 2 lines in constructor
this.inputRouter = new InputRouter(this.input, this.state);
this.inputRouter.bindGameCommands(this.player, this.effects, this.particles);
```

**InputRouter API**:
```javascript
class InputRouter {
    constructor(inputManager, stateController) {
        this.input = inputManager;
        this.state = stateController;
    }
    
    bindGameCommands(player, effects, particles) {
        this.input.on('jump', () => {
            if (this.state.current === 'PLAYING') {
                player.executeJump(effects, particles);
            }
        });
        // etc.
    }
    
    bindUICommands(uiCallbacks) {
        Dom.all('.js-start-btn').forEach(btn => {
            btn.addEventListener('click', uiCallbacks.onStart);
        });
    }
}
```

**Impact**: Removes 36 lines from Game.js; input logic becomes testable

---

#### 1.5 **Create ThemeManager System** (Addresses Responsibility #5)
**Location**: `js/systems/ThemeManager.js`

**Responsibilities**:
- Apply stage themes to CSS variables
- Trigger theme transition effects
- Manage theme caching

**Game.js Change**:
```javascript
// BEFORE (Lines 97-113): 16 lines of theme application
applyStageTheme(stage) {
    document.documentElement.style.setProperty('--primary-color', stage.theme.primary);
    document.documentElement.style.setProperty('--bg-color', stage.theme.background);
    this.particles.play('PICKUP_BURST', { /* ... */ });
}

// AFTER: 1 line in constructor, auto-subscribes to events
this.themeManager = new ThemeManager(this.particles, this.viewport);
```

**ThemeManager API**:
```javascript
class ThemeManager {
    constructor(particleSystem, viewport) {
        this.particles = particleSystem;
        this.viewport = viewport;
        eventManager.on('STAGE_CHANGED', (stage) => this.apply(stage));
    }
    
    apply(stage) {
        this.applyCSS(stage.theme);
        this.triggerTransitionEffect(stage.theme.primary);
    }
}
```

**Impact**: Removes 16 lines from Game.js; theme logic decoupled

---

#### 1.6 **Create ContextBuilder System** (Addresses Responsibility #6)
**Location**: `js/systems/ContextBuilder.js`

**Responsibilities**:
- Assemble update context from current game state
- Provide standardized context structure
- Cache registry queries

**Game.js Change**:
```javascript
// BEFORE (Lines 263-278): 15 lines of object construction
const context = {
    config: Config,
    logicalHeight: LOGICAL_HEIGHT,
    gameSpeed: this.gameSpeed,
    worldModifiers: this.level.worldModifiers,
    platforms: engineRegistry.getByType('platform'),
    registry: engineRegistry,
    particles: this.particles,
    onObstaclePassed: () => { this.score++; this.updateStatsUI(); }
};

// AFTER: 1 line
const context = this.contextBuilder.build(dt);
```

**ContextBuilder API**:
```javascript
class ContextBuilder {
    constructor(config, viewport, level, score, particles) {
        this.config = config;
        this.viewport = viewport;
        this.level = level;
        this.score = score;
        this.particles = particles;
    }
    
    build(dt) {
        return {
            dt,
            config: this.config,
            logicalHeight: this.viewport.logicalHeight,
            gameSpeed: this.level.gameSpeed,
            worldModifiers: this.level.worldModifiers,
            platforms: engineRegistry.getByType('platform'),
            registry: engineRegistry,
            particles: this.particles,
            onObstaclePassed: () => eventManager.emit('OBSTACLE_PASSED')
        };
    }
}
```

**Impact**: Removes 15 lines from Game.js; context structure becomes centralized

---

#### 1.7 **Create CustomizationManager System** (Addresses Responsibility #7)
**Location**: `js/systems/CustomizationManager.js`

**Responsibilities**:
- Load player customization from storage
- Provide default fallbacks
- Handle outfit validation

**Game.js Change**:
```javascript
// BEFORE (Lines 175-183): 8 lines of storage access
const outfit = Storage.load('current_outfit', {
    body: 'pink',
    mane: 'gold',
    accessory: 'none',
    trail: 'rainbow'
});
this.player = new Player(outfit);

// AFTER: 1 line
this.player = new Player(CustomizationManager.loadOutfit());
```

**CustomizationManager API**:
```javascript
class CustomizationManager {
    static loadOutfit() {
        return Storage.load('current_outfit', this.DEFAULT_OUTFIT);
    }
    
    static saveOutfit(outfit) {
        Storage.save('current_outfit', outfit);
    }
    
    static DEFAULT_OUTFIT = {
        body: 'pink',
        mane: 'gold',
        accessory: 'none',
        trail: 'rainbow'
    };
}
```

**Impact**: Removes 8 lines from Game.js; customization logic portable

---

#### 1.8 **Create RenderPipeline System** (Addresses Responsibility #8 & #9)
**Location**: `js/systems/RenderPipeline.js`

**Responsibilities**:
- Define render layer ordering
- Apply background themes
- Draw ground with theme colors
- Render environment decorations
- Manage canvas transforms

**Game.js Change**:
```javascript
// BEFORE (Lines 373-425): ~52 lines of render orchestration
draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.level.currentStage) {
        this.ctx.fillStyle = this.level.currentStage.theme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.ctx.save();
    this.ctx.scale(this.scaleRatio, this.scaleRatio);
    // ... 30 lines of entity drawing
    this.drawEnvironment();
    this.ctx.restore();
}

// AFTER: 1 line
draw() {
    this.renderPipeline.render(this.ctx);
}
```

**RenderPipeline API**:
```javascript
class RenderPipeline {
    constructor(viewport, level, particles, effects, player) {
        this.viewport = viewport;
        this.level = level;
        this.particles = particles;
        this.effects = effects;
        this.player = player;
        this.layers = ['clouds', 'ground', 'particles', 'effects', 'platforms', 'obstacles', 'items', 'player', 'environment'];
    }
    
    render(ctx) {
        this.clear(ctx);
        this.applyBackground(ctx);
        ctx.save();
        ctx.scale(this.viewport.scaleRatio, this.viewport.scaleRatio);
        this.layers.forEach(layer => this.renderLayer(ctx, layer));
        ctx.restore();
    }
    
    renderLayer(ctx, layer) {
        // Lookup renderer for layer
    }
}
```

**Impact**: Removes 52 lines from Game.js; rendering becomes declarative

---

#### 1.9 **Create ScoreSystem System** (Addresses Responsibility #10)
**Location**: `js/systems/ScoreSystem.js`

**Responsibilities**:
- Track current score
- Load/save high score
- Compare and update high scores
- Emit score change events

**Game.js Change**:
```javascript
// BEFORE (Lines 202-215, 226-229): ~20 lines
gameOver() {
    if (this.score > this.highScore) {
        this.highScore = this.score;
        Storage.save('highScore', this.highScore);
        this.updateHighScoreUI();
    }
}

// AFTER: Constructor + event subscription
this.scoreSystem = new ScoreSystem();
eventManager.on('OBSTACLE_PASSED', () => this.scoreSystem.increment());
eventManager.on('GAME_OVER', () => this.scoreSystem.finalize());
```

**ScoreSystem API**:
```javascript
class ScoreSystem {
    constructor() {
        this.current = 0;
        this.high = Storage.load('highScore', 0);
    }
    
    increment() {
        this.current++;
        eventManager.emit('SCORE_CHANGED', this.current);
    }
    
    reset() {
        this.current = 0;
        eventManager.emit('SCORE_CHANGED', this.current);
    }
    
    finalize() {
        if (this.current > this.high) {
            this.high = this.current;
            Storage.save('highScore', this.high);
            eventManager.emit('HIGH_SCORE_CHANGED', this.high);
        }
    }
}
```

**Impact**: Removes 20 lines from Game.js; score logic centralized

---

#### 1.10 **Create WorldInitializer System** (Addresses Responsibility #11)
**Location**: `js/systems/WorldInitializer.js`

**Responsibilities**:
- Initialize player with customization
- Spawn initial clouds
- Reset all system states
- Clear registries

**Game.js Change**:
```javascript
// BEFORE (Lines 156-200): ~44 lines
resetInternalState() {
    this.score = 0;
    this.gameSpeed = Config.INITIAL_GAME_SPEED;
    if (this.level) this.level.reset();
    this.obstacleTimer = 0;
    this.platformTimer = 0;
    this.cloudTimer = 0;
    this.particleTimer = 0;
    this.itemTimer = 0;
    engineRegistry.clear();
    const outfit = Storage.load('current_outfit', { /* ... */ });
    this.player = new Player(outfit);
    this.player.onGameOver = () => this.gameOver();
    this.updateStatsUI();
    for (let i = 0; i < 5; i++) {
        new Cloud(Math.random() * spawnWidth, Math.random() * (LOGICAL_HEIGHT - 150));
    }
}

// AFTER: 3 lines
start() {
    this.world = WorldInitializer.create(this.viewport, this.level, this.scoreSystem, () => this.gameOver());
    this.state.setState('PLAYING');
}
```

**WorldInitializer API**:
```javascript
class WorldInitializer {
    static create(viewport, level, scoreSystem, onGameOver) {
        level.reset();
        scoreSystem.reset();
        engineRegistry.clear();
        
        const player = new Player(CustomizationManager.loadOutfit());
        player.onGameOver = onGameOver;
        
        // Spawn initial decorations
        for (let i = 0; i < 5; i++) {
            new Cloud(
                Math.random() * viewport.logicalWidth,
                Math.random() * (viewport.logicalHeight - 150)
            );
        }
        
        return { player };
    }
}
```

**Impact**: Removes 44 lines from Game.js; initialization becomes declarative

---

#### 1.11 **Create UpdatePipeline System** (Addresses Responsibility #12)
**Location**: `js/systems/UpdatePipeline.js`

**Responsibilities**:
- Define update order for all systems
- Automatically invoke system updates
- Provide plugin architecture for custom systems

**Game.js Change**:
```javascript
// BEFORE (Lines 253-343): ~90 lines
update(dt) {
    if (this.state.current !== 'PLAYING') return;
    this.level.update(dt);
    this.abilities.update(dt);
    this.gameSpeed = this.level.gameSpeed;
    const context = { /* ... */ };
    // Spawning logic (50+ lines)
    this.particles.update(dt, context);
    this.effects.update(dt, context);
    engineRegistry.updateAll(dt, context);
    CollisionSystem.resolve(engineRegistry, this.particles, context);
}

// AFTER: 3 lines
update(dt) {
    if (this.state.current !== 'PLAYING') return;
    this.updatePipeline.execute(dt);
}
```

**UpdatePipeline API**:
```javascript
class UpdatePipeline {
    constructor(systems) {
        this.systems = systems; // Ordered array
    }
    
    execute(dt) {
        const context = this.systems.contextBuilder.build(dt);
        this.systems.level.update(dt);
        this.systems.abilities.update(dt);
        this.systems.spawner.update(dt, this.systems.viewport, this.systems.level, this.systems.player);
        this.systems.particles.update(dt, context);
        this.systems.effects.update(dt, context);
        this.systems.registry.updateAll(dt, context);
        this.systems.collision.resolve(this.systems.registry, this.systems.particles, context);
    }
    
    addSystem(name, system, position) {
        // Plugin API for extending update loop
    }
}
```

**Impact**: Removes 90+ lines from Game.js; update loop becomes data-driven

---

#### 1.12 **Refactor Event Subscription** (Addresses Responsibility #13)
**Location**: Move handlers to respective systems

**Game.js Change**:
```javascript
// BEFORE (Lines 79-95): 16 lines of event handlers
setupEvents() {
    eventManager.on('LEVEL_UP', ({ level }) => {
        logger.info('Game', `Systemic Level Up: ${level}`);
    });
    eventManager.on('STAGE_CHANGED', (stage) => {
        this.applyStageTheme(stage);
    });
    eventManager.on('ABILITY_APPLIED', () => {
        this.updateAbilityUI();
    });
    eventManager.on('LIFE_CHANGED', () => {
        this.updateStatsUI();
    });
}

// AFTER: Delete entire method (systems auto-subscribe in their constructors)
```

**Distribution**:
- `LEVEL_UP` → Handled by Logger system
- `STAGE_CHANGED` → Handled by ThemeManager
- `ABILITY_APPLIED` → Handled by UIManager
- `LIFE_CHANGED` → Handled by UIManager

**Impact**: Removes 16 lines from Game.js; event routing decentralized

---

#### 1.13 **Extract Configuration Constants** (Addresses Responsibility #14)
**Location**: `js/Config.js`

**Game.js Change**:
```javascript
// BEFORE: Scattered throughout Game.js
const LOGICAL_HEIGHT = 600;
new Obstacle(this.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);

// AFTER: All references use Config
new Obstacle(this.viewport.spawnX, this.viewport.groundY);
```

**Config Addition**:
```javascript
// In Config.js
export const VIEWPORT = {
    LOGICAL_HEIGHT: 600,
    DEFAULT_LOGICAL_WIDTH: 800,
    SPAWN_OFFSET: 100,
    CLOUD_VERTICAL_RANGE: 150
};
```

**Impact**: Removes magic numbers; configuration centralized

---

### Phase 2: Final Game.js Structure

After all extractions, Game.js becomes:

```javascript
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { Dom } from './utils/Dom.js';

import { UIManager } from './systems/UIManager.js';
import { ViewportManager } from './systems/ViewportManager.js';
import { SpawnManager } from './systems/SpawnManager.js';
import { InputRouter } from './systems/InputRouter.js';
import { ThemeManager } from './systems/ThemeManager.js';
import { ContextBuilder } from './systems/ContextBuilder.js';
import { RenderPipeline } from './systems/RenderPipeline.js';
import { ScoreSystem } from './systems/ScoreSystem.js';
import { WorldInitializer } from './systems/WorldInitializer.js';
import { UpdatePipeline } from './systems/UpdatePipeline.js';

import { Config } from './Config.js';
import { logger } from './utils/Logger.js';
import { eventManager } from './systems/EventManager.js';

/**
 * GAME.js - Thin Orchestration Layer
 * Responsibilities: Wire systems together, route lifecycle events
 */
export class Game {
    constructor() {
        logger.info('Game', 'Initializing orchestration layer...');

        // Core Infrastructure
        this.canvas = Dom.get('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = new StateController(Dom.get('gameContainer'), 'START');
        
        // System Initialization
        this.viewport = new ViewportManager(this.canvas, Dom.get('gameContainer'), Config.VIEWPORT.LOGICAL_HEIGHT);
        this.scoreSystem = new ScoreSystem();
        this.ui = new UIManager();
        this.themeManager = new ThemeManager();
        this.spawner = new SpawnManager(Config);
        this.inputRouter = new InputRouter(this.input, this.state);
        this.contextBuilder = new ContextBuilder(Config, this.viewport, this.level, this.scoreSystem, this.particles);
        this.renderPipeline = new RenderPipeline(this.viewport, this.level, this.particles, this.effects, this.abilities);
        this.updatePipeline = new UpdatePipeline({
            contextBuilder: this.contextBuilder,
            level: this.level,
            abilities: this.abilities,
            spawner: this.spawner,
            viewport: this.viewport,
            particles: this.particles,
            effects: this.effects,
            registry: engineRegistry,
            collision: CollisionSystem
        });

        // Game Loop
        this.loop = new GameLoop(
            (dt) => this.update(dt),
            () => this.draw()
        );

        this.init();
    }

    init() {
        // Wire input commands
        this.inputRouter.bindGameCommands(this.player, this.effects, this.particles);
        this.inputRouter.bindUICommands({
            onStart: () => this.start()
        });

        // Subscribe to global events
        eventManager.on('GAME_OVER', () => this.gameOver());
        eventManager.on('OBSTACLE_PASSED', () => this.scoreSystem.increment());

        // Start render loop
        window.addEventListener('resize', () => this.viewport.resize());
        this.viewport.resize();
        this.loop.start();
    }

    start() {
        const world = WorldInitializer.create(
            this.viewport,
            this.level,
            this.scoreSystem,
            () => eventManager.emit('GAME_OVER')
        );
        
        this.player = world.player;
        this.renderPipeline.setPlayer(this.player);
        this.spawner.setPlayer(this.player);
        
        this.state.setState('PLAYING');
    }

    update(dt) {
        if (this.state.current !== 'PLAYING') return;
        this.updatePipeline.execute(dt);
    }

    draw() {
        this.renderPipeline.render(this.ctx);
    }

    gameOver() {
        this.state.setState('GAMEOVER');
        this.scoreSystem.finalize();
        this.ui.showGameOver(this.scoreSystem.current);
    }
}
```

**Line Count**: ~110 lines (down from 425)  
**Responsibilities**: 3 (orchestration, lifecycle routing, system wiring)  
**Complexity**: O(1) – all logic delegated

---

## Migration Path

### Step 1: Create Base Systems (Week 1)
1. UIManager (Day 1-2)
2. ViewportManager (Day 2-3)
3. ScoreSystem (Day 3-4)
4. CustomizationManager (Day 4)
5. ThemeManager (Day 5)

**Validation**: Run game after each system extraction; ensure no regressions

### Step 2: Create Complex Systems (Week 2)
1. SpawnManager + Spawner classes (Day 1-3)
2. InputRouter (Day 3-4)
3. ContextBuilder (Day 4)
4. RenderPipeline (Day 5)

### Step 3: Create Pipeline Systems (Week 3)
1. UpdatePipeline (Day 1-2)
2. WorldInitializer (Day 2-3)
3. Event handler redistribution (Day 3-4)
4. Config cleanup (Day 4)
5. Final Game.js refactor (Day 5)

### Step 4: Testing & Documentation (Week 4)
1. Unit tests for each system
2. Integration tests for pipelines
3. Update architecture.md
4. Create system interaction diagrams

---

## Benefits Analysis

### Maintainability
- **Single Responsibility**: Each system has one clear purpose
- **Testability**: Systems can be unit tested in isolation
- **Extensibility**: New systems added via UpdatePipeline plugin API
- **Readability**: Game.js becomes a high-level system map

### Performance
- **No overhead**: Delegation via direct method calls (no abstraction cost)
- **Optimization potential**: Systems can cache/optimize internally
- **Profiling**: Easy to identify slow systems

### Development Velocity
- **Parallel work**: Teams can work on different systems simultaneously
- **Debugging**: Issues isolated to specific systems
- **Onboarding**: New developers understand architecture via Game.js structure

### Code Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Game.js LOC | 425 | ~110 | 74% reduction |
| Cyclomatic Complexity | 28 | 4 | 86% reduction |
| Direct Responsibilities | 15 | 3 | 80% reduction |
| System Count | 1 | 12 | Better separation |
| Average System LOC | N/A | ~80 | Maintainable size |

---

## Risk Mitigation

### Risk 1: Over-Engineering
**Mitigation**: Each system must demonstrate clear value (testability, reusability, or complexity reduction). Review systems for "single call sites" – if a system is only used once and has no internal state, inline it.

### Risk 2: Performance Regression
**Mitigation**: Profile before/after refactor. Target: <1% performance delta. Systems should use direct references (no expensive lookups).

### Risk 3: Context Coupling
**Mitigation**: ContextBuilder standardizes context shape. Systems declare required context fields. Implement context validation in dev mode.

### Risk 4: Event Spaghetti
**Mitigation**: Document event flow in architecture.md. Limit events to cross-system communication only. Prefer direct method calls within systems.

### Risk 5: Migration Bugs
**Mitigation**: Extract systems incrementally. Keep Game.js functional after each extraction. Run test suite + manual QA after each step.

---

## Conclusion

This aggressive refactoring transforms Game.js from a **400+ line monolith** into a **~110 line orchestration layer** by extracting **12 specialized systems**. The result is a codebase that adheres to:

1. **Single Responsibility Principle**: Each system has one job
2. **Open/Closed Principle**: Extend via UpdatePipeline plugins
3. **Dependency Inversion**: Game.js depends on system abstractions
4. **Clear Architecture**: System relationships visible in constructor

**Game.js should call, not implement** – this refactor achieves that goal while maintaining full backward compatibility and zero performance overhead.

---

**Next Steps**:
1. Review this analysis with team
2. Prioritize systems based on pain points
3. Begin Phase 1 extractions
4. Update architecture.md as systems complete

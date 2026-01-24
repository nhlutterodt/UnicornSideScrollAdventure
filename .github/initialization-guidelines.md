# Initialization & Load Order Guidelines

## Critical Principles

### 1. **Async-First Configuration Loading**
**RULE**: All external configuration MUST be loaded before Game instantiation.

```javascript
// ✅ CORRECT - main.js pattern
async function init() {
    await Config.loadExternalConfig(); // Load first
    window.game = new Game();          // Then instantiate
}
```

```javascript
// ❌ WRONG
const game = new Game();
await Config.loadExternalConfig(); // Too late!
```

**Why**: Config contains critical constants (GRAVITY, JUMP_FORCE, stages, items) needed during Game construction.

---

### 2. **DOM-Ready Before Initialization**
**RULE**: Never instantiate Game before DOMContentLoaded.

```javascript
// ✅ CORRECT
document.addEventListener('DOMContentLoaded', () => {
    init().catch(handleError);
});
```

```javascript
// ❌ WRONG
init(); // DOM might not exist yet
document.addEventListener('DOMContentLoaded', ...);
```

**Why**: Game constructor queries DOM elements (canvas, container). If DOM isn't ready, elements will be null.

---

### 3. **Event Handler Registration After DOM Queries**
**RULE**: Register event handlers AFTER verifying elements exist.

```javascript
// ✅ CORRECT - Game.js init() method
init() {
    const buttons = Dom.all('.js-start-btn');
    if (buttons.length === 0) {
        logger.warn('Game', 'No start buttons found in DOM');
        return;
    }
    buttons.forEach(btn => btn.addEventListener('click', () => this.start()));
}
```

```javascript
// ❌ WRONG
init() {
    Dom.all('.js-start-btn').forEach(btn => 
        btn.addEventListener('click', () => this.start())
    ); // Silent failure if no buttons
}
```

**Why**: `querySelectorAll` returns empty NodeList if elements don't exist. Silent failures are hard to debug.

---

### 4. **Game Loop Start vs Game State**
**RULE**: Game loop can run continuously, but game logic gated by state.

```javascript
// ✅ CORRECT - Game.js pattern
init() {
    // Setup complete, start render loop
    this.loop.start();
}

update(dt) {
    if (this.state.current !== 'PLAYING') return; // Gate logic by state
    // ... game update logic
}
```

**Why**: Loop runs at 60 FPS but only updates entities when PLAYING. This allows render to work in menus.

---

### 5. **Initialization Order in Game Constructor**
**RULE**: Follow this exact order to prevent dependency issues.

```javascript
constructor() {
    // 1. DOM Elements (fail fast if missing)
    this.canvas = Dom.get('gameCanvas');
    if (!this.canvas) throw new Error('Canvas not found');
    
    // 2. Core Systems (no dependencies)
    this.state = new StateController(container, 'START');
    this.loop = new GameLoop(...);
    
    // 3. Game Systems (depend on core)
    this.particles = new ParticleSystem();
    this.scoreManager = new ScoreManager();
    
    // 4. Entity Factories (depend on systems)
    this.playerFactory = new PlayerFactory();
    
    // 5. Setup & Binding
    this.setupEvents();
    
    // 6. Initial State
    this.resetInternalState();
    
    // 7. DOM Event Listeners
    this.init();
}
```

---

### 6. **Error Boundaries at Each Layer**
**RULE**: Wrap async operations and constructors with error handling.

```javascript
// ✅ CORRECT - main.js
init().catch(error => {
    ErrorHandler.handle('main', `Initialization failed: ${error.message}`, true);
    document.body.innerHTML = '<div>Failed to load game. Please refresh.</div>';
});
```

```javascript
// ✅ CORRECT - Game.js constructor
constructor() {
    try {
        logger.info('Game', 'Initializing...');
        // ... initialization
    } catch (error) {
        ErrorHandler.handle('Game', 'Constructor failed', true);
        throw error; // Re-throw to propagate to main.js
    }
}
```

---

### 7. **Player Binding After State Reset**
**RULE**: Player instance must exist before binding input handlers.

```javascript
// ✅ CORRECT - Game.js resetInternalState()
resetInternalState() {
    this.player = this.playerFactory.create(() => this.gameOver());
    this.ui.setPlayer(this.player); // UI needs player reference
    this.inputHandler.bindGameCommands(this.player, ...); // Bind input
}

start() {
    this.resetInternalState(); // Creates player first
    this.state.setState('PLAYING'); // Then starts game
}
```

```javascript
// ❌ WRONG
start() {
    this.state.setState('PLAYING'); // Game running
    this.resetInternalState(); // Player created AFTER state change
}
```

**Why**: InputHandler needs player reference. If state changes before player exists, first frame will error.

---

### 8. **Viewport Resize Coordination**
**RULE**: Call resize() AFTER viewport initialization but BEFORE loop start.

```javascript
// ✅ CORRECT
init() {
    this.setupEventListeners();
    window.addEventListener('resize', () => this.resize());
    this.resize(); // Initial sizing
    this.loop.start(); // Start after sizing
}
```

**Why**: Canvas dimensions must be correct before first draw call.

---

## Common Initialization Bugs & Fixes

### Bug: "Start button doesn't work"
**Symptom**: Clicking "Start Adventure" does nothing.

**Diagnosis Checklist**:
1. ✅ Check `Dom.all('.js-start-btn')` returns elements
2. ✅ Check `this.start` method exists
3. ✅ Check `this.state.setState('PLAYING')` executes
4. ✅ Check `this.state.current !== 'PLAYING'` isn't blocking update
5. ✅ Check event listener registered AFTER DOMContentLoaded

**Fix**:
```javascript
// Add logging to trace execution
init() {
    const buttons = Dom.all('.js-start-btn');
    logger.info('Game', `Found ${buttons.length} start buttons`);
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            logger.info('Game', 'Start button clicked');
            this.start();
        });
    });
}

start() {
    logger.info('Game', 'Starting game...');
    this.resetInternalState();
    this.state.setState('PLAYING');
    logger.info('Game', `State changed to: ${this.state.current}`);
}
```

---

### Bug: "Cannot read property 'x' of undefined"
**Symptom**: Error on first frame after start.

**Cause**: Player not created before update loop.

**Fix**: Ensure `resetInternalState()` called in `start()`:
```javascript
start() {
    this.resetInternalState(); // Creates this.player
    this.state.setState('PLAYING');
}
```

---

### Bug: "Config values are undefined"
**Symptom**: `Config.GRAVITY` is undefined during game.

**Cause**: Config not loaded before Game construction.

**Fix**: Ensure await in main.js:
```javascript
async function init() {
    await Config.loadExternalConfig(); // MUST await
    window.game = new Game();
}
```

---

### Bug: "Canvas is blank/black"
**Symptom**: Game starts but nothing renders.

**Diagnosis**:
1. Check canvas dimensions: `console.log(canvas.width, canvas.height)`
2. Check state: `console.log(game.state.current)` (should be 'PLAYING')
3. Check entities exist: `console.log(engineRegistry.entities.size)`
4. Check draw is called: Add `console.log('draw')` in draw()

**Common Causes**:
- Viewport not initialized (width/height = 0)
- State stuck in 'START' (update gated out)
- Player not created (no entities to render)
- CSS hiding canvas (`display: none` prevents rendering)

---

## Validation Checklist

Before committing initialization changes:

### Pre-Flight Checks
- [ ] Config loaded before Game instantiation (`await Config.loadExternalConfig()`)
- [ ] DOMContentLoaded event wraps init()
- [ ] All DOM elements null-checked with warnings
- [ ] Error boundaries wrap async operations
- [ ] Logger statements added for debugging

### Constructor Order
- [ ] DOM elements queried first
- [ ] Core systems initialized second
- [ ] Game systems initialized third
- [ ] Event handlers registered last
- [ ] `init()` called at end of constructor

### Start Flow
- [ ] `start()` calls `resetInternalState()` first
- [ ] `resetInternalState()` creates player
- [ ] Input handlers bound AFTER player creation
- [ ] State changes to 'PLAYING' last

### Runtime Checks
- [ ] Click "Start Adventure" → state changes to 'PLAYING'
- [ ] Player visible and animating
- [ ] Obstacles spawning
- [ ] Score incrementing
- [ ] No console errors

---

## Emergency Debugging Commands

Add these to browser console when debugging initialization:

```javascript
// Check DOM elements
document.querySelectorAll('.js-start-btn').length // Should be 2

// Check game instance
window.game // Should be Game instance

// Check config loaded
Config.GRAVITY // Should be 1500

// Check state
game.state.current // Should be 'START' initially

// Check player exists
game.player // Should be Player instance after start()

// Force start (bypass button)
game.start()

// Check entities
engineRegistry.entities.size // Should be >0 when playing

// Check loop running
game.loop.isRunning // Should be true
```

---

## Load Order Diagram

```
Browser Load
    ↓
Parse HTML
    ↓
Load CSS
    ↓
Parse <script type="module" src="main.js">
    ↓
DOMContentLoaded event fires
    ↓
main.js: init() called
    ↓
Config.loadExternalConfig() - ASYNC
    ├─ Fetch stages.json
    ├─ Fetch items.json
    └─ Fetch abilities.json
    ↓
new Game() - SYNC
    ├─ Query DOM elements
    ├─ Initialize systems
    ├─ Setup event listeners
    ├─ Register button handlers
    ├─ Call resize()
    └─ Start game loop (paused state)
    ↓
User clicks "Start Adventure"
    ↓
game.start() called
    ├─ resetInternalState()
    │   ├─ Clear registry
    │   ├─ Create player
    │   └─ Bind input
    └─ setState('PLAYING')
    ↓
Game loop updates (state gate opens)
    ↓
Game renders at 60 FPS
```

---

## File Checklist

When modifying initialization, check these files in order:

1. **index.html**: Ensure `<script type="module" src="./js/main.js">` at bottom of body
2. **main.js**: Ensure `await Config.loadExternalConfig()` before `new Game()`
3. **Game.js**: Ensure constructor order matches guideline #5
4. **Config.js**: Ensure `loadExternalConfig()` is async and returns Promise
5. **StateController.js**: Ensure state transitions work correctly

---

## Version History

- **v1.0** (2026-01-23): Initial guidelines based on "Start button not working" bug investigation

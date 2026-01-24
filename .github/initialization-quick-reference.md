# Game Initialization Quick Reference Card

## 🚨 BEFORE MODIFYING INITIALIZATION CODE

**Read**: `.github/initialization-guidelines.md` (comprehensive guide)

---

## 📋 The 5 Commandments

1. **Config First** - Always `await Config.loadExternalConfig()` before `new Game()`
2. **DOM Ready** - Only initialize in `DOMContentLoaded` event
3. **Validate Everything** - Check all DOM elements exist with clear errors
4. **Log Everything** - Use `logger.info()` to trace execution flow
5. **Error Boundaries** - Wrap constructors in try-catch, propagate errors

---

## ✅ Correct Initialization Pattern

```javascript
// main.js
async function init() {
    await Config.loadExternalConfig(); // ← Load first
    window.game = new Game();          // ← Then create
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => ErrorHandler.handle('main', error, true));
});
```

```javascript
// Game.js constructor
constructor() {
    try {
        logger.info('Game', 'Initializing...');
        
        // 1. Validate DOM
        this.canvas = Dom.get('gameCanvas');
        if (!this.canvas) throw new Error('Canvas not found');
        
        // 2. Initialize systems (order matters!)
        this.state = new StateController(...);
        this.loop = new GameLoop(...);
        this.particles = new ParticleSystem();
        
        // 3. Setup events
        this.setupEvents();
        
        // 4. Bind DOM handlers
        this.init();
        
        logger.info('Game', '✓ Ready');
    } catch (error) {
        logger.error('Game', 'Init failed', error);
        throw error; // Propagate!
    }
}
```

---

## 🐛 Debug Checklist

**Game won't start? Check these in order:**

### 1. Browser Console
```javascript
// Look for these logs:
[Game] Initializing game engine...
[Game] Registering 2 start button(s)
[Game] ✓ Game engine initialized successfully
```

### 2. Run Diagnostic Tool
```javascript
// Copy/paste scripts/init-diagnostics.js into console
// Check for failed tests
```

### 3. Manual Verification
```javascript
// Check game exists
typeof window.game !== 'undefined'  // → true

// Check state
game.state.current  // → 'START'

// Force start
game.start()  // → Should change state to 'PLAYING'

// Check player
game.player  // → Player instance

// Check entities
engineRegistry.entities.size  // → >0
```

### 4. DOM Element Check
```javascript
document.querySelectorAll('.js-start-btn').length  // → 2
document.getElementById('gameCanvas')  // → canvas element
document.getElementById('gameContainer')  // → main element
```

---

## ❌ Common Mistakes

### ❌ Creating Game Before Config Loaded
```javascript
// WRONG
const game = new Game();
await Config.loadExternalConfig();
```
**Fix**: Await config first

### ❌ Not Checking DOM Elements
```javascript
// WRONG
this.canvas = Dom.get('gameCanvas');
this.ctx = this.canvas.getContext('2d'); // Crashes if null!
```
**Fix**: Validate before use
```javascript
this.canvas = Dom.get('gameCanvas');
if (!this.canvas) throw new Error('Canvas not found');
```

### ❌ Silent Event Handler Failures
```javascript
// WRONG
Dom.all('.js-start-btn').forEach(btn => ...); // No warning if empty
```
**Fix**: Validate count
```javascript
const buttons = Dom.all('.js-start-btn');
if (buttons.length === 0) logger.warn('Game', 'No buttons found');
```

### ❌ Missing Error Boundaries
```javascript
// WRONG
constructor() {
    // Complex initialization
}
```
**Fix**: Wrap in try-catch
```javascript
constructor() {
    try {
        // Complex initialization
    } catch (error) {
        logger.error('Game', 'Init failed', error);
        throw error;
    }
}
```

---

## 🎯 Constructor Order (MEMORIZE THIS!)

```javascript
constructor() {
    // 1. DOM Elements (fail fast)
    this.canvas = Dom.get('gameCanvas');
    if (!this.canvas) throw new Error('Canvas not found');
    
    // 2. Core Systems (no dependencies)
    this.state = new StateController(...);
    this.loop = new GameLoop(...);
    
    // 3. Game Systems (depend on core)
    this.particles = new ParticleSystem();
    this.scoreManager = new ScoreManager();
    
    // 4. Factories (depend on systems)
    this.playerFactory = new PlayerFactory();
    
    // 5. Event Setup
    this.setupEvents();
    
    // 6. Reset State (creates player)
    this.resetInternalState();
    
    // 7. DOM Handlers (after everything ready)
    this.init();
}
```

---

## 🔧 Emergency Commands

Paste into browser console when debugging:

```javascript
// Reload config
await Config.loadExternalConfig();

// Force start game
game.start();

// Check state
console.log('State:', game.state.current);

// List entities
Array.from(engineRegistry.entities.values());

// Check player
console.log('Player:', game.player);

// Clear and restart
engineRegistry.clear();
game.resetInternalState();
game.start();
```

---

## 📁 Related Files

- **Guidelines**: `.github/initialization-guidelines.md`
- **Fix Summary**: `.github/initialization-fix-summary.md`
- **Diagnostic Tool**: `scripts/init-diagnostics.js`
- **Main Entry**: `js/main.js`
- **Game Class**: `js/Game.js`

---

## 🎓 Learn More

- Architecture: `docs/architecture.md`
- Coding Standards: `docs/coding_standards.md`
- Quality Protocol: `docs/ai_quality_protocol.md`

---

**Last Updated**: January 23, 2026  
**Print this card and keep it visible while coding!**

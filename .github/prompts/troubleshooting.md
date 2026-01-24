# Common Pitfalls & Quick Fixes

Solutions to frequent issues encountered during development.

## Entity Issues

### Entity Not Rendering

**Symptoms**: Entity created but not visible on screen.

**Checklist**:
1. ✅ Entity extends `Entity` base class
2. ✅ `super()` called in constructor
3. ✅ `draw(ctx)` method implemented
4. ✅ Entity not immediately `isOffscreen`
5. ✅ Entity registered in `gameEntities` (check console: `gameEntities.has('entity-id')`)
6. ✅ Canvas context exists (check `ctx` is not null)

**Common Causes**:
```javascript
// ❌ Forgot to call super()
constructor(x, y) {
    this.x = x; // Entity never registers!
}

// ✅ Correct
constructor(x, y) {
    super(x, y, 50, 50, 'my-entity');
}
```

```javascript
// ❌ Draw method doesn't actually draw
draw(ctx) {
    // Empty or missing fillRect/fillText/etc.
}

// ✅ Correct
draw(ctx) {
    ctx.fillStyle = '#ff6ec7';
    ctx.fillRect(this.x, this.y, this.width, this.height);
}
```

**Quick Fix**:
```javascript
// Enable debug mode to see hitboxes
// In Config.js
DEBUG: true

// Check entity is registered
console.log('Entity registered:', gameEntities.has('my-entity_1'));
```

---

### Collision Not Detected

**Symptoms**: Entities overlap but `onCollision` never fires.

**Checklist**:
1. ✅ `collisionLayer` set correctly
2. ✅ `collisionMask` set correctly
3. ✅ Layers are bitwise compatible
4. ✅ `onCollision(other, particles, context)` has 3 parameters
5. ✅ `collisionPadding` not too large

**Common Causes**:
```javascript
// ❌ Forgot to set collision properties
constructor(x, y) {
    super(x, y, 50, 50, 'obstacle');
    // Missing: this.collisionLayer = ...
}

// ✅ Correct
constructor(x, y) {
    super(x, y, 50, 50, 'obstacle');
    this.collisionLayer = CollisionLayers.OBSTACLE;
    this.collisionMask = CollisionLayers.PLAYER;
}
```

```javascript
// ❌ Layers not compatible
// Player:
this.collisionMask = CollisionLayers.PLATFORM; // Doesn't include OBSTACLE!

// Obstacle:
this.collisionLayer = CollisionLayers.OBSTACLE;

// Result: No collision detected

// ✅ Correct
// Player:
this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM;
```

**Quick Fix**:
```javascript
// Test collision compatibility in console
const player = engineRegistry.getByType('player')[0];
const obstacle = engineRegistry.getByType('obstacle')[0];

const canCollide = (player.collisionMask & obstacle.collisionLayer) !== 0 ||
                   (obstacle.collisionMask & player.collisionLayer) !== 0;

console.log('Can collide:', canCollide);
console.log('Player mask:', player.collisionMask, 'Obstacle layer:', obstacle.collisionLayer);
```

---

### Entity Immediately Disappears

**Symptoms**: Entity spawns but vanishes next frame.

**Cause**: `isOffscreen` returns `true` immediately, triggering auto-pruning.

**Common Causes**:
```javascript
// ❌ Spawned offscreen
new Obstacle(-100, y); // Negative X triggers offscreen check

// ❌ Wrong offscreen logic
get isOffscreen() {
    return this.x < 0; // Player at x=80 would never be offscreen!
}

// ✅ Correct
get isOffscreen() {
    return this.x + this.width < 0; // Only when fully left of screen
}
```

**Quick Fix**:
```javascript
// Log entity position before it disappears
constructor(x, y) {
    super(x, y, 50, 50, 'my-entity');
    console.log('Spawned at:', x, y, 'isOffscreen:', this.isOffscreen);
}
```

---

## Configuration Issues

### JSON Changes Not Applying

**Symptoms**: Edit `stages.json` but game uses old values.

**Solutions**:
1. **Hard refresh**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Check console**: Look for JSON parse errors
3. **Check Network tab**: Verify file not cached (status should be 200, not 304)
4. **Validate JSON**: Copy/paste into [jsonlint.com](https://jsonlint.com)
5. **Check fallback**: `console.log(Config.STAGES === Config.FALLBACK_STAGES)`

**Common Causes**:
```json
// ❌ Trailing comma (invalid JSON)
{
  "levelStart": 1,
  "name": "Morning Meadow",
}

// ✅ Correct
{
  "levelStart": 1,
  "name": "Morning Meadow"
}
```

**Quick Fix**:
```javascript
// Force reload config
Config.loadStages().then(() => {
    console.log('Stages reloaded:', Config.STAGES);
});
```

---

### Config Values Ignored

**Symptoms**: Set `gravityMultiplier: 0.5` but gravity feels normal.

**Cause**: Stage not active or modifiers not applied.

**Check**:
```javascript
// In console
console.log('Current stage:', game.level.currentStage);
console.log('Stage modifiers:', game.level.currentStage.modifiers);
console.log('Player physics:', game.player.physicsMod);
```

**Common Causes**:
```javascript
// ❌ Stage never activated (levelStart too high)
{
  "levelStart": 100, // Game ends before reaching this
  "modifiers": { "gravityMultiplier": 0.5 }
}

// ❌ Typo in modifier name
{
  "modifiers": {
    "gravityMultiplyer": 0.5 // Wrong: "Multiplyer" not "Multiplier"
  }
}
```

---

## Performance Issues

### Game Stuttering / Dropped Frames

**Symptoms**: Visible lag, janky movement, FPS drops below 60.

**Diagnose**:
1. Open Chrome DevTools → Performance tab
2. Record for 10 seconds
3. Look for:
   - **Purple GC bars**: Too much garbage collection
   - **Long yellow bars**: Expensive JavaScript
   - **Red triangles**: Frame drops

**Common Causes**:

```javascript
// ❌ Allocating in update loop
update(dt) {
    const enemies = this.getAllEnemies(); // New array every frame!
    const temp = { x: 0, y: 0 };          // New object every frame!
}

// ✅ Fix: Pre-allocate
constructor() {
    this._enemyCache = [];
    this._temp = { x: 0, y: 0 };
}

update(dt) {
    const enemies = this._enemyCache;
    this._temp.x = 0;
    this._temp.y = 0;
}
```

```javascript
// ❌ Expensive operation in draw()
draw(ctx) {
    const sorted = entities.sort((a, b) => a.y - b.y); // Sorts 60x/sec!
}

// ✅ Fix: Sort in update()
update(dt) {
    this._sortedEntities = entities.slice().sort((a, b) => a.y - b.y);
}

draw(ctx) {
    this._sortedEntities.forEach(e => e.draw(ctx));
}
```

**Quick Fix**:
```javascript
// Check FPS in console
setInterval(() => {
    console.log('FPS:', Math.round(1 / game.loop.deltaTime));
}, 1000);

// Check entity count
console.log('Entities:', gameEntities.size);

// Check particle count
console.log('Particles:', game.particles.activeCount);
```

---

### Too Many Particles

**Symptoms**: Particle effects cause frame drops.

**Solution**:
```javascript
// ❌ Emitting every frame without throttling
update(dt) {
    particles.emit(this.x, this.y, { count: 10 }); // 600 particles/sec!
}

// ✅ Throttle emission
update(dt) {
    if (Math.random() < 0.2) { // Only 20% of frames = 120 particles/sec
        particles.emit(this.x, this.y, { count: 10 });
    }
}
```

**Quick Fix**:
```javascript
// Check particle count
console.log('Active particles:', game.particles.activeCount);

// Reduce particle count temporarily
Config.PARTICLE_SCALE = 0.3; // 30% of normal
```

---

## Input Issues

### Jump Not Working

**Symptoms**: Pressing space/clicking doesn't make player jump.

**Checklist**:
1. ✅ `InputManager` bound to canvas
2. ✅ `GameInputHandler` connected to player
3. ✅ Player is grounded (`player.isGrounded === true`)
4. ✅ Event listeners not removed

**Common Causes**:
```javascript
// ❌ Player never becomes grounded
update(dt, context) {
    this.y += this.vy * dt;
    // Missing: if (this.y >= groundY) this.isGrounded = true;
}

// ❌ Double event binding
init() {
    canvas.addEventListener('click', this.jump.bind(this));
    canvas.addEventListener('click', this.jump.bind(this)); // Duplicate!
}
```

**Quick Fix**:
```javascript
// Check input state in console
console.log('Player grounded:', game.player.isGrounded);
console.log('Input active:', game.input);

// Manually trigger jump
game.player.jump(game.particles, game.effects);
```

---

### Click/Touch Not Detected

**Symptoms**: Mouse clicks or touches ignored.

**Common Causes**:
```javascript
// ❌ Event listener on wrong element
document.addEventListener('click', handleClick); // Whole page
// Should be:
canvas.addEventListener('click', handleClick); // Just canvas

// ❌ Element overlapping canvas
<div style="position: absolute; z-index: 999;">
    <!-- Blocks canvas clicks! -->
</div>

// ✅ Fix: Use pointer-events
<div style="pointer-events: none;">
```

**Quick Fix**:
```javascript
// Test if canvas receives clicks
canvas.addEventListener('click', () => {
    console.log('Canvas clicked!');
});
```

---

## UI Issues

### Lives/Score Not Updating

**Symptoms**: Player gains life but UI shows old value.

**Cause**: UIManager not listening to events or DOM element missing.

**Check**:
```javascript
// 1. Check DOM element exists
const livesEl = document.getElementById('lives');
console.log('Lives element:', livesEl);

// 2. Check event emitted
eventManager.on('LIFE_CHANGED', (data) => {
    console.log('Life changed event:', data);
});

// 3. Manually update
game.ui.updateLives();
```

**Common Causes**:
```javascript
// ❌ Element ID mismatch
// HTML:
<div id="player-lives"></div>
// JS:
const livesEl = Dom.get('lives'); // Wrong ID!

// ❌ Event listener never registered
constructor() {
    // Missing: eventManager.on('LIFE_CHANGED', ...);
}
```

---

## Build/Test Issues

### `npm test` Fails

**Symptoms**: Standard checker reports violations.

**Common Violations**:

```html
<!-- ❌ Inline style -->
<div style="color: red;">Text</div>

<!-- ✅ Fix: Use class -->
<div class="error-text">Text</div>
```

```html
<!-- ❌ Inline event handler -->
<button onclick="doSomething()">Click</button>

<!-- ✅ Fix: External listener -->
<button id="myBtn">Click</button>
<script>
    Dom.get('myBtn').addEventListener('click', doSomething);
</script>
```

```javascript
// ❌ Raw localStorage
localStorage.setItem('score', 100);

// ✅ Fix: Use Storage system
Storage.save('score', 100);
```

```javascript
// ❌ Direct console.log
console.log('Debug info');

// ✅ Fix: Use Logger
logger.debug('MySystem', 'Debug info');
```

**Quick Fix**:
```bash
# Run tests to see violations
npm test

# Check specific file
node scripts/standard-checker.js js/MyFile.js
```

---

## Browser Compatibility

### Safari/iOS Issues

**Symptoms**: Game works in Chrome but not Safari.

**Common Causes**:

```css
/* ❌ Missing webkit prefix */
backdrop-filter: blur(10px);

/* ✅ Fix: Add -webkit- prefix */
-webkit-backdrop-filter: blur(10px);
backdrop-filter: blur(10px);
```

```javascript
// ❌ Event not supported on iOS
canvas.addEventListener('click', handleClick);

// ✅ Fix: Use touchstart for mobile
if ('ontouchstart' in window) {
    canvas.addEventListener('touchstart', handleClick);
} else {
    canvas.addEventListener('click', handleClick);
}
```

---

## Quick Diagnostic Commands

Paste these in browser console when debugging:

```javascript
// Entity audit
console.log('Total entities:', gameEntities.size);
console.log('By type:', 
    Array.from(gameEntities.values()).reduce((acc, e) => {
        acc[e.entityType] = (acc[e.entityType] || 0) + 1;
        return acc;
    }, {})
);

// Performance check
console.log('FPS:', Math.round(1 / game.loop.deltaTime));
console.log('Particles:', game.particles.activeCount);

// Player state
console.log('Player:', {
    x: game.player.x,
    y: game.player.y,
    lives: game.player.lives,
    grounded: game.player.isGrounded,
    invincible: game.player.invincibleTimer > 0
});

// Config check
console.log('Using fallback stages:', Config.STAGES === Config.FALLBACK_STAGES);
console.log('Current stage:', game.level.currentStage);

// Event trace
let eventCount = 0;
eventManager.on('*', (name) => {
    console.log(`Event ${++eventCount}: ${name}`);
});
```

---

## Getting Unstuck

When completely stuck:

1. **Enable debug mode**: Set `Config.DEBUG = true`
2. **Check console**: Look for errors (F12)
3. **Verify basics**: Entity registered? Draw method exists? Canvas context valid?
4. **Isolate issue**: Comment out code until problem disappears
5. **Compare working code**: Look at similar entity (e.g., `Obstacle.js`)
6. **Ask specific questions**: "Why doesn't X happen?" not "Why is it broken?"

**Nuclear Option** - Reset to known good state:
```javascript
// Reload page
location.reload();

// Clear localStorage
localStorage.clear();

// Reset config to fallback
Config.STAGES = Config.FALLBACK_STAGES;
```

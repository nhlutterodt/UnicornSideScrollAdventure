# Debugging Game Code

Game debugging requires different techniques than web app debugging due to real-time rendering, entity lifecycles, and performance constraints.

## Visual Debugging (Most Powerful)

Enable debug mode in [js/Config.js](../../js/Config.js):
```javascript
DEBUG: true
```

### Debug Visualization in Entities

Add to any entity's `draw()` method:

```javascript
draw(ctx) {
    // Normal rendering...
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Debug overlay
    if (window.Config?.DEBUG) {
        this.drawDebug(ctx);
    }
}

drawDebug(ctx) {
    // Save transform state
    const currentTransform = ctx.getTransform();
    
    // Reset to identity for debug overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // 1. Draw hitbox (actual collision bounds)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // 2. Draw collision bounds with padding
    if (this.collisionPadding > 0) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.x + this.collisionPadding,
            this.y + this.collisionPadding,
            this.width - this.collisionPadding * 2,
            this.height - this.collisionPadding * 2
        );
    }
    
    // 3. Draw velocity vector
    if (this.vx || this.vy) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const scale = 0.1; // Scale down velocity for visualization
        
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + this.vx * scale, centerY + this.vy * scale);
        ctx.stroke();
        
        // Arrow head
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.arc(centerX + this.vx * scale, centerY + this.vy * scale, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 4. Entity info text
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = '10px monospace';
    
    const info = `${this.id} (${this.state || 'no-state'})`;
    const textX = this.x;
    const textY = this.y - 5;
    
    ctx.strokeText(info, textX, textY);
    ctx.fillText(info, textX, textY);
    
    // 5. Show collision layer info
    if (this.collisionLayer) {
        const layerInfo = `L:${this.collisionLayer} M:${this.collisionMask}`;
        ctx.strokeText(layerInfo, textX, textY - 12);
        ctx.fillText(layerInfo, textX, textY - 12);
    }
    
    // Restore transform
    ctx.setTransform(currentTransform);
}
```

### Debug HUD Overlay

Add to [js/Game.js](../../js/Game.js) draw method:

```javascript
draw() {
    // ... normal rendering ...
    
    if (Config.DEBUG) {
        this.drawDebugHUD();
    }
}

drawDebugHUD() {
    const ctx = this.ctx;
    ctx.save();
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 250, 150);
    
    // Debug text
    ctx.fillStyle = 'lime';
    ctx.font = '12px monospace';
    
    const stats = [
        `FPS: ${Math.round(1 / this.loop.deltaTime)}`,
        `Entities: ${engineRegistry.entities.size}`,
        `Particles: ${this.particles.activeCount}`,
        `Game Speed: ${this.gameSpeed.toFixed(0)}`,
        `Level: ${this.level.currentLevel}`,
        `Score: ${this.scoreManager.getScore()}`,
        `Player Y: ${this.player.y.toFixed(0)}`,
        `Player Grounded: ${this.player.isGrounded}`
    ];
    
    stats.forEach((stat, i) => {
        ctx.fillText(stat, 20, 30 + i * 15);
    });
    
    ctx.restore();
}
```

## Console Debugging

### Registry Inspection

Open browser console (F12) and use these commands:

```javascript
// See all registered entities (Map)
gameEntities

// Get entities as array
Array.from(gameEntities.values())

// Filter by type
Array.from(gameEntities.values()).filter(e => e.entityType === 'obstacle')

// Count by type
Array.from(gameEntities.values()).reduce((acc, e) => {
    acc[e.entityType] = (acc[e.entityType] || 0) + 1;
    return acc;
}, {})

// Find specific entity
engineRegistry.getByType('player')

// Get entity by ID
gameEntities.get('obstacle_5')
```

### Event Tracing

Temporarily add to [js/systems/EventManager.js](../../js/systems/EventManager.js):

```javascript
emit(eventName, data) {
    if (Config.DEBUG) {
        logger.debug('EventManager', `📢 ${eventName}`, data);
    }
    // ... rest of emit logic
}
```

Or listen to all events:

```javascript
// In browser console
eventManager.on('*', (eventName, data) => {
    console.log(`Event: ${eventName}`, data);
});
```

### Breakpoint Debugging

Set conditional breakpoints in Chrome DevTools:

```javascript
// In entity update(), right-click line number → "Add conditional breakpoint"
this.y > 500  // Breaks only when Y position exceeds 500

// Or add debugger statement
update(dt, context) {
    if (this.lives <= 0 && !this.dying) {
        debugger; // Pauses execution here
    }
}
```

## Performance Debugging

### Chrome DevTools Performance Tab

1. Open DevTools (F12) → Performance tab
2. Click Record (⭕)
3. Play game for 10 seconds
4. Stop recording
5. Analyze:
   - **Yellow bars**: JavaScript execution (should be <16ms)
   - **Purple bars**: Garbage collection (minimize!)
   - **Green bars**: Rendering (should be <2ms)

### Frame Time Tracking

Add to [js/core/GameLoop.js](../../js/core/GameLoop.js):

```javascript
loop(currentTime) {
    const frameStart = performance.now();
    
    // ... update and draw logic ...
    
    const frameEnd = performance.now();
    const frameTime = frameEnd - frameStart;
    
    if (Config.DEBUG && frameTime > 16) {
        logger.warn('GameLoop', `Slow frame: ${frameTime.toFixed(2)}ms`);
    }
    
    this.requestId = requestAnimationFrame(this.loop.bind(this));
}
```

### Memory Leak Detection

Watch memory growth in DevTools:

1. Memory tab → Take heap snapshot
2. Play game for 1 minute
3. Take another heap snapshot
4. Compare snapshots
5. Look for:
   - Growing entity arrays
   - Event listeners not removed
   - Particles not recycled

## Collision Debugging

### Visualize Collision Layers

Add to entity debug visualization:

```javascript
drawDebug(ctx) {
    // ... other debug drawing ...
    
    // Show collision layer as colored border
    const layerColors = {
        1: 'red',      // PLAYER
        2: 'orange',   // OBSTACLE
        4: 'green',    // PLATFORM
        8: 'blue',     // PARTICLE
        16: 'yellow'   // ITEM
    };
    
    ctx.strokeStyle = layerColors[this.collisionLayer] || 'white';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
}
```

### Log Collision Events

```javascript
onCollision(other, particles, context) {
    if (Config.DEBUG) {
        logger.debug(this.entityType, `Collided with ${other.entityType} at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
    }
    // ... collision logic
}
```

### Test Collision Masks

In browser console:

```javascript
// Get player
const player = engineRegistry.getByType('player')[0];

// Check collision compatibility with layer
const canCollideWithObstacles = (player.collisionMask & CollisionLayers.OBSTACLE) !== 0;
console.log('Player collides with obstacles:', canCollideWithObstacles);
```

## Common Issues & Solutions

### Issue: Entity Not Rendering

**Checklist**:
```javascript
// 1. Check entity is registered
console.log(gameEntities.has('my-entity-id'));

// 2. Check draw() is called
draw(ctx) {
    console.log('Drawing', this.id); // Should appear 60x/sec
}

// 3. Check entity not immediately offscreen
console.log('isOffscreen:', entity.isOffscreen);

// 4. Check z-order (draw order)
// Entities drawn in registration order - later = on top
```

### Issue: Collision Not Detected

**Checklist**:
```javascript
// 1. Check collision layers are set
console.log('Layer:', entity.collisionLayer);
console.log('Mask:', entity.collisionMask);

// 2. Check layers are compatible
const a = player;
const b = obstacle;
const compatible = (a.collisionMask & b.collisionLayer) !== 0 || 
                   (b.collisionMask & a.collisionLayer) !== 0;
console.log('Can collide:', compatible);

// 3. Check collision padding not too large
console.log('Padding:', entity.collisionPadding);

// 4. Verify onCollision signature
onCollision(other, particles, context) { // Must have 3 params
    // ...
}
```

### Issue: Performance Stuttering

**Checklist**:
```javascript
// 1. Check particle count
console.log('Particles:', particles.activeCount); // Should be <500

// 2. Check entity count
console.log('Entities:', gameEntities.size); // Should be <100

// 3. Look for allocations in update()
update(dt, context) {
    const temp = { x: 0, y: 0 }; // ❌ Creates garbage!
}

// 4. Check for expensive operations in draw()
draw(ctx) {
    const sorted = entities.sort(...); // ❌ Sorts every frame!
}
```

### Issue: Config Changes Not Applying

**Checklist**:
```bash
# 1. Hard refresh browser
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 2. Check browser console for errors
# Look for JSON parse errors

# 3. Check Network tab
# Verify JSON file loaded (not 304 cached)

# 4. Validate JSON syntax
# Copy/paste into jsonlint.com

# 5. Check fallback not being used
console.log('Using fallback:', Config.STAGES === Config.FALLBACK_STAGES);
```

## Test Scenarios

### Quick Test Commands

Add to browser console for rapid testing:

```javascript
// Spawn 10 obstacles instantly
for (let i = 0; i < 10; i++) {
    new Obstacle(800 + i * 100, game.viewport.logicalHeight);
}

// Give player invincibility
player.invincibleTimer = 999;

// Set game speed
game.gameSpeed = 100; // Super slow
game.gameSpeed = 1000; // Super fast

// Add lives
player.lives = 99;

// Jump to level
game.level.setLevel(10);

// Clear all obstacles
Array.from(gameEntities.values())
    .filter(e => e.entityType === 'obstacle')
    .forEach(e => e.destroy());

// Freeze game (pause update)
game.loop.stop();

// Resume game
game.loop.start();
```

## Logging Best Practices

Use the [Logger](../../js/utils/Logger.js) system correctly:

```javascript
import { logger } from './utils/Logger.js';

// DEBUG: Verbose, per-frame logs (only when Config.DEBUG = true)
logger.debug('MySystem', 'Processing entity', entity.id);

// INFO: Important events, state changes
logger.info('LevelSystem', `Advanced to level ${newLevel}`);

// WARN: Recoverable issues
logger.warn('SpawnManager', 'Spawn rate too high, throttling');

// ERROR: Critical failures
logger.error('Config', 'Failed to load stages.json', error);
```

**Never use `console.log()` directly** - it bypasses the logging system and violates coding standards.

## Mobile Debugging

For testing on mobile devices:

### Remote Debugging
1. Connect device via USB
2. Chrome → `chrome://inspect`
3. Inspect device
4. Use DevTools remotely

### On-Screen Debug Panel
Add to HTML:

```html
<div id="mobile-debug" style="position: fixed; top: 0; left: 0; background: rgba(0,0,0,0.8); color: lime; padding: 10px; font: 10px monospace; z-index: 9999;"></div>
```

Update in game loop:

```javascript
if (Config.DEBUG) {
    const debugEl = document.getElementById('mobile-debug');
    if (debugEl) {
        debugEl.textContent = `
FPS: ${Math.round(1 / dt)}
Entities: ${gameEntities.size}
Touch: ${this.input.lastTouchTime}
        `.trim();
    }
}
```

## Debugging Checklist

Before reporting a bug:

- [ ] Checked browser console for errors
- [ ] Enabled `Config.DEBUG` and inspected visual overlays
- [ ] Verified entity is registered in `gameEntities`
- [ ] Checked collision layers and masks
- [ ] Profiled performance in DevTools
- [ ] Tested with different config values
- [ ] Hard refreshed browser to clear cache
- [ ] Checked `npm test` passes (no linting errors)

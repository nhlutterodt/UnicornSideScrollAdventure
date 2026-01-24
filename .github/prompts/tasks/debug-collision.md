# Task: Debug Collision Issues

Step-by-step guide to diagnose and fix collision detection problems.

## Step 1: Verify the Problem

Enable debug mode to visualize hitboxes:

```javascript
// In js/Config.js
DEBUG: true
```

Reload browser. You should see:
- Red rectangles around entities (hitboxes)
- Yellow rectangles showing collision bounds with padding
- White text showing entity IDs

## Step 2: Check Entity Registration

Entities must be registered to participate in collision detection.

```javascript
// In browser console
console.log('Total entities:', gameEntities.size);

// Find your specific entities
const players = engineRegistry.getByType('player');
const obstacles = engineRegistry.getByType('obstacle');

console.log('Players:', players);
console.log('Obstacles:', obstacles);
```

**Problem**: Entity not in registry?
- ✅ Check `super()` is called in constructor
- ✅ Check `shouldRegister()` returns `true` (default)
- ✅ Entity not immediately destroyed

## Step 3: Inspect Collision Properties

```javascript
// Get entities
const player = engineRegistry.getByType('player')[0];
const obstacle = engineRegistry.getByType('obstacle')[0];

// Check collision layer setup
console.log('Player layer:', player.collisionLayer);
console.log('Player mask:', player.collisionMask);
console.log('Obstacle layer:', obstacle.collisionLayer);
console.log('Obstacle mask:', obstacle.collisionMask);
```

Expected values (from [js/utils/PhysicsUtils.js](../../../js/utils/PhysicsUtils.js)):
```javascript
CollisionLayers = {
    NONE: 0,
    PLAYER: 1,      // 1 << 0
    OBSTACLE: 2,    // 1 << 1
    PLATFORM: 4,    // 1 << 2
    PARTICLE: 8,    // 1 << 3
    ITEM: 16        // 1 << 4
}
```

## Step 4: Test Collision Compatibility

Entities collide if layers/masks are compatible:

```javascript
const player = engineRegistry.getByType('player')[0];
const obstacle = engineRegistry.getByType('obstacle')[0];

// Test compatibility
const playerCanHitObstacle = (player.collisionMask & obstacle.collisionLayer) !== 0;
const obstacleCanHitPlayer = (obstacle.collisionMask & player.collisionLayer) !== 0;
const canCollide = playerCanHitObstacle || obstacleCanHitPlayer;

console.log('Player can hit obstacle:', playerCanHitObstacle);
console.log('Obstacle can hit player:', obstacleCanHitPlayer);
console.log('Can collide:', canCollide);
```

**Problem**: `canCollide` is `false`?

### Fix Player Settings
```javascript
// In js/entities/Player.js constructor
this.collisionLayer = CollisionLayers.PLAYER;
this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM | CollisionLayers.ITEM;
```

### Fix Obstacle Settings
```javascript
// In js/entities/Obstacle.js constructor
this.collisionLayer = CollisionLayers.OBSTACLE;
this.collisionMask = CollisionLayers.PLAYER;
```

## Step 5: Check Collision Padding

Padding shrinks hitbox for fairer collision:

```javascript
console.log('Player padding:', player.collisionPadding);
console.log('Obstacle padding:', obstacle.collisionPadding);
```

**Problem**: Padding too large?
- If `collisionPadding = 25` and `width = 50`, effective hitbox is 0!
- Typical values: 0-15 pixels

**Fix**:
```javascript
// In entity constructor
this.collisionPadding = 10; // Reasonable value
```

## Step 6: Visual Overlap Test

Move entities manually to force collision:

```javascript
// Get entities
const player = game.player;
const obstacle = Array.from(gameEntities.values()).find(e => e.entityType === 'obstacle');

// Position obstacle directly on player
obstacle.x = player.x;
obstacle.y = player.y;

// Check if collision detected next frame
// Look for console logs or game response
```

If still no collision, collision system isn't running.

## Step 7: Verify Collision System Active

```javascript
// In Game.js, check update() method
// Should see: CollisionSystem.detect(...)

// Verify in console
console.log('CollisionSystem exists:', typeof CollisionSystem !== 'undefined');
```

If missing, CollisionSystem not imported or not called.

## Step 8: Check onCollision Signature

The `onCollision` method MUST have exactly 3 parameters:

```javascript
// ❌ WRONG - Missing context parameter
onCollision(other, particles) {
    // ...
}

// ✅ CORRECT
onCollision(other, particles, context) {
    // ...
}
```

**Why it matters**: The standard-checker enforces this signature for consistency.

## Step 9: Add Collision Logging

Temporarily add debug logging:

```javascript
// In entity's onCollision method
onCollision(other, particles, context) {
    console.log(`${this.entityType} collided with ${other.entityType}`);
    console.log('Position:', this.x, this.y);
    console.log('Other position:', other.x, other.y);
    
    // Your collision logic...
}
```

If you see logs, collision IS working but response may be wrong.

## Step 10: Test Collision Bounds

Manually check if rectangles overlap:

```javascript
const player = game.player;
const obstacle = Array.from(gameEntities.values()).find(e => e.entityType === 'obstacle');

// Manual AABB test
const overlapsX = player.x < obstacle.x + obstacle.width &&
                  player.x + player.width > obstacle.x;
                  
const overlapsY = player.y < obstacle.y + obstacle.height &&
                  player.y + player.height > obstacle.y;
                  
const overlaps = overlapsX && overlapsY;

console.log('Manual overlap test:', overlaps);
console.log('X overlap:', overlapsX, 'Y overlap:', overlapsY);
```

If `overlaps` is `true` but collision not detected, check collision system logic.

## Common Issues & Fixes

### Issue 1: Entities Phase Through Each Other

**Cause**: Entities moving too fast, skipping past each other between frames.

**Symptoms**:
- Works at slow speed
- Fails at high speed
- Intermittent collision detection

**Fix**: Add continuous collision detection or reduce speed
```javascript
// In Config.js
MAX_GAME_SPEED: 800  // Reduce from 1200
```

Or implement swept collision (advanced).

### Issue 2: Collision Detected Too Early/Late

**Cause**: Hitbox doesn't match visual appearance.

**Fix**: Adjust padding or size
```javascript
// Shrink hitbox for fairness
this.collisionPadding = 12;

// Or adjust dimensions in constructor
const width = 40;  // Reduce from 50
const height = 40;
super(x, y, width, height, 'obstacle');
```

### Issue 3: Collision Only Works One Direction

**Cause**: Asymmetric layer/mask setup.

**Check**:
```javascript
// Player collides with obstacles
player.collisionMask & obstacle.collisionLayer !== 0  // Should be true

// Obstacle collides with player  
obstacle.collisionMask & player.collisionLayer !== 0  // Should be true
```

**Fix**: Ensure bidirectional compatibility
```javascript
// Player
this.collisionLayer = CollisionLayers.PLAYER;
this.collisionMask = CollisionLayers.OBSTACLE; // Must include OBSTACLE

// Obstacle
this.collisionLayer = CollisionLayers.OBSTACLE;
this.collisionMask = CollisionLayers.PLAYER;   // Must include PLAYER
```

### Issue 4: Particle/Cloud Collisions Unwanted

**Cause**: Decorative entities have collision enabled.

**Fix**: Set layers to NONE
```javascript
// In Cloud.js or Particle.js
this.collisionLayer = CollisionLayers.NONE;
this.collisionMask = CollisionLayers.NONE;
```

Or skip registration entirely:
```javascript
shouldRegister() {
    return false; // Don't participate in collision system
}
```

### Issue 5: Platform Collision Wrong

**Symptoms**: Player falls through platforms.

**Cause**: Platform collision requires special handling (top-only collision).

**Check**: Platform collision logic in CollisionSystem
```javascript
// Should check if player is above platform
if (player.vy > 0 && player.y + player.height <= platform.y + 5) {
    // Land on platform
}
```

## Debug Visualization Enhancement

Add to entity's `drawDebug()` method:

```javascript
drawDebug(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Normal hitbox
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    
    // Collision hitbox (with padding)
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
    const pad = this.collisionPadding || 0;
    ctx.strokeRect(
        this.x + pad,
        this.y + pad,
        this.width - pad * 2,
        this.height - pad * 2
    );
    
    // Layer info
    ctx.fillStyle = 'white';
    ctx.font = '10px monospace';
    ctx.fillText(
        `L:${this.collisionLayer} M:${this.collisionMask}`,
        this.x,
        this.y - 5
    );
    
    // Collision state
    if (this.lastCollision) {
        ctx.fillStyle = 'red';
        ctx.fillText('COLLISION!', this.x, this.y - 15);
    }
}

onCollision(other, particles, context) {
    this.lastCollision = Date.now();
    setTimeout(() => this.lastCollision = null, 100);
    // ... rest of collision logic
}
```

## Stress Test Collisions

```javascript
// Spawn many obstacles to test
for (let i = 0; i < 10; i++) {
    new Obstacle(100 + i * 60, game.viewport.logicalHeight - 100);
}

// Move player through them
game.player.x = 50;

// Watch for collisions
let collisionCount = 0;
const originalOnCollision = game.player.onCollision.bind(game.player);
game.player.onCollision = function(...args) {
    collisionCount++;
    console.log(`Collision #${collisionCount}`);
    return originalOnCollision(...args);
};
```

## Advanced: Collision System Debugging

If basic checks pass but collisions still don't work, debug the CollisionSystem itself:

```javascript
// In js/systems/CollisionSystem.js
static detect(context) {
    const { engineRegistry } = context;
    
    // Add logging
    console.log('Collision check - entities:', engineRegistry.entities.size);
    
    const entities = Array.from(engineRegistry.entities.values());
    
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            const a = entities[i];
            const b = entities[j];
            
            // Log each pair checked
            console.log(`Checking ${a.entityType} vs ${b.entityType}`);
            
            if (PhysicsUtils.shouldCollide(a, b)) {
                console.log('  → Can collide (layer check passed)');
                
                if (PhysicsUtils.checkCollision(a, b, a.collisionPadding)) {
                    console.log('  → COLLISION DETECTED!');
                    // ...
                }
            }
        }
    }
}
```

## Checklist

- [ ] Debug mode enabled (red hitboxes visible)
- [ ] Entities registered in `gameEntities`
- [ ] `collisionLayer` set correctly
- [ ] `collisionMask` set correctly
- [ ] Layers are bitwise compatible
- [ ] `collisionPadding` reasonable (0-15)
- [ ] `onCollision(other, particles, context)` signature correct
- [ ] CollisionSystem.detect() being called
- [ ] Visual overlap matches expected collision
- [ ] No console errors

## Quick Reference

### Collision Layer Constants
```javascript
import { CollisionLayers } from './utils/PhysicsUtils.js';

CollisionLayers.NONE      // 0
CollisionLayers.PLAYER    // 1
CollisionLayers.OBSTACLE  // 2
CollisionLayers.PLATFORM  // 4
CollisionLayers.PARTICLE  // 8
CollisionLayers.ITEM      // 16
```

### Common Layer Combinations
```javascript
// Player collides with obstacles, platforms, and items
mask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM | CollisionLayers.ITEM;

// Obstacle only collides with player
mask = CollisionLayers.PLAYER;

// Projectile collides with enemies and obstacles
mask = CollisionLayers.ENEMY | CollisionLayers.OBSTACLE;
```

### Testing in Console
```javascript
// Get all entities by type
engineRegistry.getByType('player');
engineRegistry.getByType('obstacle');

// Manual collision test
const a = game.player;
const b = Array.from(gameEntities.values())[1];
PhysicsUtils.checkCollision(a, b, a.collisionPadding);

// Check layer compatibility
(a.collisionMask & b.collisionLayer) !== 0;
```

## Still Stuck?

1. Compare your entity to working example ([js/entities/Obstacle.js](../../../js/entities/Obstacle.js))
2. Check CollisionSystem is imported in [js/Game.js](../../../js/Game.js)
3. Verify `npm test` passes (no standard violations)
4. Try disabling collision padding temporarily
5. Test with brand new entity to isolate issue

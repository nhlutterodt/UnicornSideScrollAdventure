# Task: Create New Entity

Follow this checklist to add a new entity type to the game.

## Step 1: Plan Your Entity

Answer these questions first:

- **Purpose**: What does this entity do? (obstacle, collectible, decoration, etc.)
- **Behavior**: Does it move? React to player? Have a lifespan?
- **Collision**: What should it collide with? (player, obstacles, nothing?)
- **Visual**: Static image, animated, particle-based?
- **Sound**: Does it make sounds on spawn/collision/destroy?

## Step 2: Create Entity File

Create new file: `js/entities/YourEntity.js`

```javascript
import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';
import { logger } from '../utils/Logger.js';

/**
 * YOURENTITY.js
 * [Brief description of what this entity does]
 */
export class YourEntity extends Entity {
    constructor(x, y) {
        // Calculate dimensions BEFORE super()
        const width = 50;
        const height = 50;
        
        super(x, y, width, height, 'your-entity');
        
        // Set collision properties
        this.collisionLayer = CollisionLayers.NONE;    // TODO: Set appropriate layer
        this.collisionMask = CollisionLayers.NONE;     // TODO: Set what to collide with
        this.collisionPadding = 0;                     // Optional: shrink hitbox
        
        // State properties
        this.velocity = { x: 0, y: 0 };
        this.state = 'idle';
        
        logger.debug('YourEntity', `Spawned at (${x}, ${y})`);
    }

    update(dt, context) {
        // TODO: Add update logic
        // - Update position based on velocity
        // - Check conditions
        // - Emit events for state changes
    }

    draw(ctx) {
        ctx.save();
        
        // TODO: Add rendering logic
        ctx.fillStyle = '#ff6ec7';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Debug visualization
        if (window.Config?.DEBUG) {
            this.drawDebug(ctx);
        }
        
        ctx.restore();
    }

    onCollision(other, particles, context) {
        // TODO: Add collision response
        logger.debug('YourEntity', `Collided with ${other.entityType}`);
        
        // Emit event for complex logic
        eventManager.emit('YOUR_ENTITY_COLLISION', {
            entity: this,
            other: other
        });
    }

    get isOffscreen() {
        // TODO: Define offscreen condition
        return this.x + this.width < -200;
    }

    drawDebug(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`${this.id} (${this.state})`, this.x, this.y - 5);
    }
}
```

## Step 3: Set Collision Properties

Choose appropriate collision settings:

### For Obstacle/Hazard
```javascript
this.collisionLayer = CollisionLayers.OBSTACLE;
this.collisionMask = CollisionLayers.PLAYER;
```

### For Collectible Item
```javascript
this.collisionLayer = CollisionLayers.ITEM;
this.collisionMask = CollisionLayers.PLAYER;
```

### For Platform
```javascript
this.collisionLayer = CollisionLayers.PLATFORM;
this.collisionMask = CollisionLayers.PLAYER;
```

### For Decoration (No Collision)
```javascript
this.collisionLayer = CollisionLayers.NONE;
this.collisionMask = CollisionLayers.NONE;
```

## Step 4: Implement Update Logic

Common patterns:

### Moving Left (Scrolling with Game)
```javascript
update(dt, context) {
    const { gameSpeed } = context;
    this.x -= gameSpeed * dt;
}
```

### Gravity-Affected
```javascript
update(dt, context) {
    const { config } = context;
    this.vy += config.GRAVITY * dt;
    this.y += this.vy * dt;
}
```

### Timed Lifespan
```javascript
constructor(x, y) {
    super(x, y, 50, 50, 'your-entity');
    this.lifetime = 5.0; // 5 seconds
}

update(dt, context) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
        this.destroy();
    }
}
```

### Animated (Bobbing Motion)
```javascript
constructor(x, y) {
    super(x, y, 50, 50, 'your-entity');
    this.animTime = 0;
    this.baseY = y;
}

update(dt, context) {
    this.animTime += dt;
    this.y = this.baseY + Math.sin(this.animTime * 3) * 10;
}
```

## Step 5: Add Spawning Logic

Add to `js/systems/SpawnManager.js`:

```javascript
spawnYourEntity() {
    const { logicalWidth, logicalHeight } = this.context;
    const spawnX = logicalWidth + 50;
    const spawnY = logicalHeight * 0.5; // Middle of screen
    
    new YourEntity(spawnX, spawnY);
    
    logger.debug('SpawnManager', `Spawned YourEntity at x=${spawnX}`);
}
```

Add spawn call in `update()`:

```javascript
update(dt, context) {
    this.yourEntityTimer += dt;
    
    const interval = 3.0; // Spawn every 3 seconds
    
    if (this.yourEntityTimer >= interval) {
        this.yourEntityTimer = 0;
        this.spawnYourEntity();
    }
}
```

## Step 6: Add Visual Effects

In `onCollision()` or when destroyed:

```javascript
onCollision(other, particles, context) {
    // Particle burst
    particles.burst(
        this.x + this.width / 2,
        this.y + this.height / 2,
        {
            count: 20,
            velocityRange: 200,
            lifetime: 0.7,
            colors: ['#ff6ec7', '#ffd700']
        }
    );
    
    this.destroy();
}
```

## Step 7: Test Your Entity

### Manual Testing
1. Open `index.html` in browser
2. Enable debug mode (`Config.DEBUG = true`)
3. Spawn entity in console:
   ```javascript
   new YourEntity(400, 300);
   ```
4. Verify:
   - Entity appears
   - Hitbox visible (red rectangle)
   - Collision works
   - Entity cleans up when offscreen

### Debug Commands
```javascript
// Check entity registered
Array.from(gameEntities.values()).filter(e => e.entityType === 'your-entity');

// Check collision layers
const entity = Array.from(gameEntities.values()).find(e => e.entityType === 'your-entity');
console.log('Layer:', entity.collisionLayer, 'Mask:', entity.collisionMask);

// Monitor spawning
let spawnCount = 0;
const originalConstructor = YourEntity;
YourEntity = function(...args) {
    console.log(`YourEntity #${++spawnCount} spawned`);
    return new originalConstructor(...args);
};
```

## Step 8: Optional - Create Manager System

If entity has complex behavior, create a manager:

`js/systems/YourEntityManager.js`:

```javascript
import { eventManager } from './EventManager.js';
import { logger } from '../utils/Logger.js';

export class YourEntityManager {
    static init() {
        eventManager.on('YOUR_ENTITY_COLLISION', this.handleCollision.bind(this));
        logger.info('YourEntityManager', 'Initialized');
    }
    
    static handleCollision({ entity, other }) {
        // Complex logic here
        if (other.entityType === 'player') {
            // Apply effects, spawn more entities, etc.
        }
    }
}
```

Initialize in `js/Game.js`:

```javascript
import { YourEntityManager } from './systems/YourEntityManager.js';

constructor() {
    // ... other initialization ...
    YourEntityManager.init();
}
```

## Step 9: Run Quality Checks

```bash
# Run standard checker
npm test

# Should pass with no violations
```

Check for:
- [ ] No inline styles
- [ ] No raw `localStorage` usage
- [ ] No `console.log()` (use `logger`)
- [ ] All DOM queries null-checked
- [ ] Event listeners cleaned up in `dispose()`

## Step 10: Document Your Entity

Add JSDoc comments:

```javascript
/**
 * YourEntity - [Brief description]
 * 
 * Behavior:
 * - [List key behaviors]
 * - [Movement pattern]
 * - [Collision response]
 * 
 * Collision:
 * - Layer: OBSTACLE/ITEM/PLATFORM/etc.
 * - Collides with: PLAYER/etc.
 * 
 * @extends Entity
 */
export class YourEntity extends Entity {
    // ...
}
```

## Checklist

- [ ] Entity file created in `js/entities/`
- [ ] Extends `Entity` base class
- [ ] `super()` called in constructor
- [ ] Collision layer and mask set
- [ ] `update(dt, context)` implemented
- [ ] `draw(ctx)` implemented
- [ ] `isOffscreen` getter implemented
- [ ] `onCollision()` implemented if needed
- [ ] Debug visualization included
- [ ] Spawning logic added to SpawnManager
- [ ] Visual effects added (optional)
- [ ] Tested in browser
- [ ] `npm test` passes
- [ ] Documented with comments

## Examples to Reference

- **Simple hazard**: [js/entities/Obstacle.js](../../js/entities/Obstacle.js)
- **Gravity entity**: [js/entities/Player.js](../../js/entities/Player.js)
- **Collectible**: [js/entities/Item.js](../../js/entities/Item.js)
- **Decoration**: [js/entities/Cloud.js](../../js/entities/Cloud.js)

## Next Steps

Once entity works:
1. Add to stage JSON spawning configuration (if applicable)
2. Create custom sprites/animations
3. Add sound effects
4. Balance spawn rates and difficulty

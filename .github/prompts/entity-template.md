# Entity Creation Template

Copy this template when creating any new game object. All entities MUST extend the base `Entity` class from [js/core/Entity.js](../../js/core/Entity.js).

## Quick Start Template

```javascript
import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';
import { logger } from '../utils/Logger.js';

/**
 * [ENTITY_NAME].js
 * Brief description of what this entity does.
 */
export class MyEntity extends Entity {
    constructor(x, y, customParam) {
        // Calculate dimensions BEFORE super() call
        const width = 50;
        const height = 50;
        
        super(x, y, width, height, 'my-entity'); // Type for Registry
        
        // --- Collision Setup (REQUIRED) ---
        this.collisionLayer = CollisionLayers.NONE; // What layer AM I on?
        this.collisionMask = CollisionLayers.NONE;  // What layers can I COLLIDE WITH?
        this.collisionPadding = 0; // Optional: shrink hitbox for fairness
        
        // --- State Properties (Pure Data) ---
        this.velocity = { x: 0, y: 0 };
        this.state = 'idle'; // idle, moving, attacking, etc.
        this.timer = 0;
        
        // --- Visual Properties ---
        this.color = '#ff6ec7';
        this.rotation = 0;
        
        // --- Custom Properties ---
        this.customParam = customParam;
        
        logger.debug('MyEntity', `Created at (${x}, ${y})`);
    }

    /**
     * Update logic - called every frame
     * @param {number} dt - Delta time in seconds
     * @param {Object} context - Game context (gameSpeed, config, dimensions, etc.)
     */
    update(dt, context) {
        // 1. Update timers
        this.timer += dt;
        
        // 2. Update position (access context properties)
        const { gameSpeed, logicalHeight, config } = context;
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        
        // 3. Update state
        if (this.timer > 2.0) {
            this.state = 'done';
            eventManager.emit('MY_ENTITY_COMPLETED', { entity: this });
        }
        
        // 4. Bounds checking (if needed)
        if (this.y > logicalHeight) {
            this.destroy();
        }
    }

    /**
     * Render logic - called every frame after update
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();
        
        // Position and rotation
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // Draw entity
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Debug visualization (ALWAYS include this)
        if (window.Config?.DEBUG) {
            this.drawDebug(ctx);
        }
        
        ctx.restore();
    }

    /**
     * Collision callback - called when this entity collides with another
     * @param {Entity} other - The entity we collided with
     * @param {ParticleSystem} particles - For visual effects
     * @param {Object} context - Game context
     */
    onCollision(other, particles, context) {
        logger.debug('MyEntity', `Collided with ${other.entityType}`);
        
        // Emit event for complex logic (handled by Manager)
        eventManager.emit('MY_ENTITY_HIT', { 
            entity: this, 
            other: other,
            position: { x: this.x, y: this.y }
        });
        
        // Visual feedback
        particles.burst(this.x + this.width / 2, this.y + this.height / 2, {
            count: 10,
            colors: [this.color],
            lifetime: 0.5
        });
    }

    /**
     * Determines if entity should be auto-pruned by Registry
     * @returns {boolean}
     */
    get isOffscreen() {
        // Adjust based on entity's movement pattern
        const buffer = 200;
        return this.x + this.width < -buffer || 
               this.x > window.innerWidth + buffer;
    }

    /**
     * Debug visualization (hitboxes, state, ID)
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawDebug(ctx) {
        // Reset transform for debug overlay
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Hitbox
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Collision bounds (with padding)
        if (this.collisionPadding > 0) {
            ctx.strokeStyle = 'yellow';
            ctx.strokeRect(
                this.x + this.collisionPadding, 
                this.y + this.collisionPadding,
                this.width - this.collisionPadding * 2, 
                this.height - this.collisionPadding * 2
            );
        }
        
        // Entity info
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.fillText(`${this.id} (${this.state})`, this.x, this.y - 5);
    }

    /**
     * Cleanup method - called before removal from Registry
     */
    destroy() {
        logger.debug('MyEntity', `Destroying ${this.id}`);
        
        // Emit cleanup event if needed
        eventManager.emit('MY_ENTITY_DESTROYED', { entity: this });
        
        // Call parent cleanup
        super.destroy();
    }
}
```

## Checklist Before Adding Entity

- [ ] Extends `Entity` base class
- [ ] Calls `super(x, y, width, height, type)` in constructor
- [ ] Sets `collisionLayer` and `collisionMask` appropriately
- [ ] Implements `update(dt, context)` method
- [ ] Implements `draw(ctx)` method
- [ ] Implements `isOffscreen` getter for auto-pruning
- [ ] Implements `onCollision(other, particles, context)` if collides
- [ ] Includes debug visualization in `draw()` when `Config.DEBUG`
- [ ] Emits events for complex state changes (don't add logic to entity)
- [ ] No business logic in entity - only state and simple physics

## Common Entity Patterns

### Moving Left (Like Obstacles)
```javascript
update(dt, context) {
    const { gameSpeed } = context;
    this.x -= gameSpeed * dt; // Move left with game speed
}
```

### Gravity-Affected (Like Player/Items)
```javascript
update(dt, context) {
    const { config } = context;
    this.vy += config.GRAVITY * dt;
    this.y += this.vy * dt;
}
```

### Timed Lifespan (Like Power-ups)
```javascript
constructor(x, y) {
    super(x, y, 30, 30, 'powerup');
    this.lifetime = 5.0; // 5 seconds
}

update(dt, context) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
        this.destroy();
    }
}
```

### Animated (Frame-based or Sine Wave)
```javascript
constructor(x, y) {
    super(x, y, 40, 40, 'animated');
    this.animTime = 0;
}

update(dt, context) {
    this.animTime += dt;
    // Bobbing motion
    this.y = this.baseY + Math.sin(this.animTime * 3) * 10;
}
```

## Collision Layer Examples

### Entity that Damages Player
```javascript
this.collisionLayer = CollisionLayers.OBSTACLE;
this.collisionMask = CollisionLayers.PLAYER; // Only collides with player
```

### Collectible Item
```javascript
this.collisionLayer = CollisionLayers.ITEM;
this.collisionMask = CollisionLayers.PLAYER; // Only collides with player
```

### Platform (Player stands on)
```javascript
this.collisionLayer = CollisionLayers.PLATFORM;
this.collisionMask = CollisionLayers.PLAYER;
```

### Multi-Layer Entity (Rare)
```javascript
this.collisionLayer = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM;
this.collisionMask = CollisionLayers.PLAYER;
```

## When Entity Gets Complex

If your entity has more than 50 lines of logic in `update()` or you're adding complex behaviors:

1. **Create a Manager System** in [js/systems/](../../js/systems/)
2. **Emit events** from the entity
3. **Handle complex logic** in the manager

Example:
```javascript
// In Entity
onCollision(other, particles, context) {
    eventManager.emit('SPECIAL_ENTITY_HIT', { entity: this, other });
}

// In System (SpecialEntityManager.js)
eventManager.on('SPECIAL_ENTITY_HIT', ({ entity, other }) => {
    // Complex multi-step logic here
    if (other.entityType === 'player') {
        // Apply effects, update score, spawn more entities, etc.
    }
});
```

Keep entities simple. Keep systems smart.

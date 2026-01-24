# Visual Effects & Particle Recipes

Use the [ParticleSystem](../../js/systems/ParticleSystem.js) for all visual polish. Particles use object pooling, so you can safely emit hundreds per frame without performance issues.

## Particle System Basics

```javascript
import { ParticleSystem } from './systems/ParticleSystem.js';

// In Game.js or your system
this.particles = new ParticleSystem();

// In update loop
this.particles.update(dt);

// In draw loop
this.particles.draw(ctx);
```

## Core Methods

### `emit(x, y, options)` - Continuous Emission
Creates particles over time at a specific location.

```javascript
particles.emit(x, y, {
    count: 5,              // Particles per emission
    velocityX: { min: -50, max: 50 },  // Horizontal spread
    velocityY: { min: -100, max: -50 }, // Vertical spread
    lifetime: 0.5,         // Seconds before particle dies
    size: 4,               // Particle size in pixels
    colors: ['#ff6ec7', '#ffd700', '#a29bfe']  // Random from array
});
```

### `burst(x, y, options)` - One-Time Explosion
Creates all particles at once (for impacts, explosions, pickups).

```javascript
particles.burst(x, y, {
    count: 20,             // Total particles to spawn
    velocityRange: 200,    // Speed in all directions
    lifetime: 0.8,
    size: { min: 3, max: 8 },  // Random size range
    colors: ['#ff0000', '#ff6600', '#ffcc00']
});
```

## Recipe Library

### Trail Effect (Player Movement)
Perfect for player character, projectiles, or any moving entity.

```javascript
// In Player.update() or entity update
if (this.isMoving) {
    particles.emit(
        this.x + this.width / 2,   // Center of entity
        this.y + this.height,       // Bottom of entity
        {
            count: 3,
            velocityX: { min: -30, max: 30 },
            velocityY: { min: -80, max: -40 },
            lifetime: 0.6,
            size: 3,
            colors: ['#ff6ec7', '#ffd700', '#a29bfe', '#ffffff']
        }
    );
}
```

**Variations**:
- **Rainbow trail**: Use 6+ colors
- **Smoke trail**: Gray colors, larger size (5-8)
- **Fire trail**: Orange/red colors, upward velocity

### Explosion Effect (Collision/Destruction)
Use when entities collide or are destroyed.

```javascript
// In onCollision() or when entity dies
particles.burst(
    this.x + this.width / 2,
    this.y + this.height / 2,
    {
        count: 25,
        velocityRange: 250,
        lifetime: 0.7,
        size: { min: 4, max: 10 },
        colors: ['#ff0000', '#ff3300', '#ff6600', '#ff9900']
    }
);
```

**Variations**:
- **Small pop**: count: 10, velocityRange: 150
- **Big explosion**: count: 50, velocityRange: 400
- **Confetti**: Bright colors, longer lifetime (1.5s)

### Item Pickup Effect
Visual feedback when collecting items.

```javascript
// When item collected
particles.burst(item.x, item.y, {
    count: 15,
    velocityRange: 180,
    lifetime: 0.5,
    size: 5,
    colors: ['#ffd700', '#ffed4e', '#fff44f']  // Gold colors
});

// Optional: Upward stream
particles.emit(item.x, item.y, {
    count: 8,
    velocityX: { min: -20, max: 20 },
    velocityY: { min: -200, max: -150 },  // Strong upward
    lifetime: 1.0,
    colors: ['#ffd700']
});
```

### Impact Effect (Player Landing)
Subtle ground impact particles.

```javascript
// In Player.update() when landing
if (this.justLanded) {
    particles.burst(
        this.x + this.width / 2,
        this.y + this.height,
        {
            count: 8,
            velocityX: { min: -100, max: 100 },
            velocityY: { min: -50, max: 0 },
            lifetime: 0.3,
            size: 3,
            colors: ['#cccccc', '#999999']
        }
    );
}
```

### Sparkle Effect (Idle/Ambiance)
Continuous subtle effect for special items or areas.

```javascript
// In update loop for special entity
if (this.isSpecial && Math.random() < 0.3) {
    particles.emit(
        this.x + Math.random() * this.width,
        this.y + Math.random() * this.height,
        {
            count: 1,
            velocityX: { min: -10, max: 10 },
            velocityY: { min: -30, max: -10 },
            lifetime: 1.2,
            size: 2,
            colors: ['#ffffff', '#ffd700', '#ffed4e']
        }
    );
}
```

### Charge-Up Effect
Building energy before special attack/ability.

```javascript
// During charge phase
particles.emit(
    this.x + this.width / 2,
    this.y + this.height / 2,
    {
        count: 10,
        velocityX: { min: -20, max: 20 },
        velocityY: { min: -20, max: 20 },
        lifetime: 0.4,
        size: 3,
        colors: ['#00ffff', '#0099ff', '#ffffff']
    }
);
```

### Damage Effect
When entity takes damage.

```javascript
// In onCollision() or takeDamage()
particles.burst(this.x, this.y, {
    count: 12,
    velocityRange: 150,
    lifetime: 0.5,
    size: 6,
    colors: ['#ff0000', '#ffffff']
});
```

### Teleport/Warp Effect
For entity appearing/disappearing.

```javascript
// Before teleport
particles.burst(this.x, this.y, {
    count: 30,
    velocityRange: 100,
    lifetime: 0.6,
    size: 4,
    colors: ['#a29bfe', '#6c5ce7', '#ffffff']
});

// After teleport (at new position)
particles.burst(newX, newY, {
    count: 30,
    velocityRange: 200,  // Faster outward burst
    lifetime: 0.4,
    size: 4,
    colors: ['#a29bfe', '#6c5ce7', '#ffffff']
});
```

### Victory/Level Complete
Celebratory effect when level completes.

```javascript
// Continuous confetti rain
const centerX = canvas.width / 2;
particles.emit(centerX, 0, {
    count: 20,
    velocityX: { min: -100, max: 100 },
    velocityY: { min: 100, max: 200 },  // Downward
    lifetime: 3.0,
    size: { min: 6, max: 12 },
    colors: ['#ff6ec7', '#ffd700', '#a29bfe', '#00ffff', '#ff0000']
});
```

## Advanced Patterns

### Conditional Effects Based on State
```javascript
update(dt, context) {
    // Different effects for different states
    switch(this.state) {
        case 'idle':
            // Gentle sparkles
            if (Math.random() < 0.1) {
                particles.emit(this.x, this.y, { /* subtle */ });
            }
            break;
        case 'powered':
            // Intense energy
            particles.emit(this.x, this.y, { count: 10, /* intense */ });
            break;
        case 'damaged':
            // Smoke effect
            particles.emit(this.x, this.y, { colors: ['#333', '#666'] });
            break;
    }
}
```

### Speed-Based Trails
```javascript
update(dt, context) {
    // More particles at higher speeds
    const speed = Math.sqrt(this.vx**2 + this.vy**2);
    const particleCount = Math.floor(speed / 50); // 1 particle per 50 speed
    
    if (particleCount > 0) {
        particles.emit(this.x, this.y, {
            count: Math.min(particleCount, 10), // Cap at 10
            // ...
        });
    }
}
```

### Directional Particles
```javascript
// Particles shoot in opposite direction of movement
const angle = Math.atan2(this.vy, this.vx);
const oppositeAngle = angle + Math.PI;

particles.emit(this.x, this.y, {
    count: 5,
    velocityX: { 
        min: Math.cos(oppositeAngle) * 50,
        max: Math.cos(oppositeAngle) * 100
    },
    velocityY: {
        min: Math.sin(oppositeAngle) * 50,
        max: Math.sin(oppositeAngle) * 100
    },
    // ...
});
```

## Performance Considerations

### Particle Budget
- **Target**: <500 active particles for 60 FPS
- **Max**: 1000 particles before slowdown on low-end devices

### Optimization Tips
1. **Use `burst()` for one-time effects** - cheaper than continuous `emit()`
2. **Reduce `count` on mobile** - detect with `window.innerWidth < 768`
3. **Shorter `lifetime` = fewer particles** - keep under 1 second when possible
4. **Emit conditionally** - Use `Math.random()` checks to reduce frequency

```javascript
// Good: Throttled emission
if (Math.random() < 0.3) { // Only 30% of frames
    particles.emit(x, y, options);
}

// Bad: Every frame
particles.emit(x, y, options); // 60 emits per second!
```

### Mobile Optimization
```javascript
const isMobile = window.innerWidth < 768;
const particleScale = isMobile ? 0.5 : 1.0;

particles.emit(x, y, {
    count: Math.floor(10 * particleScale), // 5 on mobile, 10 on desktop
    size: 3 * particleScale,
    // ...
});
```

## Combining with Other Systems

### Particles + Sound
```javascript
import { AudioSystem } from './systems/AudioSystem.js';

// Synchronized audio and visual
particles.burst(x, y, { /* explosion */ });
AudioSystem.play('explosion');
```

### Particles + Camera Shake
```javascript
import { eventManager } from './systems/EventManager.js';

particles.burst(x, y, { count: 50, velocityRange: 300 });
eventManager.emit('CAMERA_SHAKE', { intensity: 10, duration: 0.3 });
```

### Particles + Score Popup
```javascript
particles.burst(x, y, { colors: ['#ffd700'] });
eventManager.emit('SCORE_POPUP', { x, y, points: 100 });
```

## Debugging Particles

### Visualize Particle Count
```javascript
// In debug mode
if (Config.DEBUG) {
    ctx.fillStyle = 'white';
    ctx.font = '14px monospace';
    ctx.fillText(`Particles: ${particles.activeCount}`, 10, 30);
}
```

### Find Performance Bottlenecks
```javascript
// Log particle count when it gets high
if (particles.activeCount > 800) {
    logger.warn('ParticleSystem', `High particle count: ${particles.activeCount}`);
}
```

## Color Palettes

Use these curated color sets for consistent visual style:

```javascript
// Magic/Fantasy
colors: ['#ff6ec7', '#ffd700', '#a29bfe', '#ffffff']

// Fire/Explosion
colors: ['#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00']

// Ice/Frost
colors: ['#00ffff', '#0099ff', '#66ccff', '#ffffff']

// Nature/Earth
colors: ['#8ce68c', '#5cb85c', '#4a9e4a', '#3d7f3d']

// Dark/Shadow
colors: ['#333333', '#666666', '#999999', '#444444']

// Electric/Energy
colors: ['#00ffff', '#0099ff', '#ffff00', '#ffffff']

// Poison/Toxic
colors: ['#00ff00', '#66ff00', '#99ff33', '#ccff66']
```

## Common Mistakes to Avoid

❌ **Emitting particles in draw()** - Always emit in update()
❌ **Too many colors in palette** - Stick to 3-5 colors max
❌ **Particles larger than 15px** - Looks blocky
❌ **Lifetime > 3 seconds** - Particles linger too long
❌ **Forgetting to update/draw ParticleSystem** - Particles won't appear
❌ **Creating new ParticleSystem per entity** - Use shared instance from Game.js

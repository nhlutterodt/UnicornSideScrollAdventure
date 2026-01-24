# Performance-First Game Development

## Golden Rules for 60 FPS

Game loops run 60 times per second. A single slow frame ruins player experience. Follow these rules religiously.

## Critical: No Allocation in Hot Paths

**The Problem**: JavaScript's garbage collector (GC) pauses execution to clean up unused objects. In a game loop, this causes visible stuttering.

### ❌ BAD - Creates Garbage Every Frame
```javascript
update(dt) {
    const enemies = this.getAllEnemies();        // New array (60x/sec)
    const tempVec = { x: 1, y: 0 };             // New object (60x/sec)
    const filtered = enemies.filter(e => e.active); // New array (60x/sec)
    
    for (let i = 0; i < enemies.length; i++) {  // Reads .length 60x/sec
        // ...
    }
}
```

### ✅ GOOD - Reuses Memory
```javascript
constructor() {
    this._enemyCache = [];           // Pre-allocated
    this._tempVec = { x: 0, y: 0 }; // Reused vector
}

update(dt) {
    const enemies = this._enemyCache;  // Reuse cached reference
    const count = enemies.length;       // Cache length once
    
    this._tempVec.x = 1;               // Modify existing object
    this._tempVec.y = 0;
    
    for (let i = 0; i < count; i++) {
        const e = enemies[i];
        if (!e.active) continue;        // Early skip instead of filter()
        // ...
    }
}
```

## Performance Checklist

Before claiming any feature is complete:

- [ ] **No `new` keyword inside `update()` or `draw()` loops**
  - Exception: Entities created by spawn logic (controlled rate)
- [ ] **No array methods that create new arrays in hot paths**
  - ❌ `.filter()`, `.map()`, `.slice()` in update loop
  - ✅ Manual `for` loops with early continue
- [ ] **No string concatenation in loops**
  - ❌ `'Score: ' + score` creates new string
  - ✅ Use once when displaying, cache result
- [ ] **Canvas state changes minimized**
  - Batch `ctx.fillStyle` changes together
  - Minimize `ctx.save()`/`ctx.restore()` pairs
- [ ] **Collision checks optimized**
  - Use layer masks to filter candidates first
  - Spatial partitioning for large entity counts (>50)
  - Check bounding box before expensive collision
- [ ] **Logger usage correct**
  - ✅ `logger.debug()` for per-frame logs (only when Config.DEBUG)
  - ❌ `logger.info()` in update loop (always runs)

## Canvas Rendering Optimization

### Drawing Order Matters
```javascript
draw(ctx) {
    // BAD: State changes scattered
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillStyle = 'blue';
    ctx.fillRect(20, 0, 10, 10);
    ctx.fillStyle = 'red';
    ctx.fillRect(40, 0, 10, 10); // Changed back to red!
    
    // GOOD: Batch by color
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 10, 10);
    ctx.fillRect(40, 0, 10, 10);  // Both red together
    ctx.fillStyle = 'blue';
    ctx.fillRect(20, 0, 10, 10);
}
```

### Minimize Save/Restore
```javascript
// BAD: Save/restore per entity
entities.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    e.draw(ctx);
    ctx.restore();
});

// GOOD: Manual transform management
entities.forEach(e => {
    const prevX = e.x;
    const prevY = e.y;
    e.draw(ctx); // Entity draws at absolute position
});
```

## Memory Management

### Object Pooling Pattern
For short-lived entities (particles, projectiles):

```javascript
class ParticlePool {
    constructor(size = 100) {
        this.pool = [];
        this.active = [];
        
        // Pre-allocate
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createParticle());
        }
    }
    
    createParticle() {
        return { x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false };
    }
    
    spawn(x, y, vx, vy) {
        let particle = this.pool.pop();
        if (!particle) {
            particle = this.createParticle(); // Grow if needed
        }
        
        particle.x = x;
        particle.y = y;
        particle.vx = vx;
        particle.vy = vy;
        particle.life = 1.0;
        particle.active = true;
        
        this.active.push(particle);
        return particle;
    }
    
    recycle(particle) {
        particle.active = false;
        this.pool.push(particle);
    }
}
```

### Pre-allocation Pattern
```javascript
constructor() {
    // Pre-allocate fixed-size arrays
    this.entities = new Array(100);
    this.entityCount = 0;
    
    // Pre-allocate reusable objects
    this.tempRect = { x: 0, y: 0, width: 0, height: 0 };
    this.tempPoint = { x: 0, y: 0 };
}

addEntity(entity) {
    if (this.entityCount < this.entities.length) {
        this.entities[this.entityCount++] = entity;
    }
}

getBounds(entity) {
    // Reuse tempRect instead of creating new object
    this.tempRect.x = entity.x;
    this.tempRect.y = entity.y;
    this.tempRect.width = entity.width;
    this.tempRect.height = entity.height;
    return this.tempRect;
}
```

## Profiling Your Code

### Chrome DevTools Performance Tab
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record (⭕)
4. Play game for 10 seconds
5. Stop recording
6. Look for:
   - **Yellow bars** = JavaScript execution (should be <16ms per frame)
   - **Purple bars** = Garbage collection (minimize these!)
   - **Green bars** = Rendering (should be <2ms)

### What to Look For
- **GC spikes every few seconds**: You're allocating too much
- **Long yellow frames**: Heavy computation in update/draw
- **Saw-tooth memory pattern**: Good (allocate, then GC cleans up)
- **Ever-increasing memory**: Memory leak (event listeners not removed)

## Common Performance Antipatterns

### 1. Array Iteration with Methods
```javascript
// BAD: Creates new array every frame
const active = entities.filter(e => e.active);
active.forEach(e => e.update(dt));

// GOOD: Single pass with for loop
for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (e.active) e.update(dt);
}
```

### 2. Function Closures in Loops
```javascript
// BAD: Creates new function every iteration
for (let i = 0; i < entities.length; i++) {
    setTimeout(() => entities[i].destroy(), 1000); // New closure each time
}

// GOOD: Reference external function
const destroyEntity = (entity) => entity.destroy();
for (let i = 0; i < entities.length; i++) {
    setTimeout(destroyEntity, 1000, entities[i]);
}
```

### 3. Expensive Operations in Draw
```javascript
// BAD: Calculation in draw loop
draw(ctx) {
    const angle = Math.atan2(this.vy, this.vx); // Expensive trig
    ctx.rotate(angle);
}

// GOOD: Calculate once in update
update(dt) {
    this._cachedAngle = Math.atan2(this.vy, this.vx);
}

draw(ctx) {
    ctx.rotate(this._cachedAngle); // Use cached value
}
```

## Target Performance Metrics

For this project (HTML5 Canvas 2D game):
- **Frame time**: <16ms (60 FPS)
- **Update phase**: <8ms
- **Draw phase**: <6ms
- **GC pauses**: <100ms, less than once per 5 seconds
- **Memory growth**: <1MB per minute during gameplay
- **Entity count**: Support 100+ entities at 60 FPS

## When to Optimize

1. **Profile first**: Don't optimize based on assumptions
2. **Optimize hot paths**: 90% of time spent in 10% of code
3. **Measure impact**: Use Performance tab before and after
4. **Readability vs Performance**: Optimize only if it matters

Remember: Premature optimization is evil, but game loops demand performance-first thinking from the start.

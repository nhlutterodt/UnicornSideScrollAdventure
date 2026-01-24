# Event-Driven Cross-System Communication

Systems communicate via the [EventManager](../../js/systems/EventManager.js) singleton. **Never create direct dependencies** between systems or entities.

## Core Principle

> Entities and systems emit events. Other systems listen and react. No direct coupling.

## Event Naming Convention

Use `NOUN_VERB` format in ALL_CAPS with underscores:

```javascript
// ✅ GOOD - Clear, past tense
'PLAYER_JUMPED'
'ITEM_PICKED_UP'
'OBSTACLE_DESTROYED'
'LEVEL_COMPLETED'
'ABILITY_ACTIVATED'

// ❌ BAD - Present tense, unclear
'player-jump'
'itemPickup'
'destroyObstacle'
```

**Rules**:
- Past tense for completed actions
- Present tense only for ongoing states ('PLAYER_MOVING')
- ALL_CAPS with underscores
- Subject first, then verb

## Basic Usage

### Emitting Events

```javascript
import { eventManager } from './systems/EventManager.js';

// Simple event
eventManager.emit('PLAYER_JUMPED');

// Event with data payload
eventManager.emit('ITEM_PICKED_UP', {
    player: this.player,
    item: collectedItem,
    position: { x: item.x, y: item.y },
    points: 100
});
```

### Listening to Events

```javascript
// In system initialization
eventManager.on('ITEM_PICKED_UP', this.handleItemPickup.bind(this));

// Or with arrow function
eventManager.on('ITEM_PICKED_UP', ({ player, item, position, points }) => {
    // Handle the event
    ScoreManager.addPoints(points);
    particles.burst(position.x, position.y, { colors: ['#ffd700'] });
    AudioSystem.play('pickup');
});
```

### Unsubscribing (Important for Cleanup)

```javascript
class MySystem {
    constructor() {
        this.handleItemPickup = this.handleItemPickup.bind(this);
        eventManager.on('ITEM_PICKED_UP', this.handleItemPickup);
    }
    
    dispose() {
        // Remove listener to prevent memory leaks
        eventManager.off('ITEM_PICKED_UP', this.handleItemPickup);
    }
    
    handleItemPickup(data) {
        // ...
    }
}
```

## Common Event Patterns

### Entity Lifecycle Events

```javascript
// Entity created (rarely used - prefer constructor logic)
eventManager.emit('ENTITY_SPAWNED', { entity, type: 'obstacle' });

// Entity destroyed
eventManager.emit('ENTITY_DESTROYED', { 
    entity, 
    type: entity.entityType,
    cause: 'offscreen' // or 'collision', 'timeout', etc.
});
```

### Game State Events

```javascript
// Game start
eventManager.emit('GAME_STARTED');

// Level progression
eventManager.emit('LEVEL_UP', { 
    level: newLevel, 
    previousLevel: oldLevel 
});

// Game over
eventManager.emit('GAME_OVER', { 
    score: finalScore, 
    level: finalLevel,
    reason: 'collision' // or 'fell', 'timeout', etc.
});

// Game paused/resumed
eventManager.emit('GAME_PAUSED');
eventManager.emit('GAME_RESUMED');
```

### Player Events

```javascript
// Movement
eventManager.emit('PLAYER_JUMPED', { player, jumpForce });
eventManager.emit('PLAYER_LANDED', { player, impactForce });
eventManager.emit('PLAYER_MOVED', { player, velocity });

// State changes
eventManager.emit('PLAYER_DAMAGED', { player, damage, source });
eventManager.emit('PLAYER_HEALED', { player, amount });
eventManager.emit('LIFE_CHANGED', { player, lives, delta });

// Abilities
eventManager.emit('ABILITY_ACTIVATED', { player, ability });
eventManager.emit('ABILITY_EXPIRED', { player, ability });
```

### Collision Events

```javascript
// Generic collision (usually handled internally)
eventManager.emit('COLLISION_DETECTED', { entityA, entityB });

// Specific collision events (preferred)
eventManager.emit('PLAYER_HIT_OBSTACLE', { player, obstacle });
eventManager.emit('PROJECTILE_HIT_ENEMY', { projectile, enemy });
```

### Item & Pickup Events

```javascript
eventManager.emit('ITEM_PICKED_UP', {
    player,
    itemData: { type: 'life', value: 1 },
    position: { x, y }
});

eventManager.emit('ITEM_SPAWNED', {
    item,
    type: 'ability',
    position: { x, y }
});
```

### Score Events

```javascript
eventManager.emit('SCORE_CHANGED', { 
    score: newScore, 
    delta: pointsAdded,
    reason: 'obstacle-passed' // or 'item-collected', 'enemy-killed'
});

eventManager.emit('HIGH_SCORE', { 
    score: newHighScore,
    previousHighScore 
});
```

### UI Events

```javascript
eventManager.emit('UI_UPDATE_REQUIRED', { 
    component: 'lives',
    value: player.lives 
});

eventManager.emit('NOTIFICATION_SHOW', {
    message: 'Level Up!',
    duration: 2.0,
    type: 'success'
});
```

### Viewport Events

```javascript
eventManager.emit('VIEWPORT_RESIZED', {
    logicalWidth,
    logicalHeight,
    physicalWidth,
    physicalHeight,
    scale
});
```

## Advanced Patterns

### Event Chain Reactions

Events can trigger other events:

```javascript
// Obstacle destroyed triggers score increase
eventManager.on('OBSTACLE_DESTROYED', ({ obstacle, points }) => {
    ScoreManager.addPoints(points);
    // Score manager then emits:
    eventManager.emit('SCORE_CHANGED', { score, delta: points });
});

// Score increase triggers level up
eventManager.on('SCORE_CHANGED', ({ score }) => {
    if (score % 100 === 0) {
        eventManager.emit('LEVEL_UP', { level: Math.floor(score / 100) });
    }
});
```

### Conditional Event Handling

```javascript
eventManager.on('PLAYER_DAMAGED', ({ player, damage }) => {
    // Only react if player is not invincible
    if (player.invincibleTimer <= 0) {
        player.lives -= damage;
        eventManager.emit('LIFE_CHANGED', { player, lives: player.lives });
    }
});
```

### Event Aggregation

Batch multiple events into one:

```javascript
class ComboSystem {
    constructor() {
        this.comboCount = 0;
        this.comboTimer = 0;
        
        eventManager.on('OBSTACLE_PASSED', () => {
            this.comboCount++;
            this.comboTimer = 2.0; // 2 second window
            
            if (this.comboCount >= 5) {
                eventManager.emit('COMBO_ACHIEVED', { 
                    count: this.comboCount,
                    bonus: this.comboCount * 10
                });
            }
        });
    }
    
    update(dt) {
        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0; // Reset combo
            }
        }
    }
}
```

### Event Buffering

Delay event processing until next frame:

```javascript
class DelayedEventSystem {
    constructor() {
        this.eventQueue = [];
        
        eventManager.on('DELAYED_EVENT', (data) => {
            this.eventQueue.push(data);
        });
    }
    
    update(dt) {
        // Process queued events
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            this.processEvent(event);
        }
    }
}
```

## Real-World Example: Item Pickup Flow

This demonstrates proper event-driven architecture:

### 1. Collision Detection (CollisionSystem.js)
```javascript
// CollisionSystem detects collision
if (PhysicsUtils.checkCollision(player, item)) {
    // Emit event with all relevant data
    eventManager.emit('ITEM_PICKED_UP', {
        player: player,
        itemData: item.itemData,
        context: { particles, effects, config }
    });
    
    // Remove item from world
    item.destroy();
}
```

### 2. Effect Application (AbilityManager.js)
```javascript
// AbilityManager listens and applies effects
eventManager.on('ITEM_PICKED_UP', ({ player, itemData, context }) => {
    AbilityManager.apply(player, itemData, context);
    
    // Emit confirmation event
    eventManager.emit('ABILITY_APPLIED', { 
        player, 
        ability: itemData 
    });
});
```

### 3. UI Update (UIManager.js)
```javascript
// UIManager listens and updates display
eventManager.on('ABILITY_APPLIED', () => {
    UIManager.updateAbilityInventory();
    UIManager.updateLives();
});
```

### 4. Visual Feedback (EffectSystem.js)
```javascript
// EffectSystem listens and creates effects
eventManager.on('ITEM_PICKED_UP', ({ itemData, context }) => {
    const { particles } = context;
    
    // Particle burst
    particles.burst(item.x, item.y, {
        count: 15,
        colors: ['#ffd700']
    });
    
    // Sound effect
    AudioSystem.play('pickup');
});
```

### 5. Score Update (ScoreManager.js)
```javascript
// ScoreManager listens and adds points
eventManager.on('ITEM_PICKED_UP', ({ itemData }) => {
    if (itemData.points) {
        ScoreManager.addPoints(itemData.points);
    }
});
```

**Result**: Single collision triggers coordinated response across 4 systems without any direct coupling!

## Event Payload Best Practices

### Always Include Source

```javascript
// ✅ GOOD - Includes source entity
eventManager.emit('PLAYER_JUMPED', { player: this });

// ❌ BAD - No context about who jumped
eventManager.emit('PLAYER_JUMPED');
```

### Use Descriptive Keys

```javascript
// ✅ GOOD - Clear what each field means
eventManager.emit('COLLISION_DETECTED', {
    entityA: player,
    entityB: obstacle,
    impactForce: 150,
    position: { x, y }
});

// ❌ BAD - Unclear field names
eventManager.emit('COLLISION_DETECTED', {
    e1: player,
    e2: obstacle,
    val: 150
});
```

### Include All Needed Data

Listeners shouldn't need to query more data:

```javascript
// ✅ GOOD - Everything listener needs
eventManager.emit('ENEMY_KILLED', {
    enemy: this,
    killer: player,
    points: 100,
    position: { x: this.x, y: this.y },
    dropItem: 'health-pack'
});

// ❌ BAD - Listener needs to calculate position
eventManager.emit('ENEMY_KILLED', { enemy: this });
```

### Use Object Destructuring

Makes listener code cleaner:

```javascript
// ✅ GOOD - Destructure in parameter
eventManager.on('ITEM_PICKED_UP', ({ player, itemData, position }) => {
    // Use variables directly
    player.addItem(itemData);
});

// ❌ BAD - Access via data object
eventManager.on('ITEM_PICKED_UP', (data) => {
    data.player.addItem(data.itemData);
});
```

## Debugging Events

### Log All Events

```javascript
// Temporarily add to EventManager.js
emit(eventName, data) {
    if (Config.DEBUG) {
        logger.debug('EventManager', `📢 ${eventName}`, data);
    }
    // ... rest of emit logic
}
```

### Find Event Usage

Use grep to find all emits and listeners:

```bash
# Find all emit calls
grep -r "eventManager.emit" js/

# Find specific event
grep -r "PLAYER_JUMPED" js/
```

### Test Event Flow

In browser console:

```javascript
// Listen to all events
eventManager.on('PLAYER_JUMPED', (data) => {
    console.log('Player jumped!', data);
});

// Manually emit for testing
eventManager.emit('PLAYER_JUMPED', { player: game.player });
```

## Common Mistakes

❌ **Directly calling system methods from entities**
```javascript
// BAD
onCollision(other) {
    ScoreManager.addPoints(100); // Direct coupling!
}

// GOOD
onCollision(other) {
    eventManager.emit('OBSTACLE_DESTROYED', { points: 100 });
}
```

❌ **Forgetting to unsubscribe**
```javascript
// BAD - Memory leak
constructor() {
    eventManager.on('SOMETHING', () => { /* ... */ });
}

// GOOD
constructor() {
    this.handler = this.handler.bind(this);
    eventManager.on('SOMETHING', this.handler);
}

dispose() {
    eventManager.off('SOMETHING', this.handler);
}
```

❌ **Event name typos**
```javascript
// Emit
eventManager.emit('PLAYER_JUMPED');

// Listen (TYPO!)
eventManager.on('PLAYER_JUMPPED', () => { /* Never fires! */ });
```

❌ **Synchronous assumptions**
```javascript
// BAD - Assumes immediate processing
eventManager.emit('LOAD_CONFIG');
console.log(Config.STAGES); // Might not be loaded yet!

// GOOD - Use callback or promise
eventManager.emit('CONFIG_LOADED');
eventManager.on('CONFIG_LOADED', () => {
    console.log(Config.STAGES); // Now it's safe
});
```

## Event Reference

Core events used in this project (see actual code for complete list):

- `GAME_STARTED`, `GAME_OVER`, `GAME_PAUSED`, `GAME_RESUMED`
- `LEVEL_UP`, `LEVEL_LOADED`
- `PLAYER_JUMPED`, `PLAYER_LANDED`, `PLAYER_DAMAGED`
- `LIFE_CHANGED`, `SCORE_CHANGED`, `HIGH_SCORE`
- `ITEM_PICKED_UP`, `ITEM_SPAWNED`
- `ABILITY_APPLIED`, `ABILITY_ACTIVATED`, `ABILITY_EXPIRED`
- `OBSTACLE_DESTROYED`, `OBSTACLE_PASSED`
- `COLLISION_DETECTED`
- `VIEWPORT_RESIZED`
- `UI_UPDATE_REQUIRED`

To discover all events, search codebase for `eventManager.emit(`.

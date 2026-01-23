# Movement and Movement Input Analysis

## Overview

This document analyzes two distinct but interconnected systems in the Unicorn Side Scroll Adventure game:

1. **Movement Input System** - How player inputs are captured, processed, and translated into game actions
2. **Movement System** - The actual physics, mechanics, and implementation of entity movement in the game world

These systems work together to create the player's sense of control and the game's physics-based gameplay experience.

---

## 1. Movement Input System

### 1.1 Architecture

The movement input system is centralized in [InputManager.js](js/systems/InputManager.js), which follows a **unified input abstraction pattern** that handles multiple input sources:

- **Keyboard input** (Space, E, Q, R keys)
- **Touch input** (mobile/tablet)
- **Mouse input** (click interactions)

### 1.2 Input Manager Design

```javascript
class InputManager {
    constructor(target = window)
    init()
    on(actionName, callback)
    triggerAction(name)
    dispose()
}
```

**Key Design Principles:**
- **Action-based abstraction**: Raw input events are mapped to semantic game actions
- **Event delegation**: Single unified handler for multiple input types
- **Resource management**: Proper cleanup via `dispose()` method (follows Enforcement Guide Rule 3)

### 1.3 Input Action Mapping

The system maps raw inputs to the following game actions:

| Input Type | Trigger | Game Action |
|------------|---------|-------------|
| Keyboard | `Space` | `jump` |
| Keyboard | `E` | `useAbility` |
| Keyboard | `Q` | `cycleLeft` |
| Keyboard | `R` | `cycleRight` |
| Touch/Mouse | `touchstart`/`mousedown` | `jump` |

### 1.4 Input Processing Flow

```
User Input (keyboard/touch/mouse)
    ↓
InputManager.init() - Event Listeners
    ↓
keyHandler / interactionHandler
    ↓
InputManager.triggerAction(actionName)
    ↓
Registered Callbacks Executed
    ↓
Game Logic (Player.jump(), Player.useAbility(), etc.)
```

### 1.5 Input Registration Pattern

In [Game.js](js/Game.js#L117-L141), the game registers callbacks for each action:

```javascript
this.input.on('jump', () => {
    if (this.state.current === 'PLAYING') {
        this.player.jump(Config, (x, y, color) => {
            this.particles.play('LAND_DUST', { x, y, color });
        });
    }
});
```

**Key Features:**
- **State gating**: Inputs only processed during `PLAYING` state
- **Callback injection**: Visual feedback (particles) injected via callback pattern
- **Decoupled design**: InputManager doesn't know about game state or player entities

### 1.6 Input System Strengths

1. **Unified API**: Single interface for multiple input devices
2. **Touch-first**: Handles both traditional and mobile inputs
3. **Extensible**: Easy to add new actions via `on()` method
4. **Clean separation**: Input capture separate from game logic
5. **Proper cleanup**: Prevents memory leaks via tracked listeners

### 1.7 Input System Limitations

1. **No analog input**: Only supports binary (pressed/not pressed) actions
2. **No input buffering**: No queue for rapid successive inputs
3. **Limited configurability**: Key bindings are hardcoded
4. **No gamepad support**: Only keyboard, mouse, and touch
5. **Single action per key**: Cannot bind multiple actions to one key

---

## 2. Movement System

### 2.1 Movement Architecture

The movement system consists of multiple interconnected components:

- **Player Movement** ([Player.js](js/entities/Player.js)) - Player-specific physics
- **World Scrolling** ([Game.js](js/Game.js), [LevelSystem.js](js/systems/LevelSystem.js)) - Horizontal game progression
- **Physics Utilities** ([PhysicsUtils.js](js/utils/PhysicsUtils.js)) - Reusable physics functions
- **Entity Movement** ([Entity.js](js/core/Entity.js)) - Base movement capabilities

### 2.2 Player Movement Mechanics

#### 2.2.1 Vertical Movement (Jumping)

The player's vertical movement is governed by a **gravity-based physics system**:

**Jump Execution** ([Player.js](js/entities/Player.js#L278-L285)):
```javascript
jump(config, onJump) {
    if (this.isGrounded) {
        this.vy = config.JUMP_FORCE * this.physicsMod.jumpMultiplier;
        this.isGrounded = false;
        // Visual feedback callback
    }
}
```

**Physics Constants** ([Config.js](js/Config.js#L10-L11)):
- `GRAVITY: 1500` (pixels/second²)
- `JUMP_FORCE: -650` (initial upward velocity)

**Gravity Application** ([Player.js](js/entities/Player.js#L62-L71)):
```javascript
if (!this.isGrounded) {
    const worldGravityMod = context.worldModifiers?.gravityMultiplier || 1.0;
    const frictionMod = context.worldModifiers?.friction || 1.0;
    const floatyEffect = frictionMod < 1 ? frictionMod : 1.0;
    
    const gravity = config.GRAVITY * this.physicsMod.gravityMultiplier 
                    * worldGravityMod * floatyEffect;
    this.vy += gravity * dt;
}
```

#### 2.2.2 Movement Modifiers

The system supports **dynamic physics modification** through multiple layers:

**Modifier Hierarchy:**
1. **Item-based modifiers** (`physicsMod`): Temporary power-ups
   - `gravityMultiplier`: Affects fall speed
   - `jumpMultiplier`: Affects jump height
   
2. **World modifiers** (`worldModifiers`): Stage-based environmental effects
   - `gravityMultiplier`: Stage gravity (0.7 - 1.4)
   - `friction`: Surface properties (0.2 - 1.2)
   - `bounciness`: Ground bounce factor (0 - 0.8)
   - `timeScale`: Global speed modifier (0.7 - 1.4)

**Modifier Application** ([Player.js](js/entities/Player.js#L168-L171)):
```javascript
applyPhysicsModifier(modifier, duration) {
    this.physicsMod = { ...modifier };
    this.physicsModTimer = duration;
}
```

#### 2.2.3 Ground and Platform Detection

**Ground Collision** ([Player.js](js/entities/Player.js#L93-L106)):
- Y-position clamping to ground level
- Bounciness calculation for dynamic surfaces
- Velocity reset on landing

**Platform Collision** ([Player.js](js/entities/Player.js#L134-L149)):
- Semi-solid platforms (can jump through from below)
- Landing detection based on velocity direction
- Support for bouncy platforms

**Walk-off Detection** ([Player.js](js/entities/Player.js#L77-L91)):
- Checks if player is still above a platform
- Automatically sets `isGrounded = false` when falling

### 2.3 Horizontal World Movement

#### 2.3.1 Scrolling System

The game uses a **static player with moving world** approach:

**Player X-Position:**
- Fixed at `x: 80` ([Player.js](js/entities/Player.js#L13))
- Never changes during gameplay
- Creates illusion of forward movement

**World Scrolling:**
- All entities move leftward at `gameSpeed`
- Speed increases with level progression
- Creates sense of continuous forward motion

#### 2.3.2 Game Speed System

**Speed Progression** ([LevelSystem.js](js/systems/LevelSystem.js#L54-L57)):
```javascript
this.gameSpeed = Math.min(
    Config.MAX_GAME_SPEED,  // 1200 px/s
    Config.INITIAL_GAME_SPEED + (this.level - 1) * SPEED_INCREMENT_PER_LEVEL
    // 350 + (level - 1) * 40
);
```

**Speed Constants** ([Config.js](js/Config.js#L13-L14)):
- `INITIAL_GAME_SPEED: 350` (pixels/second)
- `MAX_GAME_SPEED: 1200` (pixels/second)
- `SPEED_INCREMENT_PER_LEVEL: 40` (pixels/second)

**Speed Application:**
- Entities move at `-gameSpeed` horizontally
- Particles account for game speed in their movement
- Environment decorations scroll at `gameSpeed`

#### 2.3.3 Entity Scrolling

**Obstacle Movement** ([Game.js](js/Game.js#L289-L293)):
```javascript
this.obstacleTimer += dt;
if (this.obstacleTimer > this.level.spawnInterval) {
    this.obstacleTimer = 0;
    new Obstacle(this.logicalWidth + 100, ...);
}
```

Entities spawn at right edge (`this.logicalWidth + 100`) and move left via their update methods.

### 2.4 Physics Integration

#### 2.4.1 Delta Time Integration

All movement uses **delta time (dt)** for frame-rate independence:

**Velocity Integration** ([Player.js](js/entities/Player.js#L87)):
```javascript
this.y += this.vy * dt;
```

**Gravity Accumulation** ([Player.js](js/entities/Player.js#L70)):
```javascript
this.vy += gravity * dt;
```

This ensures consistent movement regardless of frame rate.

#### 2.4.2 Physics Utilities

**Standard Integration** ([PhysicsUtils.js](js/utils/PhysicsUtils.js#L50-L55)):
```javascript
static integrate(entity, dt) {
    if (entity.vx) entity.x += entity.vx * dt;
    if (entity.vy) entity.y += entity.vy * dt;
}
```

Provides reusable velocity-based movement for all entities.

### 2.5 Visual Movement Feedback

#### 2.5.1 Rotation During Fall

**Dynamic Rotation** ([Player.js](js/entities/Player.js#L69)):
```javascript
this.rotation = Math.min(Math.PI / 8, this.vy * 0.002);
```

Player tilts forward based on downward velocity, enhancing sense of motion.

#### 2.5.2 Particle Trail

**Trail Generation** ([Game.js](js/Game.js#L283-L288)):
```javascript
this.particleTimer += dt;
if (this.particleTimer > 0.05) {  // 20 times per second
    this.particleTimer = 0;
    this.particles.play('TRAIL', { 
        x: this.player.x, 
        y: this.player.y + 25, 
        color 
    });
}
```

Creates continuous visual feedback of movement.

### 2.6 Stage-Based Movement Modifiers

The game features **three distinct movement profiles** based on stage:

#### 2.6.1 Morning Meadow (Level 1+)
```javascript
{
    gravityMultiplier: 1.0,  // Standard gravity
    friction: 1.0,           // Normal ground
    bounciness: 0            // No bounce
}
```
**Feel:** Standard platforming physics

#### 2.6.2 Twilight Clouds (Level 5+)
```javascript
{
    gravityMultiplier: 0.8,  // Floaty
    friction: 0.5,           // Slippery
    bounciness: 0.3          // Soft bounce
}
```
**Feel:** Lighter, more airborne gameplay

#### 2.6.3 Gravity Void (Level 10+)
```javascript
{
    gravityMultiplier: 1.4,  // Heavy
    friction: 1.2,           // Sticky/slow
    bounciness: 0            // No bounce
}
```
**Feel:** Weighty, challenging movement

### 2.7 Movement System Strengths

1. **Layered physics**: Multiple modifier systems for rich gameplay variety
2. **Data-driven**: Movement parameters in `Config.js` for easy tuning
3. **Frame-rate independent**: Proper delta-time integration
4. **Stage variety**: Environmental modifiers create distinct gameplay feels
5. **Visual feedback**: Rotation, particles, and effects enhance movement perception
6. **Progressive difficulty**: Speed increases naturally with level progression
7. **Flexible**: Supports temporary item-based and permanent stage-based modifiers

### 2.8 Movement System Limitations

1. **No horizontal player control**: Player cannot move left/right (runner genre limitation)
2. **Binary jumping**: No variable jump height based on button hold duration
3. **Simple collision**: AABB-only collision detection
4. **No momentum**: Jump doesn't carry horizontal velocity
5. **Limited air control**: No mid-air movement abilities
6. **Fixed spawn rate**: Obstacles spawn at intervals, not based on player position

---

## 3. System Integration

### 3.1 Input-to-Movement Flow

```
Player presses Space
    ↓
InputManager detects keydown
    ↓
triggerAction('jump') called
    ↓
Game.js callback executes
    ↓
Player.jump() called with Config
    ↓
player.vy = -650 * jumpMultiplier
    ↓
player.isGrounded = false
    ↓
Next frame: Player.update() applies gravity
    ↓
player.y += player.vy * dt
    ↓
Visual feedback: rotation and particles
```

### 3.2 Context Propagation

The game uses a **context object** to pass movement-relevant data through the update chain:

**Context Structure** ([Game.js](js/Game.js#L263-L276)):
```javascript
const context = {
    config: Config,                  // Physics constants
    logicalHeight: LOGICAL_HEIGHT,   // World boundaries
    gameSpeed: this.gameSpeed,       // Scrolling speed
    worldModifiers: this.level.worldModifiers,  // Environmental physics
    platforms: engineRegistry.getByType('platform'),  // Collision data
    registry: engineRegistry,        // Entity access
    particles: this.particles,       // Visual effects
    onObstaclePassed: () => { ... }  // Score callback
};
```

This context flows through:
1. `engineRegistry.updateAll(dt, context)`
2. Each entity's `update(dt, context)` method
3. `CollisionSystem.resolve(registry, particles, context)`

### 3.3 Feedback Loops

The systems create several feedback loops:

1. **Speed → Difficulty**: Higher speed → faster spawns → harder game
2. **Level → Physics**: Higher levels → different stages → modified movement feel
3. **Collision → Feedback**: Hit detection → particles → visual confirmation
4. **Distance → Progression**: More distance → level up → speed increase

---

## 4. Performance Considerations

### 4.1 Input System Performance

- **Minimal overhead**: Simple event delegation
- **No polling**: Event-driven rather than checking every frame
- **Efficient cleanup**: Tracked listeners prevent memory leaks

### 4.2 Movement System Performance

- **Direct property updates**: No complex calculations for player position
- **Cached modifiers**: Physics modifiers calculated once per stage change
- **Efficient collision**: Early rejection via layer masks ([PhysicsUtils.js](js/utils/PhysicsUtils.js#L36-L43))
- **Culling**: Off-screen entities automatically destroyed by registry

---

## 5. Potential Improvements

### 5.1 Input System Enhancements

1. **Input buffering**: Queue inputs to handle frame-perfect timing
2. **Configurable bindings**: Allow players to remap keys
3. **Gamepad support**: Add controller input for better accessibility
4. **Input history**: Track input sequences for combos or analytics
5. **Analog support**: Enable variable jump heights with hold duration

### 5.2 Movement System Enhancements

1. **Variable jump height**: Hold jump for higher jumps
2. **Coyote time**: Brief grace period after walking off platforms
3. **Jump buffering**: Allow jump input slightly before landing
4. **Air control**: Subtle horizontal influence during jumps
5. **Wall interactions**: Wall jump or slide mechanics
6. **Dash ability**: Quick horizontal movement burst
7. **Double jump**: Secondary jump while airborne
8. **Better bounce physics**: More predictable/controllable bounces

---

## 6. Design Philosophy

### 6.1 Input Design Philosophy

- **Accessibility first**: Multiple input methods for different devices
- **Simplicity**: Limited actions keep gameplay focused
- **Immediacy**: Direct mapping from input to action with no delay
- **Safety**: State checks prevent invalid actions

### 6.2 Movement Design Philosophy

- **Feel over realism**: Physics tuned for fun, not accuracy
- **Progressive challenge**: Movement difficulty scales with player skill
- **Environmental variety**: Different stages create fresh experiences
- **Visual clarity**: Strong feedback makes movement feel responsive
- **Data-driven design**: Easy iteration through config files

---

## 7. Technical Summary

### 7.1 Movement Input System

| Aspect | Implementation |
|--------|----------------|
| **Architecture** | Centralized InputManager with action abstraction |
| **Input Sources** | Keyboard, Touch, Mouse |
| **Processing** | Event-driven with callback registration |
| **State Management** | Game state gates input processing |
| **Resource Management** | Explicit cleanup via dispose() |

### 7.2 Movement System

| Aspect | Implementation |
|--------|----------------|
| **Horizontal Movement** | Fixed player, scrolling world at variable speed |
| **Vertical Movement** | Gravity-based jump mechanics with modifiers |
| **Physics Integration** | Delta-time based with multiple modifier layers |
| **Collision** | AABB detection with layer masking |
| **Progression** | Speed and physics change with level/stage |
| **Configuration** | Data-driven via Config.js |

---

## 8. Conclusion

The movement and movement input systems in Unicorn Side Scroll Adventure demonstrate a **well-architected separation of concerns**:

- **Input system** provides a clean, extensible interface for capturing player intent
- **Movement system** implements rich physics with progressive difficulty and environmental variety

The systems work together through a **context-driven architecture** that allows for flexible, data-driven gameplay tuning. The use of modifier layers (item-based and world-based) creates a system where movement feel can dramatically change without code modifications.

Key strengths include:
- Clean separation between input capture and game logic
- Delta-time integration for consistent physics
- Data-driven configuration for easy tuning
- Stage-based variety that keeps gameplay fresh
- Strong visual feedback systems

The architecture supports future expansion through its modifier system, event-driven design, and extensible input mapping, making it a solid foundation for continued development.

---

**Document Version**: 1.0  
**Last Updated**: January 23, 2026  
**Analysis Basis**: Current codebase as of January 2026

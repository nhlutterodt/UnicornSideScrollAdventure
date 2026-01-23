# Architecture Overview

Unicorn Magic Run is built using vanilla HTML5 Canvas and JavaScript. It follows a simple Game Loop architecture.

## Core Components

### 1. Game Loop (`loop()`, `update()`, `draw()`)
The core of the game runs on `requestAnimationFrame`.
-   **`update()`**: Handles logic updates (physics, collision, spawning).
-   **`draw()`**: Renders everything to the `<canvas>`.

### 2. Entities
The game uses a class-based inheritance model for game objects, centered around a base `Entity` class.

-   **Base Entity (`Entity` class)**: Standardizes position (`x`, `y`), dimensions (`width`, `height`), rendering, and lifecycle. All game objects inherit from this.
-   **Player (`Player` class)**: Extends `Entity`. Handles specific physics (gravity, jumping) and unicorn-specific rendering.
-   **Obstacle (`Obstacle` class)**: Extends `Entity`. Manages moving hazards (Cacti, Crystals) and game-speed relative movement.
-   **Cloud (`Cloud` class)**: Extends `Entity`. Background elements for parallax-like effect.
-   **Particle (`Particle` class)**: Extends `Entity`. Short-lived visual effects. Note: Particles typically bypass the central registry to optimize performance for high-volume spawning.

### 3. Systems and Managers
The game logic is distributed across specialized systems to maintain decoupling.
-   **Collision System (`CollisionSystem.js`)**: Resolves interactions between entities using layers and masks.
-   **Ability Manager (`AbilityManager.js`)**: Centralized bridge for item effects. It translates raw item data into target state changes (lives, timers, modifiers).
-   **Effect System (`EffectSystem.js`)**: Coordinates auditory and visual feedback (Particles + Audio).
-   **Particle System (`ParticleSystem.js`)**: High-performance rendering for ephemeral visual effects.

### 4. Registry System
The `Registry` (`js/core/Registry.js`) provides centralized tracking for active entities.
-   **Registration**: Entities automatically register themselves via the `Entity` constructor.
-   **Identification**: Every registered entity receives a unique `id` (e.g., `obstacle_5`).
-   **Cleanup**: Entities provide a `destroy()` method to unregister themselves safely.

### 3. State Management
The game logic is controlled by a `gameState` variable:
-   `START`: Initial screen waiting for user input.
-   `PLAYING`: Main game loop active.
-   `GAMEOVER`: Player hit an obstacle.

### 4. Input Handling
- Listens for `keydown` (Space), `touchstart`, and `mousedown`.
- Input is unified via the `handleInput()` function.

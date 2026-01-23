# Polymorphic Entity Updates

## Overview
The entity system was previously inconsistent, with different entities requiring different parameters for their `update` methods. This blocked uniform processing and forced `Game.js` to manage each entity type manually.

## Resolution
We have standardized the `update` signature across all entities to `update(dt, context)`.

### Implementation Details
- **Base Class**: `Entity.js` now defines `update(dt, context)`.
- **Context Object**: A unified `context` object is passed from the game loop, containing:
  - `config`: Global game configuration.
  - `logicalHeight`: The internal height for physics calculations.
  - `gameSpeed`: The current scroll speed.
  - Optional callbacks like `onObstaclePassed`.

### Benefits
- Entities can be updated in a single loop regardless of their type.
- Future entities can be added without modifying the core update loop in `Game.js`.
- Clean separation between game state (context) and entity logic.

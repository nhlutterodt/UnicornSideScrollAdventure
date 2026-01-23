# Registry Lifecycle Management

## Overview
Previously, `Game.js` manually managed arrays for obstacles, clouds, and particles. This led to redundant code for updating, drawing, and splicing arrays to remove offscreen objects.

## Resolution
The `Registry` has been enhanced to act as a central manager for all entities, handling their lifecycle and bulk operations.

### Implementation Details
- **Bulk Updates**: `Registry.updateAll(dt, context)` iterates through all entities, calls their update methods, and automatically removes those that are `isOffscreen` or `isDead`.
- **Bulk Drawing**: `Registry.drawAll(ctx)` handles drawing (though grouped drawing is still used in `Game.js` to maintain layering).
- **Type Filtering**: `Registry.getByType(type)` allows systems (like collision detection) to access specific subsets of entities efficiently.

### Benefits
- Eliminated manual `splice()` calls and array management in `Game.js`.
- Single source of truth for all active game objects.
- Standardized lifecycle hooks (like automatic pruning).

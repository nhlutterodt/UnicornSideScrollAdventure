# Decoupled Entity Construction

## Overview
Entities like `Obstacle` and `Cloud` previously required knowledge of the canvas dimensions and ground height inside their constructors. This coupled them to the visual environment and made them harder to test or reuse.

## Resolution
We refactored entity constructors to accept pure positional data (`x, y`), moving the "intelligence" of where to spawn entities into the spawning systems.

### Implementation Details
- **Obstacle**: Now takes `(x, y)` and calculates its height-adjusted position internally.
- **Cloud**: Now takes `(x, y)` directly.
- **Item**: (Replaced PowerUp) Takes `(x, y)` and `itemData`. Logic is delegated to `AbilityManager`.
- **Spawning Logic**: Centralized in `Game.js` update loop, utilizing `LevelUtils` for position and type calculations.

### Benefits
- Entities are now pure data-driven objects.
- Spawning logic is centralized in the game loop or specialized systems.
- Better support for different logical resolutions and screen sizes.
- **Improved Maintainability**: Adding a new item type doesn't require editing the Player or the Item classes, only `Config.js` and `AbilityManager.js`.

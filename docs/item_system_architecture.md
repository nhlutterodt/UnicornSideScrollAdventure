# Item and Ability System Architecture

## Overview
The system is designed to be highly extensible and strictly decoupled. It allows for any entity (primarily the Player) to be affected by configurable "Items" without the Item or the Player knowing the implementation details of each effect.

## Core Components

### 1. Item Configuration (`js/Config.js`)
Items are defined as raw data objects in `Config.ITEMS`.
- `type`: Maps to a handler in `AbilityManager`.
- `id`: Unique identifier.
- `...data`: Custom properties (duration, radius, multiplier, etc.) passed to the handler.

### 2. Item Entity (`js/entities/Item.js`)
A generic visual representation of a collectable.
- **Responsibility**: Physics, rendering (bobbing animation), and collision detection.
- **Independence**: It does NOT know what it does on collection. It simply passes its `itemData` to the `AbilityManager`.

### 3. Ability Manager (`js/systems/AbilityManager.js`)
The "Brain" of the collection phase.
- **Static Pattern**: Uses a static `apply(target, itemData)` method.
- **Registry of Handlers**: Maps `ITEM_TYPES` to private handler methods.
- **Logic**: Reads the item data and calls simple interface methods on the target (e.g., `target.lives++` or `target.applyPhysicsModifier()`).

### 4. Player Entity (`js/entities/Player.js`)
A state-only container for power-ups.
- **Interfaces**: Provides simple "setters" or "incrementers" for external systems.
- **No Switching**: Does not contain a switch statement for item types. If a new item type is added, the Player remains untouched unless a new state variable is required.

## Workflow: Adding a New Item Concept

1. **Define in Config**: Add the new item to `Config.ITEMS` with a new `type` (e.g., `TELEPORT`).
2. **Add Handler**: Add `_handleTeleport` to `AbilityManager.js` and map it in the `handlers` object.
3. **Target Interface**: Ensure the `Player` (or target) has a method to support the new state (e.g., `player.teleportTo(x, y)`).

## Strict Enforcement
- **DO NOT** add `if (item.type === x)` blocks to `Player.js`.
- **DO NOT** add effect logic (like particle triggers for pickup) to `Item.js`.
- **DO NOT** instantiate items with direct effect logic; always use the `itemData` structure.

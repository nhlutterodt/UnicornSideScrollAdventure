# Item and Ability System Architecture

## Overview

The system is designed to be highly extensible and strictly decoupled. It allows for any entity (primarily the Player) to be affected by configurable "Items" without the Item or the Player knowing the implementation details of each effect. The pieces are connected through the global event bus rather than direct references, so none of them hold a reference to any of the others.

## Core Components

### 1. Item Configuration (`js/config/items.json`, `js/config/abilities.json`)

Items and abilities are defined as data in external JSON files, loaded at startup by `Config.loadExternalConfig()` and exposed as `Config.ITEMS` / `Config.ABILITIES` (`Config.js` also holds a small hardcoded fallback used only if the fetch fails). See [Configuration JSON Schemas](config_json_schemas.md) for the full field reference.

- `type`: Maps to a handler in `AbilityManager`.
- `id`: Unique identifier.
- `...data`: Custom properties (duration, radius, multiplier, etc.) passed to the handler.

### 2. Item Entity (`js/entities/Item.js`)

A generic visual representation of a collectable.

- **Responsibility**: Physics, rendering (bobbing animation), and collision detection.
- **Independence**: It does NOT know what it does on collection. On collision it emits an `ITEM_PICKED_UP` event on the global `eventManager` bus, carrying its `itemData` — it never calls `AbilityManager` directly.

### 3. Ability Manager (`js/systems/AbilityManager.js`)

The "Brain" of the collection phase.

- **Event-driven, not directly coupled**: `AbilityManager.init()` subscribes to `ITEM_PICKED_UP` on `eventManager`; it is never called directly by `Item` or `Player`.
- **Instance method, not static**: `apply(target, itemData, context = {})` is a regular instance method (bound to the manager's own `game`/`target` references), invoked internally when the subscribed event fires.
- **Registry of Handlers**: Maps `ITEM_TYPES` to private handler methods.
- **Logic**: Reads the item data and calls simple interface methods on the target (e.g., `target.lives++` or `target.applyPhysicsModifier()`).

### 4. Player Entity (`js/entities/Player.js`)

A state-only container for power-ups.

- **Interfaces**: Provides simple "setters" or "incrementers" for external systems.
- **No Switching**: Does not contain a switch statement for item types. If a new item type is added, the Player remains untouched unless a new state variable is required.
- Player collisions also emit `ITEM_PICKED_UP` for player-side pickup detection, following the same event-driven path into `AbilityManager` rather than calling it directly.

## Workflow: Adding a New Item Concept

1. **Define in Config**: Add the new item to `js/config/items.json` with a new `type` (e.g., `TELEPORT`).
2. **Add Handler**: Add `_handleTeleport` to `AbilityManager.js` and map it in the `handlers` object.
3. **Target Interface**: Ensure the `Player` (or target) has a method to support the new state (e.g., `player.teleportTo(x, y)`).

## Strict Enforcement

- **DO NOT** add `if (item.type === x)` blocks to `Player.js`.
- **DO NOT** add effect logic (like particle triggers for pickup) to `Item.js`.
- **DO NOT** instantiate items with direct effect logic; always use the `itemData` structure.
- **DO NOT** have `Item` or `Player` call `AbilityManager` methods directly — always go through the `ITEM_PICKED_UP` event on `eventManager`.

'use strict';

/**
 * Spawner - Base class for modular spawning subsystems.
 */
export class Spawner {
    constructor() {
        this.timer = 0;
    }

    /**
     * Update loop to tick the spawner timer and trigger spawning.
     * @param {number} dt - Gameplay delta time
     * @param {ViewportManager} viewport - Viewport for dimension details
     * @param {LevelSystem} level - LevelSystem for active stage and speed
     * @param {number} spawnX - Coordinate just offscreen to spawn entities
     * @param {Object} context - Common context parameters (particles, player)
     */
    update(dt, viewport, level, spawnX, context) {
        // Subclasses must implement
    }

    /**
     * Reset spawner timer state.
     */
    reset() {
        this.timer = 0;
    }
}

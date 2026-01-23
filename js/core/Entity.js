import { engineRegistry } from './Registry.js';

/**
 * ENTITY.js
 * Base class for all game objects.
 * Standardizes position, dimensions, and registration.
 */
export class Entity {
    /**
     * @param {number} x - Horizontal position
     * @param {number} y - Vertical position
     * @param {number} width - Entity width
     * @param {number} height - Entity height
     * @param {string} type - Entity type for registry
     */
    constructor(x, y, width, height, type = 'entity') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.entityType = type;
        this.isDead = false;
        
        if (this.shouldRegister()) {
            engineRegistry.register(this, this.entityType);
        }
    }

    /**
     * Determines if the entity should be automatically registered.
     * @returns {boolean}
     */
    shouldRegister() {
        return true;
    }

    /**
     * Update logic to be implemented by child classes.
     * @param {number} dt - Delta time
     * @param {Object} context - Game context (speed, config, dimensions, etc.)
     */
    update(dt, context) {
        // Override in subclasses
    }

    /**
     * Draw logic to be implemented by child classes.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        // Override in subclasses
    }

    /**
     * Generic offscreen check.
     * @returns {boolean}
     */
    get isOffscreen() {
        return (this.x + this.width < -200) || (this.x > 2000); // Buffer for safety
    }

    /**
     * Cleanup for the entity.
     */
    destroy() {
        engineRegistry.unregister(this);
    }
}

import { engineRegistry } from './Registry.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * ENTITY.js
 * Base class for all game objects.
 * Standardizes position, dimensions, and registration.
 */
export class Entity {
    // Opt-in flag for EntityPool. Subclasses that implement `revive()` set this
    // to true; everything else is created/GC'd normally.
    static poolable = false;

    /**
     * @param {number} x - Horizontal position
     * @param {number} y - Vertical position
     * @param {number} width - Entity width
     * @param {number} height - Entity height
     * @param {string} type - Entity type for registry
     */
    constructor(x, y, width, height, type = 'entity') {
        this.entityType = type;
        this.reviveBase(x, y, width, height);
    }

    /**
     * Determines if the entity should be automatically registered.
     * @returns {boolean}
     */
    shouldRegister() {
        return true;
    }

    /**
     * Resets the Entity-base fields (position, dims, lifecycle, collision) and
     * re-registers with the Registry. Called by the constructor on first creation,
     * and by poolable subclasses' `revive()` when reused from the EntityPool -
     * subclasses must not re-run this via `super()` on reuse, since the instance
     * already exists and just needs its state reset.
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    reviveBase(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDead = false;

        // Collision Setup - subclasses re-apply their real layer/mask right after this
        this.collisionLayer = CollisionLayers.NONE;
        this.collisionMask = CollisionLayers.NONE;
        this.collisionPadding = 0;

        if (this.shouldRegister()) {
            engineRegistry.register(this, this.entityType);
        }
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
     * Lifecycle hook for collision events.
     * @param {Entity} other 
     * @param {ParticleSystem} particles 
     * @param {Object} context 
     */
    onCollision(other, particles, context) {
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
        this.isDead = true;
        engineRegistry.unregister(this);
    }
}

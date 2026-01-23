/**
 * PHYSICS_UTILS.js
 * Stateless physics and collision helpers.
 */

export const CollisionLayers = {
    NONE: 0,
    PLAYER: 1 << 0,
    OBSTACLE: 1 << 1,
    PLATFORM: 1 << 2,
    PARTICLE: 1 << 3,
    POWERUP: 1 << 4,
    ALL: 0xFFFFFFFF
};

export class PhysicsUtils {
    /**
     * Checks if two AABB (Axis-Aligned Bounding Box) entities collide.
     * Assumes entities have x, y, width, and height.
     * @param {Object} a 
     * @param {Object} b 
     * @param {number} padding - Optional padding to shrink hitboxes (make game easier)
     * @returns {boolean}
     */
    static checkCollision(a, b, padding = 0) {
        return (
            a.x < b.x + b.width - padding &&
            a.x + a.width - padding > b.x &&
            a.y < b.y + b.height - padding &&
            a.y + a.height - padding > b.y
        );
    }

    /**
     * Checks if two entities should collide based on their layers and masks.
     * @param {Entity} a 
     * @param {Entity} b 
     * @returns {boolean}
     */
    static shouldCollide(a, b) {
        if (!a.collisionLayer || !b.collisionLayer) return false;
        
        const aCanHitB = (a.collisionMask & b.collisionLayer) !== 0;
        const bCanHitA = (b.collisionMask & a.collisionLayer) !== 0;
        
        return aCanHitB || bCanHitA;
    }

    /**
     * Standard integration for basic velocity-based movement.
     * @param {Object} entity 
     * @param {number} dt - Delta time in seconds
     */
    static integrate(entity, dt) {
        if (entity.vx) entity.x += entity.vx * dt;
        if (entity.vy) entity.y += entity.vy * dt;
    }
}

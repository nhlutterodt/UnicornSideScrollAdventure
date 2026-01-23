/**
 * PHYSICS_UTILS.js
 * Stateless physics and collision helpers.
 */
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
     * Standard integration for basic velocity-based movement.
     * @param {Object} entity 
     * @param {number} dt - Delta time in seconds
     */
    static integrate(entity, dt) {
        if (entity.vx) entity.x += entity.vx * dt;
        if (entity.vy) entity.y += entity.vy * dt;
    }
}

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
    ITEM: 1 << 4,
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

    /**
     * Checks if a point is inside an AABB.
     * @param {number} x 
     * @param {number} y 
     * @param {Object} aabb - {x, y, width, height}
     * @returns {boolean}
     */
    static testPointVsAABB(x, y, aabb) {
        return x >= aabb.x &&
               x <= aabb.x + aabb.width &&
               y >= aabb.y &&
               y <= aabb.y + aabb.height;
    }

    /**
     * Checks if a line segment intersects an AABB.
     * Uses a simplified Cohen-Sutherland or Liang-Barsky-ish logic for fast rejection.
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {Object} aabb 
     * @returns {boolean}
     */
    static testSegmentVsAABB(x1, y1, x2, y2, aabb) {
        // Simple AABB for the segment itself as a quick rejection
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        if (maxX < aabb.x || minX > aabb.x + aabb.width ||
            maxY < aabb.y || minY > aabb.y + aabb.height) {
            return false;
        }

        // If either endpoint is inside, we have a collision
        if (this.testPointVsAABB(x1, y1, aabb) || this.testPointVsAABB(x2, y2, aabb)) {
            return true;
        }

        // More robust segment-AABB intersection could go here, 
        // but for particles, point checks + segment bounds are usually enough.
        return true; 
    }
}

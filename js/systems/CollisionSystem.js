import { PhysicsUtils } from '../utils/PhysicsUtils.js';

/**
 * COLLISION_SYSTEM.js
 * Centralized resolution of entity interactions.
 */
export class CollisionSystem {
    /**
     * Resolves collisions between all registered entities based on their layers/masks.
     * @param {Registry} registry 
     */
    static resolve(registry) {
        const entities = Array.from(registry.entities.values());
        
        // Quad-tree or spatial grid could be added here later for performance if needed.
        // For now, a simple nested loop is sufficient for a side-scroller.
        for (let i = 0; i < entities.length; i++) {
            const a = entities[i];
            
            // Skip entities that don't collide with anything
            if (!a.collisionLayer || a.isDead) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const b = entities[j];

                if (!b.collisionLayer || b.isDead) continue;

                // Check if they are configured to collide with each other
                if (PhysicsUtils.shouldCollide(a, b)) {
                    // Use the largest padding for the check
                    const padding = Math.max(a.collisionPadding || 0, b.collisionPadding || 0);
                    
                    if (PhysicsUtils.checkCollision(a, b, padding)) {
                        a.onCollision(b);
                        b.onCollision(a);
                    }
                }
            }
        }
    }
}

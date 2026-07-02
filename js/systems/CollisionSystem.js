import { PhysicsUtils } from '../utils/PhysicsUtils.js';
import { Config } from '../Config.js';
import { logger } from '../utils/Logger.js';

/**
 * COLLISION_SYSTEM.js
 * Centralized resolution of entity interactions.
 */
export class CollisionSystem {
    // Edge-triggered: flips true on the frame the budget is first exceeded so
    // `_checkBudget` logs once per overage instead of once per frame, and
    // resets once the count drops back under budget.
    static _overBudget = false;

    /**
     * Resolves collisions between all registered entities based on their layers/masks.
     * @param {Registry} registry
     * @param {ParticleSystem} particles
     * @param {Object} context
     */
    static resolve(registry, particles, context = {}) {
        const entities = Array.from(registry.entities.values());

        CollisionSystem._checkBudget(entities.length);

        // Quad-tree or spatial grid could be added here later for performance if needed.
        // For now, a simple nested loop is sufficient for a side-scroller, up to
        // the documented ceiling in Config.COLLISION_SYSTEM.MAX_ENTITIES.
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
                        if (a.onCollision) a.onCollision(b, particles, context);
                        if (b.onCollision) b.onCollision(a, particles, context);
                    }
                }
            }
        }
    }

    /**
     * Dev-time guard on the O(n^2) collision cost: warns once when the live
     * entity count crosses Config.COLLISION_SYSTEM.MAX_ENTITIES, and again if
     * it drops back under the budget and re-crosses later. Never warns every
     * frame while sustained over budget - that would just be console spam.
     * @private
     * @param {number} count
     */
    static _checkBudget(count) {
        const budget = Config.COLLISION_SYSTEM.MAX_ENTITIES;

        if (count > budget) {
            if (!CollisionSystem._overBudget) {
                CollisionSystem._overBudget = true;
                logger.warn(
                    'CollisionSystem',
                    `Live entity count ${count} exceeds the O(n^2) collision budget (${budget}). ` +
                    'Check for a spawn/despawn leak; see Config.COLLISION_SYSTEM.MAX_ENTITIES for the spatial-grid option.'
                );
            }
        } else {
            CollisionSystem._overBudget = false;
        }
    }
}

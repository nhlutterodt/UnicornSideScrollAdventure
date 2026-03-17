'use strict';

import { AudioSystem } from './AudioSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Config } from '../Config.js';
import { LaserEntity } from '../entities/LaserEntity.js';
import { engineRegistry } from '../core/Registry.js';

/**
 * EFFECT_SYSTEM.js
 * High-level coordinator for all game feedback (Audio + Visual).
 * Decouples the "Intent" of an effect from the "Implementation" (Particles/Sound/Entities).
 */
export class EffectSystem {
    /**
     * @param {ParticleSystem} particleSystem 
     */
    constructor(particleSystem) {
        this.particles = particleSystem || new ParticleSystem();
        this.audio = new AudioSystem();
    }

    /**
     * Trigger a discrete one-shot effect or spawn a complex visual entity.
     * @param {string} effectId 
     * @param {Object} params - { x, y, color, vx, vy, etc }
     */
    trigger(effectId, params = {}) {
        // 1. Play Audio
        this.audio.play(effectId, params);

        // 2. Play Particles (if defined in Data-Driven effects config)
        if (Config.EFFECTS && Config.EFFECTS[effectId]) {
            this.particles.play(effectId, params);
        }
        
        // 3. Spawn Complex Visual Entities if applicable
        if (effectId === 'LASER') {
            const laser = new LaserEntity(params.source, params.color, params.duration);
            // new Entity() naturally registers itself, so we just instantiate it
        } else if (effectId === 'ROAR') {
            this.handleRoarImpact(params);
        }
    }

    /**
     * Handles the logic of the roar (radius-based impact).
     */
    handleRoarImpact(params) {
        const { x, y, radius, registry } = params;
        if (!registry) return;

        // Get all obstacles
        const obstacles = registry.getByType('obstacle');
        obstacles.forEach(obstacle => {
            const dx = (obstacle.x + obstacle.width / 2) - x;
            const dy = (obstacle.y + obstacle.height / 2) - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (radius || 200)) {
                // Apply "Force" to obstacle
                if (obstacle.applyForce) {
                    obstacle.applyForce(dx / distance * 500, dy / distance * 500);
                } else {
                    // Default fallback: kill it
                    obstacle.destroy();
                }
                
                // Secondary visual on target
                this.particles.play('IMPACT_SPARK', { 
                    x: obstacle.x + obstacle.width / 2, 
                    y: obstacle.y + obstacle.height / 2 
                });
            }
        });
    }

    /**
     * Updates continuous effects (now handled by ECS registry, kept for API compatibility).
     */
    update(dt, context) {
        // No-op: Complex effects are now VisualEntities in the Registry
    }

    /**
     * Draws continuous effects (now handled by ECS registry, kept for API compatibility).
     */
    draw(ctx) {
        // No-op: Complex effects are now VisualEntities in the Registry
    }

    /**
     * Mandatory cleanup.
     */
    dispose() {
        this.audio.dispose();
    }
}



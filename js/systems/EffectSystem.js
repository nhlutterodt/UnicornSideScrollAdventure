'use strict';

import { AudioSystem } from './AudioSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Config } from '../Config.js';

/**
 * EFFECT_SYSTEM.js
 * High-level coordinator for all game feedback (Audio + Visual).
 * Decouples the "Intent" of an effect from the "Implementation" (Particles/Sound).
 */
export class EffectSystem {
    /**
     * @param {ParticleSystem} particleSystem 
     */
    constructor(particleSystem) {
        this.particles = particleSystem || new ParticleSystem();
        this.audio = new AudioSystem();
        
        // Active "Continuous" effects (like beams)
        this.activeEffects = [];
    }

    /**
     * Trigger a discrete one-shot effect.
     * @param {string} effectId 
     * @param {Object} params - { x, y, color, vx, vy, etc }
     */
    trigger(effectId, params = {}) {
        // 1. Play Audio
        this.audio.play(effectId, params);

        // 2. Play Particles (if defined in ParticleSystem config)
        if (Config.PARTICLE_SYSTEM.EFFECTS[effectId]) {
            this.particles.play(effectId, params);
        }
        
        // Special case logic for specific engine-wide effects
        if (effectId === 'ROAR') {
            this.handleRoarImpact(params);
        }
    }

    /**
     * Add a continuous effect that persists for multiple frames.
     * @param {Effect} effect 
     */
    addContinuousEffect(effect) {
        this.activeEffects.push(effect);
    }

    /**
     * Updates all continuous effects.
     */
    update(dt, context) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.update(dt, context);
            
            if (effect.isFinished) {
                this.activeEffects.splice(i, 1);
            }
        }
    }

    /**
     * Renders all continuous effects.
     */
    draw(ctx) {
        this.activeEffects.forEach(effect => effect.draw(ctx));
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
     * Mandatory cleanup.
     */
    dispose() {
        this.audio.dispose();
        this.activeEffects = [];
    }
}

/**
 * BASE CONTINUOUS EFFECT
 */
export class ContinuousEffect {
    constructor(duration) {
        this.elapsed = 0;
        this.duration = duration;
        this.isFinished = false;
    }

    update(dt) {
        this.elapsed += dt;
        if (this.elapsed >= this.duration) {
            this.isFinished = true;
        }
    }

    draw(ctx) {}
}

/**
 * BEAM EFFECT (Laser)
 */
export class BeamEffect extends ContinuousEffect {
    constructor(source, color, duration = 0.2) {
        super(duration);
        this.source = source; // Object with x, y
        this.color = color;
        this.targetsHit = new Set();
    }

    update(dt, context) {
        super.update(dt);
        if (this.isFinished) return;

        const { registry, particles } = context;
        if (!registry) return;

        // Laser Collision Logic
        // In a side-scroller, eye lasers typically go right.
        const laserX = this.source.x + this.source.width;
        const laserY = this.source.y + 15; // Eye height
        const laserLength = 800;
        
        const obstacles = registry.getByType('obstacle');
        obstacles.forEach(obstacle => {
            if (this.targetsHit.has(obstacle.id)) return;

            // Simple line-rect intersection (simplified for side-scroller: horizontal beam)
            if (laserY > obstacle.y && laserY < obstacle.y + obstacle.height &&
                laserX < obstacle.x + obstacle.width && (laserX + laserLength) > obstacle.x) {
                
                this.targetsHit.add(obstacle.id);
                obstacle.destroy();
                
                // Visual feedback on target
                if (particles) {
                    particles.play('IMPACT_SPARK', { 
                        x: obstacle.x, 
                        y: laserY,
                        color: this.color
                    });
                }
            }
        });
    }

    draw(ctx) {
        const alpha = 1 - (this.elapsed / this.duration);
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        const startX = this.source.x + this.source.width - 10;
        const startY = this.source.y + 15;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 1000, startY);
        ctx.stroke();

        // Inner white beam
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 1000, startY);
        ctx.stroke();

        ctx.restore();
    }
}

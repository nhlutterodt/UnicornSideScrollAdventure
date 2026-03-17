'use strict';

import { VisualEntity } from './VisualEntity.js';

/**
 * LASER_ENTITY.js
 * A complex continuous beam effect converted to an ECS entity.
 */
export class LaserEntity extends VisualEntity {
    /**
     * @param {Entity} source - The entity firing the beam
     * @param {string} color - The hex color of the beam
     * @param {number} duration - Duration of the beam
     */
    constructor(source, color, duration = 0.2) {
        super(source.x + source.width, source.y + 15, 1000, 10, duration);
        this.source = source;
        this.color = color;
        this.targetsHit = new Set();
        
        // We override entityType for easier filtering if needed
        this.entityType = 'laser_beam';
    }

    update(dt, context) {
        super.update(dt, context);
        if (this.isDead) return;

        // Keep the laser anchored to the source
        this.x = this.source.x + this.source.width;
        this.y = this.source.y + 15;

        const { registry, particles } = context;
        if (!registry) return;

        // Laser Collision Logic
        const laserX = this.x;
        const laserY = this.y;
        const laserLength = this.width;
        
        const obstacles = registry.getByType('obstacle');
        obstacles.forEach(obstacle => {
            if (this.targetsHit.has(obstacle.id)) return;

            // Simple line-rect intersection
            if (laserY > obstacle.y && laserY < obstacle.y + obstacle.height &&
                laserX < obstacle.x + obstacle.width && (laserX + laserLength) > obstacle.x) {
                
                this.targetsHit.add(obstacle.id);
                obstacle.destroy();
                
                // Visual feedback on target via the EffectSystem/Particles
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

        const startX = this.x - 10;
        const startY = this.y;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + this.width, startY);
        ctx.stroke();

        // Inner white beam
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + this.width, startY);
        ctx.stroke();

        ctx.restore();
    }
}

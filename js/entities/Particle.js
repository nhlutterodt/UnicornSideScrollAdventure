import { Entity } from '../core/Entity.js';

/**
 * PARTICLE.js
 * Canvas-based particle for magic trails.
 */
export class Particle extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {string} color 
     * @param {number} gameSpeed 
     */
    constructor(x, y, color, gameSpeed) {
        const size = Math.random() * 8 + 2;
        super(x, y, size, size, 'particle');
        
        this.size = size;
        // Scale speeds to px/s (approx 60x the previous frame-based values)
        this.speedX = (Math.random() - 0.5) * 180 - gameSpeed * 0.5;
        this.speedY = (Math.random() - 0.5) * 180;
        this.color = color;
        this.life = 1.0;
    }

    update(dt, context) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
        this.life -= 1.2 * dt;
        this.isDead = this.life <= 0;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

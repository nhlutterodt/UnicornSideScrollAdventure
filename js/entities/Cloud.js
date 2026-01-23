import { Entity } from '../core/Entity.js';

/**
 * CLOUD.js
 * Background elements for the game world.
 */
export class Cloud extends Entity {
    constructor(canvasWidth, canvasHeight) {
        const x = canvasWidth + Math.random() * 200;
        const y = Math.random() * (canvasHeight - 150);
        const size = Math.random() * 0.5 + 0.5;
        const width = size * 60; // Approximate width based on font size
        const height = size * 60; // Approximate height

        super(x, y, width, height, 'cloud');
        
        this.speed = (Math.random() * 1 + 0.5) * 60; // Scale for time-based (approx 30-90 px/s)
        this.size = size;
    }

    update(dt) {
        this.x -= this.speed * dt;
    }

    draw(ctx) {
        ctx.font = `${this.size * 60}px serif`;
        ctx.fillText('☁️', this.x, this.y);
    }

    get isOffscreen() {
        return this.x < -100;
    }
}

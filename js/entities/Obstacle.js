import { Entity } from '../core/Entity.js';

/**
 * OBSTACLE.js
 * Hazards the player must jump over.
 */
export class Obstacle extends Entity {
    constructor(canvasWidth, canvasHeight, groundHeight) {
        const width = 40;
        const height = 40 + Math.random() * 20;
        const x = canvasWidth + 100;
        const y = canvasHeight - groundHeight - height;
        
        super(x, y, width, height, 'obstacle');
        this.type = Math.random() > 0.5 ? '💎' : '🌵';
    }

    update(dt, gameSpeed, canvasHeight, groundHeight) {
        this.x -= gameSpeed * dt;
        this.y = canvasHeight - groundHeight - this.height;
    }

    draw(ctx) {
        ctx.font = '40px serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.type, this.x, this.y + this.height);
    }

    get isOffscreen() {
        return this.x + this.width < 0;
    }
}

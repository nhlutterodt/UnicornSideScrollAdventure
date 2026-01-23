import { Entity } from '../core/Entity.js';

/**
 * OBSTACLE.js
 * Hazards the player must jump over.
 */
export class Obstacle extends Entity {
    constructor(x, y) {
        const width = 40;
        const height = 40 + Math.random() * 20;
        
        super(x, y - height, width, height, 'obstacle');
        this.type = Math.random() > 0.5 ? '💎' : '🌵';
    }

    update(dt, context) {
        const { gameSpeed, logicalHeight, config, onObstaclePassed } = context;
        const oldX = this.x;
        this.x -= gameSpeed * dt;
        this.y = logicalHeight - config.GROUND_HEIGHT - this.height;

        // Check if passed player (player is at x=80)
        if (oldX >= 80 && this.x < 80 && !this.passed) {
            this.passed = true;
            if (onObstaclePassed) onObstaclePassed();
        }
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

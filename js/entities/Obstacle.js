import { Hazard } from './Hazard.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';

/**
 * OBSTACLE.js
 * Hazards the player must jump over. Extends Hazard.
 */
export class Obstacle extends Hazard {
    static poolable = true;

    constructor(x, y, width, height, yOffset = 0) {
        const rolled = Obstacle._rollDims();
        const finalW = width || rolled.width;
        const finalH = height || rolled.height;
        super(x, y - finalH, finalW, finalH, 'obstacle', yOffset);
        this._configure(yOffset);
    }

    /**
     * Called by EntityPool when reusing a freed instance instead of `new`-ing one.
     */
    revive(x, y, width, height, yOffset = 0) {
        const rolled = Obstacle._rollDims();
        const finalW = width || rolled.width;
        const finalH = height || rolled.height;
        this.reviveBase(x, y - finalH, finalW, finalH);
        this._configureHazard(yOffset);
        this._configure(yOffset);
    }

    static _rollDims() {
        return { width: 40, height: 40 + Math.random() * 20 };
    }

    _configure(yOffset = 0) {
        this.type = Math.random() > 0.5 ? '💎' : '🌵';
    }

    update(dt, context) {
        const { gameSpeed, logicalHeight, config, onObstaclePassed } = context;
        const oldX = this.x;

        if (this.isFlung) {
            // Apply gravity and update position
            this.vy += config.GRAVITY * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.rotation += this.rotationSpeed * dt;
        } else {
            this.x -= gameSpeed * dt;
            this.y = logicalHeight - config.GROUND_HEIGHT - this.height + (this.yOffset || 0);

            // Check if passed player (player is at x=80)
            if (oldX >= 80 && this.x < 80 && !this.passed) {
                this.passed = true;
                eventManager.emit('OBSTACLE_PASSED', { obstacle: this });
                if (onObstaclePassed) onObstaclePassed();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Translate to center, rotate, translate back for clean spin around center
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.rotation) ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);

        ctx.font = '40px serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.type, 0, this.height);
        
        ctx.restore();
    }

    get isOffscreen() {
        // Allow more buffer when flung high/low
        return this.isFlung 
            ? (this.x + this.width < -200 || this.x > 2000 || this.y > 1000)
            : (this.x + this.width < 0);
    }
}

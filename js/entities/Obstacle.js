import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * OBSTACLE.js
 * Hazards the player must jump over.
 */
export class Obstacle extends Entity {
    static poolable = true;

    constructor(x, y) {
        const { width, height } = Obstacle._rollDims();
        super(x, y - height, width, height, 'obstacle');
        this._configure();
    }

    /**
     * Called by EntityPool when reusing a freed instance instead of `new`-ing one.
     */
    revive(x, y) {
        const { width, height } = Obstacle._rollDims();
        this.reviveBase(x, y - height, width, height);
        this._configure();
    }

    static _rollDims() {
        return { width: 40, height: 40 + Math.random() * 20 };
    }

    _configure() {
        this.type = Math.random() > 0.5 ? '💎' : '🌵';

        // Collision Setup
        this.collisionLayer = CollisionLayers.OBSTACLE;
        this.collisionMask = CollisionLayers.PLAYER;

        this.renderLayer = 2; // Z_LAYERS.ENTITIES
        this.passed = false;
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
        ctx.save();
        ctx.font = '40px serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this.type, this.x, this.y + this.height);
        ctx.restore();
    }

    get isOffscreen() {
        return this.x + this.width < 0;
    }
}

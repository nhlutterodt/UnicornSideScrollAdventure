import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';

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

        // Physics/Flung state for abilities (e.g. Sonic Roar applyForce)
        this.vx = 0;
        this.vy = 0;
        this.isFlung = false;
        this.rotation = 0;
        this.rotationSpeed = 0;
    }

    applyForce(fx, fy) {
        this.isFlung = true;
        this.vx = fx;
        this.vy = fy;
        this.rotationSpeed = (Math.random() - 0.5) * 8;
        
        // Disable collision once flung
        this.collisionLayer = CollisionLayers.NONE;
        this.collisionMask = CollisionLayers.NONE;
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
            this.y = logicalHeight - config.GROUND_HEIGHT - this.height;

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

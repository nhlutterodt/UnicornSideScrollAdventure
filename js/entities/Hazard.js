import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';

/**
 * HAZARD.js
 * Base class for specific environmental dangers. Replaces generic Obstacles.
 */
export class Hazard extends Entity {
    static poolable = true;

    constructor(x, y, width, height, type = 'hazard', yOffset = 0) {
        super(x, y, width, height, type);
        this._configureHazard(yOffset);
    }

    /**
     * Shared Hazard-level field reset. Subclasses call this from their own
     * `revive()` (which bypasses this constructor entirely) alongside
     * `reviveBase()` and any of their own extra state.
     */
    _configureHazard(yOffset = 0) {
        this.collisionLayer = CollisionLayers.OBSTACLE;
        this.collisionMask = CollisionLayers.PLAYER;

        this.renderLayer = 2; // Z_LAYERS.ENTITIES
        this.passed = false;

        // Physics/Flung state for abilities
        this.vx = 0;
        this.vy = 0;
        this.isFlung = false;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.yOffset = yOffset;
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
            
            // Snap to ground + yOffset
            this.y = logicalHeight - config.GROUND_HEIGHT - this.height + (this.yOffset || 0);

            // Score mechanism (player passes obstacle)
            if (oldX >= 80 && this.x < 80 && !this.passed) {
                this.passed = true;
                eventManager.emit('OBSTACLE_PASSED', { obstacle: this });
                if (onObstaclePassed) onObstaclePassed();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Translate to center, rotate, translate back
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.rotation) ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);

        // Fallback drawing, subclasses should override
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.restore();
    }

    get isOffscreen() {
        return this.isFlung
            ? (this.x + this.width < -200 || this.x > 2000 || this.y > 1000)
            : (this.x + this.width < 0);
    }
}

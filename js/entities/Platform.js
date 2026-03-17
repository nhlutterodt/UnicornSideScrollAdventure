import { Entity } from '../core/Entity.js';
import { PhysicsUtils, CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * PLATFORM.js
 * Surface the player can stand on.
 */
export class Platform extends Entity {
    constructor(x, y, width, height) {
        super(x, y, width, height, 'platform');
        this.vx = 0;
        this.vy = 0;
        this.color = '#7afcff';

        // Collision Setup
        this.collisionLayer = CollisionLayers.PLATFORM;
        this.collisionMask = CollisionLayers.PLAYER;
        this.renderLayer = 1; // Z_LAYERS.ENVIRONMENT_BACK
    }

    update(dt, context) {
        const { gameSpeed, config } = context;
        
        // Horizontal movement (game scroll)
        this.vx = -gameSpeed;
        
        // Affected by physics: Gravity
        // platforms usually stay in air, but requirement says they are affected by physics.
        // We'll apply gravity if the config allows it, or just always apply it if prompted.
        if (config.PLATFORM_GRAVITY) {
            this.vy += config.GRAVITY * dt;
        }
        
        PhysicsUtils.integrate(this, dt);
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        
        // Draw main platform
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        
        // Add some shine/detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(this.x, this.y, this.width, 3);
        ctx.restore();
    }

    get isOffscreen() {
        return this.x + this.width < -100;
    }
}

import { Entity } from '../core/Entity.js';
import { CollisionLayers, PhysicsUtils } from '../utils/PhysicsUtils.js';

/**
 * POWER_UP.js
 * Item entity that grants abilities to the player.
 */
export class PowerUp extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} abilityData - Data for the ability this power-up grants
     */
    constructor(x, y, abilityData) {
        super(x, y, 30, 30, 'powerup');
        this.abilityData = abilityData;
        this.vy = 0;
        this.vx = 0;
        this.isGrounded = false;
        
        // Physics
        this.collisionLayer = CollisionLayers.POWERUP;
        this.collisionMask = CollisionLayers.PLAYER | CollisionLayers.PLATFORM;
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 3;
    }

    update(dt, context) {
        const { gameSpeed, config, logicalHeight } = context;
        
        // Horizontal movement (matches world)
        this.vx = -gameSpeed;
        
        // Gravity
        if (!this.isGrounded) {
            this.vy += config.GRAVITY * dt;
        }

        PhysicsUtils.integrate(this, dt);
        
        // Ground check
        const groundY = logicalHeight - config.GROUND_HEIGHT - this.height;
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Bobbing animation if on ground or stable
        this.bobOffset += this.bobSpeed * dt;
        
        if (this.isOffscreen) {
            this.destroy();
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Bobbing effect
        const visualY = this.y + Math.sin(this.bobOffset) * 5;

        // Pulsing glow
        const pulse = (Math.sin(this.bobOffset) + 1) / 2;
        ctx.shadowBlur = 10 + pulse * 10;
        ctx.shadowColor = this.abilityData.color || '#fff';
        
        // Draw icon background
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, visualY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Icon
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.abilityData.icon || '✨', this.x + this.width / 2, visualY + this.height / 2);
        
        ctx.restore();
    }

    onCollision(other) {
        if (other.entityType === 'player') {
            other.addAbility({...this.abilityData});
            this.destroy();
        }

        if (other.entityType === 'platform') {
            // Semi-solid platform logic
            if (this.vy >= 0 && (this.y + this.height - other.y) < 20) {
                this.y = other.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            }
        }
    }
}

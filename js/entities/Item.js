import { Entity } from '../core/Entity.js';
import { CollisionLayers, PhysicsUtils } from '../utils/PhysicsUtils.js';
import { eventManager } from '../systems/EventManager.js';

/**
 * ITEM.js
 * Generic item entity that can grant various effects to the player.
 * Replaces and extends the PowerUp concept.
 */
export class Item extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Object} itemData - Data from Config.ITEMS
     */
    static poolable = true;

    constructor(x, y, itemData) {
        super(x, y, 30, 30, 'item');
        this._configure(itemData);
    }

    /**
     * Called by EntityPool when reusing a freed instance instead of `new`-ing one.
     */
    revive(x, y, itemData) {
        this.reviveBase(x, y, 30, 30);
        this._configure(itemData);
    }

    _configure(itemData) {
        this.itemData = itemData;
        this.vy = 0;
        this.vx = 0;
        this.isGrounded = false;

        // Physics
        this.collisionLayer = CollisionLayers.ITEM;
        this.collisionMask = CollisionLayers.PLAYER | CollisionLayers.PLATFORM;

        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobSpeed = 3;

        this.renderLayer = 2; // Z_LAYERS.ENTITIES
    }

    update(dt, context) {
        const { gameSpeed, config, logicalHeight, worldModifiers } = context;
        
        // Horizontal movement (matches world)
        this.vx = -gameSpeed;
        
        const groundY = logicalHeight - config.GROUND_HEIGHT - this.height;
        
        // If grounded on a platform, check if we scrolled off
        if (this.isGrounded && this.y < groundY - 5) {
            let stillOnPlatform = false;
            if (context.platforms) {
                for (const p of context.platforms) {
                    if (this.x < p.x + p.width && this.x + this.width > p.x && Math.abs(this.y + this.height - p.y) < 5) {
                        stillOnPlatform = true;
                        break;
                    }
                }
            }
            if (!stillOnPlatform) {
                this.isGrounded = false;
            }
        }
        
        // Gravity
        if (!this.isGrounded) {
            const worldGravityMod = worldModifiers?.gravityMultiplier || 1.0;
            this.vy += config.GRAVITY * worldGravityMod * dt;
        }

        PhysicsUtils.integrate(this, dt);
        
        // Ground check
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
        }

        // Bobbing animation
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
        ctx.shadowColor = this.itemData.color || '#fff';
        
        // Draw background
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, visualY + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Icon
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Resolve icon - if it's an ability type, it might need to look up ability icon
        let icon = this.itemData.icon || '✨';
        if (this.itemData.type === 'ability' && !this.itemData.icon) {
            // This is a bit coupled, but standard for this project's structure
            // In a larger project, a Registry of Icons might be better
            // We'll leave it as is or handle it in Game.js / LevelUtils.js before spawning
        }

        ctx.fillText(icon, this.x + this.width / 2, visualY + this.height / 2);
        
        ctx.restore();
    }

    onCollision(other, particles, context) {
        if (other.entityType === 'player') {
            eventManager.emit('ITEM_PICKED_UP', { player: other, itemData: this.itemData, context: { particles } });
            if (particles) particles.play('PICKUP_BURST', { x: this.x + this.width / 2, y: this.y + this.height / 2 });
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

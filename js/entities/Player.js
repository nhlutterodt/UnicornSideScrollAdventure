import { Entity } from '../core/Entity.js';
import { AssetPipeline } from '../systems/AssetPipeline.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * PLAYER.js
 * The Unicorn! Handles physics and jumping.
 */
export class Player extends Entity {
    constructor(outfit = null) {
        super(80, 0, 50, 50, 'player');
        this.vy = 0;
        this.isGrounded = false;
        this.rotation = 0;

        // Collision Setup
        this.collisionLayer = CollisionLayers.PLAYER;
        this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM;
        this.collisionPadding = 10;

        // Visual properties from asset pipeline
        this.outfit = outfit || { body: 'pink', mane: 'gold', accessory: 'none', trail: 'rainbow' };
        this.appearance = AssetPipeline.resolveUnicornColors(this.outfit);
        
        this.onGameOver = null; // Callback for Game class
    }

    update(dt, context) {
        const { config, logicalHeight, platforms } = context;
        
        const oldY = this.y;
        
        if (!this.isGrounded) {
            this.vy += config.GRAVITY * dt;
            this.rotation = Math.min(Math.PI / 8, this.vy * 0.002);
        } else {
            this.rotation = 0;
            // Check if we walked off a platform or ground
            const groundY = logicalHeight - config.GROUND_HEIGHT - this.height;
            
            if (this.y < groundY - 5) { // If above ground
                let stillOnPlatform = false;
                if (platforms) {
                    for (const p of platforms) {
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
        }

        this.y += this.vy * dt;

        // Ground check (centralized)
        const currentGroundY = logicalHeight - config.GROUND_HEIGHT - this.height;
        if (this.y >= currentGroundY) {
            this.y = currentGroundY;
            this.vy = 0;
            this.isGrounded = true;
        }
    }

    onCollision(other) {
        if (other.entityType === 'obstacle') {
            if (this.onGameOver) this.onGameOver();
        }

        if (other.entityType === 'platform') {
            // Semi-solid platform logic (only block if falling)
            if (this.vy >= 0 && (this.y + this.height - other.y) < 20) {
                this.y = other.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            }
        }
    }

    jump(config, onJump) {
        if (this.isGrounded) {
            this.vy = config.JUMP_FORCE;
            this.isGrounded = false;
            // Pass color info for particles
            const particleColor = this.appearance.trail.colors[0];
            if (onJump) onJump(this.x + 10, this.y + this.height, particleColor);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(0, 25, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Body (simplified unicorn shape)
        ctx.fillStyle = this.appearance.body;
        
        // Main Body
        ctx.beginPath();
        ctx.roundRect(-20, -15, 35, 25, 10);
        ctx.fill();

        // Head/Neck
        ctx.beginPath();
        ctx.moveTo(5, -10);
        ctx.lineTo(15, -30);
        ctx.lineTo(25, -25);
        ctx.lineTo(15, 0);
        ctx.closePath();
        ctx.fill();

        // Mane
        ctx.fillStyle = this.appearance.mane;
        ctx.beginPath();
        ctx.arc(8, -25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -15, 5, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.arc(-22, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Horn
        ctx.fillStyle = '#ffd700'; // Gold horn
        ctx.beginPath();
        ctx.moveTo(18, -30);
        ctx.lineTo(25, -45);
        ctx.lineTo(22, -28);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(20, -25, 2, 0, Math.PI * 2);
        ctx.fill();

        // Accessory
        if (this.appearance.accessory) {
            ctx.font = '20px serif';
            ctx.fillText(this.appearance.accessory, 15, -40);
        }

        ctx.restore();
    }
}

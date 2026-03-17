'use strict';

import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * JumpPad.js
 * An entity placed on the ground or on platforms that blasts the player upwards.
 */
export class JumpPad extends Entity {
    constructor(x, y) {
        // A low, wide rectangle
        super(x, y - 10, 40, 10, 'jump_pad');
        
        this.collisionLayer = CollisionLayers.PLATFORM; // Treat as a platform physically initially
        this.collisionMask = CollisionLayers.PLAYER;
        this.renderLayer = 2;
        
        this.animTimer = 0;
        this.isActivated = false;
        
        // The bounciness multiplier applied to the standard jump
        this.boostMultiplier = 2.5; 
    }

    activate() {
        this.isActivated = true;
        this.animTimer = 0; // Reset animation
    }

    update(dt, context) {
        const { gameSpeed } = context;
        // Scroll left with the world
        this.x -= gameSpeed * dt;
        
        if (this.isActivated) {
            this.animTimer += dt;
            if (this.animTimer > 0.5) {
                this.isActivated = false; // Reset visually after 0.5s
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Base plate
        ctx.fillStyle = '#4a69bd';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Spring coil / energy indicator
        if (this.isActivated) {
            // Expanded/Exploded view
            ctx.fillStyle = '#f6b93b';
            ctx.fillRect(5, -20 * (1 - this.animTimer*2), 30, 20);
        } else {
            // Compressed view
            ctx.fillStyle = '#f6b93b';
            ctx.fillRect(5, -5, 30, 5);
        }
        
        ctx.restore();
    }
    
    get isOffscreen() {
        return this.x + this.width < 0;
    }
}

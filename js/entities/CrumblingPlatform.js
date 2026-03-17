'use strict';

import { Platform } from './Platform.js';
import { Config } from '../Config.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';

export class CrumblingPlatform extends Platform {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.type = 'crumbling_platform';
        
        // Crumbling state
        this.isCrumbling = false;
        this.crumbleTimer = 0;
        this.crumbleDelay = Config.CRUMBLING_PLATFORM_DELAY; // Seconds before it falls
        this.shakeOffset = 0;
        
        // Styling override
        this.baseColor = '#9e9e9e'; // Grey, cracked look
    }

    activate() {
        if (!this.isCrumbling) {
            this.isCrumbling = true;
            logger.debug('CrumblingPlatform', `Activated at x=${Math.round(this.x)}`);
        }
    }

    update(dt, context) {
        // Base platform behavior (scroll left)
        super.update(dt, context);
        
        if (this.isCrumbling) {
            this.crumbleTimer += dt;
            
            if (this.crumbleTimer < this.crumbleDelay) {
                // Shake Phase
                this.shakeOffset = (Math.random() * 4) - 2;
                this.baseColor = '#ffbaba'; // Warn player (turns reddish)
            } else {
                // Fall Phase
                this.y += 400 * dt; // Rapid acceleration downwards
                this.shakeOffset = 0;
                
                // Disable collision so the player falls through it if they are still on top
                this.collisionLayer = 0; 
                this.baseColor = '#d32f2f'; // Dark red
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        if (this.isCrumbling && this.crumbleTimer < this.crumbleDelay) {
            ctx.translate(this.shakeOffset, 0);
        }
        
        // Draw the main platform body
        ctx.fillStyle = this.baseColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw some "cracks"
        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y);
        ctx.lineTo(this.x + 20, this.y + this.height);
        
        ctx.moveTo(this.x + this.width - 20, this.y);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height/2);
        ctx.lineTo(this.x + this.width - 30, this.y + this.height);
        ctx.stroke();

        ctx.restore();
    }
}

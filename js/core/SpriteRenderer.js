'use strict';

import { assetManager } from '../systems/AssetManager.js';

/**
 * SPRITE_RENDERER.js
 * Component for rendering frame-based animations from a sprite sheet.
 */
export class SpriteRenderer {
    /**
     * @param {string} imageKey - The key of the preloaded image in AssetManager.
     * @param {number} frameWidth - Pixel width of a single frame.
     * @param {number} frameHeight - Pixel height of a single frame.
     * @param {Object} animations - Map of animation states (e.g. { idle: { row: 0, frames: 4, speed: 10 } })
     */
    constructor(imageKey, frameWidth, frameHeight, animations = {}) {
        this.imageKey = imageKey;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.animations = animations;

        this.currentState = 'default';
        this.currentFrame = 0;
        this.frameTimer = 0;
        
        // Setup default animation if none provided
        if (Object.keys(this.animations).length === 0) {
            this.animations['default'] = { row: 0, frames: 1, speed: 1 };
        } else {
            this.currentState = Object.keys(this.animations)[0];
        }
        
        this.flipX = false;
        this.flipY = false;
        this.opacity = 1.0;
    }

    /**
     * Set the current animation state.
     * @param {string} stateName 
     */
    setState(stateName) {
        if (this.currentState === stateName) return;
        
        if (this.animations[stateName]) {
            this.currentState = stateName;
            this.currentFrame = 0;
            this.frameTimer = 0;
        }
    }

    /**
     * Updates the animation frame based on delta time.
     * @param {number} dt - Delta time in seconds.
     */
    update(dt) {
        const anim = this.animations[this.currentState];
        if (!anim || anim.frames <= 1) return;

        // Speed is defined as frames per second
        const timePerFrame = 1 / (anim.speed || 10);
        
        this.frameTimer += dt;
        if (this.frameTimer >= timePerFrame) {
            this.frameTimer -= timePerFrame;
            this.currentFrame = (this.currentFrame + 1) % anim.frames;
            
            // Handle one-shot animations if needed
            if (anim.loop === false && this.currentFrame === 0) {
                this.currentFrame = anim.frames - 1; // Stay on last frame
            }
        }
    }

    /**
     * Draws the current frame of the sprite.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} x - Destination X
     * @param {number} y - Destination Y
     * @param {number} width - Destination Width (optional scale)
     * @param {number} height - Destination Height (optional scale)
     * @param {number} rotation - Rotation in radians
     */
    draw(ctx, x, y, width = this.frameWidth, height = this.frameHeight, rotation = 0) {
        const image = assetManager.getImage(this.imageKey);
        
        // Fallback if image isn't loaded (draw generic box)
        if (!image) {
            ctx.save();
            ctx.fillStyle = '#ff00ff'; // Magenta placeholder
            ctx.translate(x + width/2, y + height/2);
            ctx.rotate(rotation);
            ctx.fillRect(-width/2, -height/2, width, height);
            ctx.restore();
            return;
        }

        const anim = this.animations[this.currentState];
        if (!anim) return;

        const row = anim.row || 0;
        const sourceX = this.currentFrame * this.frameWidth;
        const sourceY = row * this.frameHeight;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Translate to center for rotation/flipping
        ctx.translate(x + width/2, y + height/2);
        
        if (rotation !== 0) {
            ctx.rotate(rotation);
        }
        
        if (this.flipX || this.flipY) {
            ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        }

        ctx.drawImage(
            image,
            sourceX, sourceY,
            this.frameWidth, this.frameHeight,
            -width/2, -height/2,
            width, height
        );

        ctx.restore();
    }
}

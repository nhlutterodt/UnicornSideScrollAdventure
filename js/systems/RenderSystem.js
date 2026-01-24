'use strict';

import { Config } from '../Config.js';
import { logger } from '../utils/Logger.js';

/**
 * RenderSystem - Centralized canvas rendering and draw order management
 * 
 * Responsibilities:
 * - Canvas clearing and background rendering
 * - Applying viewport scaling transformations
 * - Managing render layer ordering (clouds → ground → particles → entities → player → environment)
 * - Drawing ground with stage theme colors
 * - Rendering scrolling environment decorations
 * 
 * The RenderSystem ensures consistent visual output and makes the draw pipeline
 * easily configurable and testable.
 * 
 * @example
 * const renderer = new RenderSystem(canvas, ctx, viewport, level);
 * renderer.render(player, registry, particles, effects);
 */
export class RenderSystem {
    /**
     * @param {HTMLCanvasElement} canvas - The game canvas element
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context
     * @param {ViewportManager} viewport - Viewport manager for scaling and dimensions
     * @param {LevelSystem} level - Level system for stage themes
     * @param {number} logicalHeight - The logical height of the game world
     */
    constructor(canvas, ctx, viewport, level, logicalHeight = 600) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.viewport = viewport;
        this.level = level;
        this.logicalHeight = logicalHeight;
        
        logger.info('RenderSystem', 'Initialized');
    }

    /**
     * Main render method - orchestrates the entire draw pipeline
     * 
     * @param {Player} player - The player entity
     * @param {Registry} registry - Entity registry for accessing all game entities
     * @param {ParticleSystem} particles - Particle system
     * @param {EffectSystem} effects - Effect system
     * @param {number} gameSpeed - Current game speed for environment scrolling
     */
    render(player, registry, particles, effects, gameSpeed) {
        // 1. Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw background theme
        this._drawBackground();

        // 3. Apply viewport scaling
        this.ctx.save();
        this.ctx.scale(this.viewport.scaleRatio, this.viewport.scaleRatio);

        // 4. Draw render layers in order
        this._drawClouds(registry);
        this._drawGround();
        this._drawParticlesAndEffects(particles, effects);
        this._drawPlatforms(registry);
        this._drawObstacles(registry);
        this._drawItems(registry);
        this._drawPlayer(player);
        this._drawEnvironment(gameSpeed);

        // 5. Restore canvas state
        this.ctx.restore();
    }

    /**
     * Draws the background using current stage theme
     * @private
     */
    _drawBackground() {
        if (this.level.currentStage) {
            this.ctx.fillStyle = this.level.currentStage.theme.background;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Draws all cloud entities
     * @private
     * @param {Registry} registry - Entity registry
     */
    _drawClouds(registry) {
        registry.getByType('cloud').forEach(cloud => cloud.draw(this.ctx));
    }

    /**
     * Draws the ground with stage theme colors
     * @private
     */
    _drawGround() {
        const theme = this.level.currentStage?.theme || { 
            primary: '#8ce68c', 
            secondary: '#76c476' 
        };
        
        // Main ground
        this.ctx.fillStyle = theme.primary;
        this.ctx.fillRect(
            0, 
            this.logicalHeight - Config.GROUND_HEIGHT, 
            this.viewport.logicalWidth, 
            Config.GROUND_HEIGHT
        );
        
        // Ground accent/border
        this.ctx.fillStyle = theme.secondary;
        this.ctx.fillRect(
            0, 
            this.logicalHeight - Config.GROUND_HEIGHT, 
            this.viewport.logicalWidth, 
            5
        );
    }

    /**
     * Draws particles and effects
     * @private
     * @param {ParticleSystem} particles - Particle system
     * @param {EffectSystem} effects - Effect system
     */
    _drawParticlesAndEffects(particles, effects) {
        particles.draw(this.ctx);
        effects.draw(this.ctx);
    }

    /**
     * Draws all platform entities
     * @private
     * @param {Registry} registry - Entity registry
     */
    _drawPlatforms(registry) {
        registry.getByType('platform').forEach(platform => platform.draw(this.ctx));
    }

    /**
     * Draws all obstacle entities
     * @private
     * @param {Registry} registry - Entity registry
     */
    _drawObstacles(registry) {
        registry.getByType('obstacle').forEach(obstacle => obstacle.draw(this.ctx));
    }

    /**
     * Draws all item entities
     * @private
     * @param {Registry} registry - Entity registry
     */
    _drawItems(registry) {
        registry.getByType('item').forEach(item => item.draw(this.ctx));
    }

    /**
     * Draws the player
     * @private
     * @param {Player} player - The player entity
     */
    _drawPlayer(player) {
        if (player) {
            player.draw(this.ctx);
        }
    }

    /**
     * Draws scrolling environment decorations (flowers, elements)
     * @private
     * @param {number} gameSpeed - Current game speed for scrolling calculation
     */
    _drawEnvironment(gameSpeed) {
        this.ctx.font = '20px serif';
        this.ctx.textBaseline = 'bottom';

        const time = performance.now() / 1000;
        const speed = gameSpeed;
        const stage = this.level.currentStage;
        const elements = stage?.theme.elements || ['🌸'];

        // Draw scrolling elements across the screen
        for (let i = 0; i < this.viewport.logicalWidth; i += 100) {
            const offset = ((time * speed) + i) % (this.viewport.logicalWidth + 100);
            const icon = elements[Math.floor((i / 100) % elements.length)];
            this.ctx.fillText(
                icon, 
                this.viewport.logicalWidth - offset, 
                this.logicalHeight - 20
            );
        }
    }
}

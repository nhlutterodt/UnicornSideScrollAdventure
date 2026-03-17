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
export const Z_LAYERS = {
    BACKGROUND: 0,
    ENVIRONMENT_BACK: 1,
    ENTITIES: 2,
    PARTICLES: 3,
    ENVIRONMENT_FRONT: 4,
    UI: 5
};

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

        // 4. Collect and sort all visible entities by layer
        const allEntities = Array.from(registry.entities.values()).filter(e => !e.isDead);
        if (player && !player.isDead && !allEntities.includes(player)) {
            allEntities.push(player); // Ensure player is in render list if not in registry
        }
        
        // Sort by renderLayer ascending
        // Default to ENTITIES (2) layer if not specified
        allEntities.sort((a, b) => {
            const layerA = a.renderLayer !== undefined ? a.renderLayer : Z_LAYERS.ENTITIES;
            const layerB = b.renderLayer !== undefined ? b.renderLayer : Z_LAYERS.ENTITIES;
            return layerA - layerB;
        });

        // 5. Draw pass
        // Separate entities by layer or just draw them in order, inserting static elements (ground, particles) at correct breakpoints
        let currentLayer = -1;

        for (const entity of allEntities) {
            const entLayer = entity.renderLayer !== undefined ? entity.renderLayer : Z_LAYERS.ENTITIES;
            
            // Draw Ground between BACKGROUND and ENVIRONMENT_BACK
            if (currentLayer < Z_LAYERS.ENVIRONMENT_BACK && entLayer >= Z_LAYERS.ENVIRONMENT_BACK) {
                this._drawGround();
            }

            // Draw Particles/Effects between ENTITIES and ENVIRONMENT_FRONT
            if (currentLayer < Z_LAYERS.PARTICLES && entLayer > Z_LAYERS.PARTICLES) {
                this._drawParticlesAndEffects(particles, effects);
            }

            entity.draw(this.ctx);
            currentLayer = entLayer;
        }

        // Catch-up if there were no entities in upper layers
        if (currentLayer < Z_LAYERS.ENVIRONMENT_BACK) this._drawGround();
        if (currentLayer < Z_LAYERS.PARTICLES) this._drawParticlesAndEffects(particles, effects);

        // Environment Front (e.g., flowers, foreground)
        this._drawEnvironment(gameSpeed);

        // 6. Restore canvas state
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
        if (particles) particles.draw(this.ctx);
        if (effects) effects.draw(this.ctx);
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

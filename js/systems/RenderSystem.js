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

        // Persistent, incrementally-maintained draw-order cache. Rebuilt only
        // when `registry.version` changes (i.e. an entity actually spawned or
        // despawned since the last render() call), not on every frame - see
        // `_getRenderOrder()`. Steady-state frames (the overwhelming majority,
        // since render() runs at 60fps but spawns/despawns happen a few times a
        // second at most) reuse this same array with zero new allocation.
        this._renderOrder = [];
        this._lastRegistryVersion = -1;

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
     * @param {{x: number, y: number}} [shakeOffset] - Screen-shake translate from FeedbackSystem
     */
    render(player, registry, particles, effects, gameSpeed, shakeOffset) {
        // 1. Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw background theme
        this._drawBackground();

        // 3. Apply viewport scaling + screen shake
        this.ctx.save();
        this.ctx.scale(this.viewport.scaleRatio, this.viewport.scaleRatio);
        if (shakeOffset && (shakeOffset.x !== 0 || shakeOffset.y !== 0)) {
            this.ctx.translate(shakeOffset.x, shakeOffset.y);
        }

        // 4. Fetch the cached, layer-sorted entity list (zero-allocation in steady state)
        const allEntities = this._getRenderOrder(registry, player);

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
     * Returns entities ordered ascending by renderLayer, rebuilding the cache
     * only when the registry's membership has changed since the last call.
     * Draw order within a layer follows registration order (Array.sort is
     * stable), matching the previous per-frame-rebuild behavior exactly.
     * @private
     * @param {Registry} registry
     * @param {Player} player
     * @returns {Array}
     */
    _getRenderOrder(registry, player) {
        if (registry.version !== this._lastRegistryVersion) {
            this._renderOrder.length = 0;
            for (const entity of registry.entities.values()) {
                if (!entity.isDead) this._renderOrder.push(entity);
            }
            this._renderOrder.sort(RenderSystem._compareByRenderLayer);
            this._lastRegistryVersion = registry.version;
        }

        // Defensive: covers a hypothetical entity whose shouldRegister() is
        // false (none exist today). Only allocates on this cold path.
        if (player && !player.isDead && !this._renderOrder.includes(player)) {
            return [...this._renderOrder, player].sort(RenderSystem._compareByRenderLayer);
        }

        return this._renderOrder;
    }

    /**
     * Ascending renderLayer comparator, defaulting to ENTITIES when unset.
     * @private
     */
    static _compareByRenderLayer(a, b) {
        const layerA = a.renderLayer !== undefined ? a.renderLayer : Z_LAYERS.ENTITIES;
        const layerB = b.renderLayer !== undefined ? b.renderLayer : Z_LAYERS.ENTITIES;
        return layerA - layerB;
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

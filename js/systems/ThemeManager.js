'use strict';

import { eventManager } from './EventManager.js';
import { logger } from '../utils/Logger.js';

/**
 * ThemeManager - Manages visual theme application across the game
 * 
 * Responsibilities:
 * - Apply stage themes to CSS variables for UI consistency
 * - Trigger theme transition particle effects
 * - Listen to STAGE_CHANGED events and apply themes automatically
 * 
 * The ThemeManager decouples theme logic from Game.js, making theme
 * management testable and allowing for future theme enhancements
 * (transitions, animations, custom themes, etc.)
 * 
 * Events Consumed:
 * - STAGE_CHANGED: { name, theme: { primary, background, elements } }
 * 
 * @example
 * const themeManager = new ThemeManager(particleSystem, viewport, logicalHeight);
 * // Automatically applies themes when STAGE_CHANGED event fires
 */
export class ThemeManager {
    /**
     * @param {ParticleSystem} particleSystem - Particle system for visual effects
     * @param {ViewportManager} viewport - Viewport for centering effects
     * @param {number} logicalHeight - Logical height for effect positioning
     */
    constructor(particleSystem, viewport, logicalHeight) {
        this.particles = particleSystem;
        this.viewport = viewport;
        this.logicalHeight = logicalHeight;
        
        this._setupEventListeners();
        
        logger.info('ThemeManager', 'Initialized');
    }

    /**
     * Sets up event listeners for automatic theme application
     * @private
     */
    _setupEventListeners() {
        eventManager.on('STAGE_CHANGED', (stage) => {
            this.applyTheme(stage);
        });
    }

    /**
     * Applies a stage theme to the game
     * 
     * @param {Object} stage - Stage object with theme data
     * @param {string} stage.name - Name of the stage
     * @param {Object} stage.theme - Theme configuration
     * @param {string} stage.theme.primary - Primary color
     * @param {string} stage.theme.background - Background color
     */
    applyTheme(stage) {
        if (!stage || !stage.theme) {
            logger.warn('ThemeManager', 'Invalid stage or theme provided');
            return;
        }

        // Apply theme to CSS variables for UI consistency
        document.documentElement.style.setProperty('--primary-color', stage.theme.primary);
        document.documentElement.style.setProperty('--bg-color', stage.theme.background);
        
        // Trigger theme transition particle effect
        this.particles.play('PICKUP_BURST', { 
            x: this.viewport.logicalWidth / 2, 
            y: this.logicalHeight / 2, 
            color: stage.theme.primary 
        });

        logger.info('ThemeManager', `Applied theme: ${stage.name}`);
    }

    /**
     * Cleanup method for removing event listeners
     */
    destroy() {
        // Event cleanup would go here if eventManager supported removeListener
        logger.info('ThemeManager', 'Destroyed');
    }
}

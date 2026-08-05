'use strict';

import { Player } from '../entities/Player.js';
import { Storage } from '../systems/Storage.js';
import { logger } from '../utils/Logger.js';

/**
 * PlayerFactory - Centralized player instance creation
 * 
 * Responsibilities:
 * - Load player customization from Storage
 * - Create Player instances with proper outfit configuration
 * - Provide default outfit fallback
 * - Wire up game over callback
 * 
 * Design Pattern: Factory
 * - Encapsulates Player construction logic
 * - Handles customization persistence
 * - Decouples Game.js from Player instantiation details
 * 
 * Events Emitted:
 * - None (factory is stateless)
 * 
 * Events Consumed:
 * - None
 * 
 * @example
 * const playerFactory = new PlayerFactory();
 * const player = playerFactory.create(gameOverCallback);
 */
export class PlayerFactory {
    constructor() {
        this.defaultOutfit = {
            body: 'pink',
            mane: 'gold',
            accessory: 'none',
            trail: 'rainbow'
        };

        logger.info('PlayerFactory', 'Initialized with default outfit');
    }

    /**
     * Create a new Player instance with customization
     * @param {Function} onGameOverCallback - Callback when player loses all lives
     * @returns {Player} Configured player instance
     */
    create(onGameOverCallback = null) {
        // Load active character profile or fall back to old system, then to defaults
        const outfit = this._loadActiveOutfit();

        // Create player with outfit
        const player = new Player(outfit);

        // Wire up game over callback
        if (onGameOverCallback) {
            player.onGameOver = onGameOverCallback;
        }

        logger.debug('PlayerFactory', `Created player with outfit: ${JSON.stringify(outfit)}`);

        return player;
    }

    /**
     * Load the active outfit from the profile system, with fallback chain:
     * 1. Active character profile (new system)
     * 2. Old single-outfit storage (migration path)
     * 3. Hardcoded defaults
     * @returns {Object} Outfit configuration
     * @private
     */
    _loadActiveOutfit() {
        // Try new profile system first
        const profiles = Storage.load('characterProfiles', null);
        if (profiles) {
            const activeId = Storage.load('activeCharacterProfile', 'default');
            if (profiles[activeId]) {
                logger.debug('PlayerFactory', `Loaded active profile: ${activeId}`);
                return { ...profiles[activeId] };
            }
            // Active profile missing, fall back to first available or default
            const firstKey = Object.keys(profiles)[0];
            if (firstKey && profiles[firstKey]) {
                logger.warn('PlayerFactory', `Active profile "${activeId}" not found, using "${firstKey}"`);
                return { ...profiles[firstKey] };
            }
        }

        // Fall back to old single-outfit storage
        const oldOutfit = Storage.load('current_outfit', null);
        if (oldOutfit) {
            logger.debug('PlayerFactory', 'Using legacy current_outfit');
            return { ...oldOutfit };
        }

        // Ultimate fallback
        logger.debug('PlayerFactory', 'Using default outfit');
        return { ...this.defaultOutfit };
    }

    /**
     * Create a player with a specific outfit (for testing/customization preview)
     * @param {Object} outfit - Outfit configuration
     * @param {Function} onGameOverCallback - Callback when player loses all lives
     * @returns {Player} Configured player instance
     */
    createWithOutfit(outfit, onGameOverCallback = null) {
        if (!outfit) {
            logger.warn('PlayerFactory', 'No outfit provided, using defaults');
            outfit = this.defaultOutfit;
        }

        const player = new Player(outfit);

        if (onGameOverCallback) {
            player.onGameOver = onGameOverCallback;
        }

        logger.debug('PlayerFactory', `Created player with custom outfit: ${JSON.stringify(outfit)}`);

        return player;
    }

    /**
     * Create a player with default outfit (ignores Storage)
     * @param {Function} onGameOverCallback - Callback when player loses all lives
     * @returns {Player} Player with default appearance
     */
    createDefault(onGameOverCallback = null) {
        const player = new Player(this.defaultOutfit);

        if (onGameOverCallback) {
            player.onGameOver = onGameOverCallback;
        }

        logger.debug('PlayerFactory', 'Created player with default outfit');

        return player;
    }

    /**
     * Get the default outfit configuration
     * @returns {Object} Default outfit
     */
    getDefaultOutfit() {
        return { ...this.defaultOutfit };
    }
}

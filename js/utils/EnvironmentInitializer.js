'use strict';

import { Cloud } from '../entities/Cloud.js';
import { logger } from './Logger.js';

/**
 * EnvironmentInitializer - Utility for initializing game environment
 * 
 * Responsibilities:
 * - Spawn initial background elements (clouds)
 * - Configure starting environment state
 * - Provide configurable initialization patterns
 * 
 * This utility encapsulates environment setup logic that was previously
 * embedded in Game.js, making it reusable and testable.
 * 
 * @example
 * EnvironmentInitializer.spawnInitialClouds(800, 600);
 */
export class EnvironmentInitializer {
    /**
     * Spawns initial clouds across the game viewport
     * 
     * @param {number} logicalWidth - The logical width of the viewport
     * @param {number} logicalHeight - The logical height of the game world
     * @param {Object} options - Optional configuration
     * @param {number} options.count - Number of clouds to spawn (default: 5)
     * @param {number} options.maxHeight - Maximum spawn height from bottom (default: 150)
     */
    static spawnInitialClouds(logicalWidth, logicalHeight, options = {}) {
        const count = options.count || 5;
        const maxHeight = options.maxHeight || 150;

        logger.info('EnvironmentInitializer', `Spawning ${count} initial clouds`);

        for (let i = 0; i < count; i++) {
            const x = Math.random() * logicalWidth;
            const y = Math.random() * (logicalHeight - maxHeight);
            new Cloud(x, y);
        }
    }

    /**
     * Initializes the complete game environment
     * Combines all environment setup operations
     * 
     * @param {number} logicalWidth - The logical width of the viewport
     * @param {number} logicalHeight - The logical height of the game world
     * @param {Object} config - Optional configuration for environment setup
     */
    static initialize(logicalWidth, logicalHeight, config = {}) {
        this.spawnInitialClouds(logicalWidth, logicalHeight, config.clouds);
        
        logger.info('EnvironmentInitializer', 'Environment initialized');
    }
}

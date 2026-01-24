'use strict';

import { logger } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';

/**
 * ViewportManager - Handles viewport scaling and coordinate transformations
 * 
 * Responsibilities:
 * - Manages canvas physical resolution
 * - Calculates logical-to-physical scale ratio
 * - Maintains logical width based on aspect ratio
 * - Handles window resize events
 * - Provides coordinate transformation utilities
 * 
 * Architecture:
 * - LOGICAL_HEIGHT is fixed (600 units)
 * - Logical width adjusts based on aspect ratio
 * - Scale ratio = physicalHeight / LOGICAL_HEIGHT
 * - All game logic uses logical coordinates
 * 
 * Events Emitted:
 * - VIEWPORT_RESIZED: { logicalWidth, logicalHeight, scaleRatio, physicalWidth, physicalHeight }
 * 
 * Events Consumed:
 * - None (manages window resize internally)
 * 
 * @example
 * const viewport = new ViewportManager(canvas, container, 600);
 * viewport.resize(); // Recalculate on window resize
 * const logicalX = viewport.logicalWidth / 2; // Center of screen
 */
export class ViewportManager {
    /**
     * @param {HTMLCanvasElement} canvas - The game canvas element
     * @param {HTMLElement} container - Container element for measuring physical size
     * @param {number} logicalHeight - Fixed logical height (default: 600)
     */
    constructor(canvas, container, logicalHeight = 600) {
        if (!canvas || !container) {
            throw new Error('ViewportManager requires canvas and container elements');
        }

        this.canvas = canvas;
        this.container = container;
        this.logicalHeight = logicalHeight;

        // Calculated properties
        this.logicalWidth = 800; // Default, updated in resize()
        this.scaleRatio = 1;
        this.physicalWidth = 0;
        this.physicalHeight = 0;

        // Bind resize handler
        this.handleResize = this.resize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Initial resize
        this.resize();

        logger.info('ViewportManager', `Initialized with logical height: ${this.logicalHeight}`);
    }

    /**
     * Recalculate viewport dimensions based on container size
     * Call this on window resize or orientation change
     */
    resize() {
        if (!this.container) return;

        // 1. Get Physical Size
        const physicalWidth = this.container.clientWidth;
        const physicalHeight = this.container.clientHeight;

        // 2. Update Canvas Resolution to match Physical Size (for crisp rendering)
        this.canvas.width = physicalWidth;
        this.canvas.height = physicalHeight;

        // 3. Calculate Scale Ratio to fit LOGICAL_HEIGHT into physicalHeight
        this.scaleRatio = physicalHeight / this.logicalHeight;

        // 4. Determine Logical Width based on aspect ratio
        this.logicalWidth = physicalWidth / this.scaleRatio;

        // Store physical dimensions
        this.physicalWidth = physicalWidth;
        this.physicalHeight = physicalHeight;

        // Emit event for other systems to respond
        eventManager.emit('VIEWPORT_RESIZED', {
            logicalWidth: this.logicalWidth,
            logicalHeight: this.logicalHeight,
            scaleRatio: this.scaleRatio,
            physicalWidth: this.physicalWidth,
            physicalHeight: this.physicalHeight
        });

        logger.debug('ViewportManager', 
            `Resized: ${physicalWidth}x${physicalHeight}px → ${Math.round(this.logicalWidth)}x${this.logicalHeight} logical (scale: ${this.scaleRatio.toFixed(2)})`
        );
    }

    /**
     * Convert logical coordinates to physical screen coordinates
     * @param {number} logicalX - X coordinate in logical space
     * @param {number} logicalY - Y coordinate in logical space
     * @returns {Object} { x, y } in physical pixel coordinates
     */
    logicalToPhysical(logicalX, logicalY) {
        return {
            x: logicalX * this.scaleRatio,
            y: logicalY * this.scaleRatio
        };
    }

    /**
     * Convert physical screen coordinates to logical coordinates
     * @param {number} physicalX - X coordinate in physical pixels
     * @param {number} physicalY - Y coordinate in physical pixels
     * @returns {Object} { x, y } in logical coordinates
     */
    physicalToLogical(physicalX, physicalY) {
        return {
            x: physicalX / this.scaleRatio,
            y: physicalY / this.scaleRatio
        };
    }

    /**
     * Check if logical coordinates are within viewport bounds
     * @param {number} logicalX - X coordinate in logical space
     * @param {number} logicalY - Y coordinate in logical space
     * @returns {boolean} True if within bounds
     */
    isInBounds(logicalX, logicalY) {
        return logicalX >= 0 && 
               logicalX <= this.logicalWidth && 
               logicalY >= 0 && 
               logicalY <= this.logicalHeight;
    }

    /**
     * Get viewport center in logical coordinates
     * @returns {Object} { x, y } center coordinates
     */
    getCenter() {
        return {
            x: this.logicalWidth / 2,
            y: this.logicalHeight / 2
        };
    }

    /**
     * Get aspect ratio (width / height)
     * @returns {number} Aspect ratio
     */
    getAspectRatio() {
        return this.logicalWidth / this.logicalHeight;
    }

    /**
     * Cleanup: remove event listeners
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        logger.info('ViewportManager', 'Destroyed');
    }
}

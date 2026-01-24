'use strict';

import { Dom } from '../utils/Dom.js';
import { eventManager } from './EventManager.js';
import { logger } from '../utils/Logger.js';

/**
 * UIManager - Centralized UI updates and DOM manipulation
 * 
 * Responsibilities:
 * - Manages all DOM element references
 * - Updates score, lives, high score displays
 * - Renders ability inventory cards
 * - Listens to game events for automatic UI updates
 * - Handles final score display on game over
 * 
 * Architecture:
 * - Event-driven UI updates (no polling)
 * - Null-safe DOM queries
 * - Encapsulates all DOM manipulation logic
 * - No game logic, pure presentation layer
 * 
 * Events Emitted:
 * - None (presentation layer only)
 * 
 * Events Consumed:
 * - SCORE_CHANGED: Updates score display
 * - HIGH_SCORE_CHANGED: Updates high score displays
 * - GAME_OVER: Updates final score display
 * - ABILITY_APPLIED: Triggers ability UI refresh
 * 
 * @example
 * const ui = new UIManager(player);
 * // UI automatically updates via events
 */
export class UIManager {
    constructor(player = null) {
        // DOM Element References
        this.scoreElement = Dom.get('scoreBoard');
        this.livesElement = Dom.get('livesDisplay');
        this.finalScoreElement = Dom.get('finalScore');
        this.startHighScoreElement = Dom.get('startHighScore');
        this.gameOverHighScoreElement = Dom.get('gameOverHighScore');
        this.abilityInventoryElement = Dom.get('abilityInventory');

        // Player reference for ability UI
        this.player = player;

        // Setup event listeners
        this.setupEventListeners();

        logger.info('UIManager', 'Initialized with 6 DOM elements');
    }

    /**
     * Setup event listeners for automatic UI updates
     * @private
     */
    setupEventListeners() {
        eventManager.on('SCORE_CHANGED', (data) => {
            this.updateScore(data.score);
        });

        eventManager.on('HIGH_SCORE_CHANGED', (data) => {
            this.updateHighScore(data.highScore);
        });

        eventManager.on('GAME_OVER', () => {
            // Game over event will be followed by score finalization
            // Final score update happens naturally through SCORE_CHANGED
        });

        eventManager.on('ABILITY_APPLIED', () => {
            this.updateAbilityInventory();
        });

        logger.debug('UIManager', 'Event listeners registered');
    }

    /**
     * Update player reference (for ability UI)
     * @param {Player} player - New player instance
     */
    setPlayer(player) {
        this.player = player;
        this.updateLives();
        this.updateAbilityInventory();
    }

    /**
     * Update score display
     * @param {number} score - Current score
     */
    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = `Score: ${score}`;
        }
    }

    /**
     * Update lives display
     */
    updateLives() {
        if (this.livesElement && this.player) {
            this.livesElement.textContent = `💖 x${this.player.lives}`;
        }
    }

    /**
     * Update high score displays (start and game over screens)
     * @param {number} highScore - High score value
     */
    updateHighScore(highScore) {
        const text = `High Score: ${highScore}`;
        
        if (this.startHighScoreElement) {
            this.startHighScoreElement.textContent = text;
        }
        
        if (this.gameOverHighScoreElement) {
            this.gameOverHighScoreElement.textContent = text;
        }
    }

    /**
     * Update final score on game over screen
     * @param {number} finalScore - Final score value
     */
    updateFinalScore(finalScore) {
        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = `Final Score: ${finalScore}`;
        }
    }

    /**
     * Update stats displays (score and lives together)
     * Useful for batch updates
     * @param {number} score - Current score
     */
    updateStats(score) {
        this.updateScore(score);
        this.updateLives();
    }

    /**
     * Render ability inventory cards with icons and status
     */
    updateAbilityInventory() {
        if (!this.abilityInventoryElement || !this.player) return;

        // Clear existing cards
        this.abilityInventoryElement.innerHTML = '';

        // Render each ability as a card
        this.player.abilities.forEach((ability, index) => {
            const card = this.createAbilityCard(ability, index);
            this.abilityInventoryElement.appendChild(card);
        });
    }

    /**
     * Create a single ability card DOM element
     * @private
     * @param {Object} ability - Ability data
     * @param {number} index - Ability index in inventory
     * @returns {HTMLElement} Card element
     */
    createAbilityCard(ability, index) {
        const card = document.createElement('div');
        card.className = `ability-card ${index === this.player.currentAbilityIndex ? 'active' : ''}`;
        
        // Icon
        const icon = document.createElement('div');
        icon.className = 'ability-icon';
        icon.textContent = ability.icon;
        
        // Info (time/uses remaining)
        const info = document.createElement('div');
        info.className = 'ability-info';
        
        let infoText = '';
        if (ability.remainingTime !== null) {
            infoText += `${Math.ceil(ability.remainingTime)}s`;
        }
        if (ability.remainingUses !== null) {
            infoText += (infoText ? ' | ' : '') + `${ability.remainingUses} uses`;
        }
        info.textContent = infoText;
        
        card.appendChild(icon);
        card.appendChild(info);
        
        return card;
    }

    /**
     * Force refresh all UI elements
     * Useful for manual sync after state changes
     * @param {Object} gameState - Current game state
     */
    refreshAll(gameState) {
        if (gameState.score !== undefined) {
            this.updateScore(gameState.score);
        }
        
        if (gameState.highScore !== undefined) {
            this.updateHighScore(gameState.highScore);
        }
        
        this.updateLives();
        this.updateAbilityInventory();
        
        logger.debug('UIManager', 'Full UI refresh completed');
    }
}

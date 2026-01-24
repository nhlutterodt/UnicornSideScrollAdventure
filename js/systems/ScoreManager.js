'use strict';

import { Storage } from './Storage.js';
import { eventManager } from './EventManager.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';

/**
 * ScoreManager - Centralized score tracking and persistence
 * 
 * Responsibilities:
 * - Tracks current game score
 * - Manages high score persistence via Storage
 * - Emits events for score changes
 * - Handles score finalization on game over
 * 
 * Events Emitted:
 * - SCORE_CHANGED: { score: number, delta: number } - When score increases
 * - HIGH_SCORE_CHANGED: { highScore: number } - When high score is beaten
 * 
 * Events Consumed:
 * - None (managed directly by Game.js)
 * 
 * @example
 * const scoreManager = new ScoreManager();
 * scoreManager.addPoints(1); // Increment score
 * const result = scoreManager.finalize(); // Get final score data
 */
export class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = Storage.load('highScore', 0);
        
        logger.info('ScoreManager', `Initialized with high score: ${this.highScore}`);
    }

    /**
     * Add points to the current score
     * @param {number} points - Points to add (must be positive)
     */
    addPoints(points) {
        if (!points || points <= 0) {
            logger.warn('ScoreManager', `Invalid points value: ${points}`);
            return;
        }

        const oldScore = this.score;
        this.score += points;

        eventManager.emit('SCORE_CHANGED', {
            score: this.score,
            delta: points
        });

        logger.debug('ScoreManager', `Score: ${oldScore} → ${this.score} (+${points})`);
        logger.game(VerbosityLevel.MEDIUM, 'ScoreManager', `🎯 +${points} points`, {
            total: this.score
        });
        
        // Log score milestones
        const milestones = [10, 25, 50, 100, 250, 500, 1000];
        for (const milestone of milestones) {
            if (oldScore < milestone && this.score >= milestone) {
                logger.game(VerbosityLevel.LOW, 'ScoreManager', `🎖️ Milestone: ${milestone} points!`);\n                break;\n            }\n        }\n    }

    /**
     * Reset score to zero (for new game)
     */
    reset() {
        this.score = 0;
        
        eventManager.emit('SCORE_CHANGED', {
            score: 0,
            delta: 0
        });

        logger.info('ScoreManager', 'Score reset to 0');
    }

    /**
     * Finalize score and check/update high score
     * Called on game over
     * @returns {Object} Final score data
     */
    finalize() {
        const isHighScore = this.score > this.highScore;

        if (isHighScore) {
            const oldHighScore = this.highScore;
            this.highScore = this.score;
            Storage.save('highScore', this.highScore);

            eventManager.emit('HIGH_SCORE_CHANGED', {
                highScore: this.highScore,
                previousHighScore: oldHighScore
            });

            logger.info('ScoreManager', `New high score! ${oldHighScore} → ${this.highScore}`);
        }

        return {
            score: this.score,
            highScore: this.highScore,
            isHighScore
        };
    }

    /**
     * Get current score
     * @returns {number} Current score
     */
    getScore() {
        return this.score;
    }

    /**
     * Get high score
     * @returns {number} High score
     */
    getHighScore() {
        return this.highScore;
    }
}

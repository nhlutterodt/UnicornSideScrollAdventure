'use strict';

import { Config } from '../Config.js';
import { engineRegistry } from '../core/Registry.js';
import { logger } from '../utils/Logger.js';

/**
 * GameInputHandler - Manages game-specific input routing and command handling
 * 
 * Responsibilities:
 * - Route input events from InputManager to appropriate game systems
 * - Handle player actions (jump, ability usage, ability cycling)
 * - Enforce state-based input filtering (only respond during PLAYING state)
 * - Coordinate particle effects triggered by input actions
 * - Update UI in response to input commands
 * 
 * This system decouples input management from Game.js, making input handling
 * testable and easier to extend with new commands.
 * 
 * @example
 * const inputHandler = new GameInputHandler(inputManager, stateController);
 * inputHandler.bindGameCommands(player, particles, effects, ui);
 */
export class GameInputHandler {
    /**
     * @param {InputManager} inputManager - The input manager to listen to
     * @param {StateController} stateController - State controller for checking game state
     */
    constructor(inputManager, stateController) {
        this.input = inputManager;
        this.state = stateController;
        
        // Dependencies (set via bindGameCommands)
        this.player = null;
        this.particles = null;
        this.effects = null;
        this.ui = null;
        
        logger.info('GameInputHandler', 'Initialized');
    }

    /**
     * Binds game commands to player and systems
     * This should be called after player is created
     * 
     * @param {Player} player - The player entity to control
     * @param {ParticleSystem} particles - Particle system for visual feedback
     * @param {EffectSystem} effects - Effect system for abilities
     * @param {UIManager} ui - UI manager for updating ability display
     */
    bindGameCommands(player, particles, effects, ui) {
        this.player = player;
        this.particles = particles;
        this.effects = effects;
        this.ui = ui;

        this._setupJumpHandler();
        this._setupAbilityHandler();
        this._setupAbilityCycleHandlers();

        logger.info('GameInputHandler', 'Game commands bound');
    }

    /**
     * Sets up the jump command handler
     * @private
     */
    _setupJumpHandler() {
        this.input.on('jump', () => {
            if (this.state.current === 'PLAYING' && this.player) {
                this.player.jump(Config, (x, y, color) => {
                    this.particles.play('LAND_DUST', { x, y, color });
                });
            }
        });
    }

    /**
     * Sets up the ability usage handler
     * @private
     */
    _setupAbilityHandler() {
        this.input.on('useAbility', () => {
            if (this.state.current === 'PLAYING' && this.player) {
                const context = { 
                    registry: engineRegistry, 
                    particles: this.particles 
                };
                this.player.useAbility(this.effects, context);
                this.ui.updateAbilityInventory();
            }
        });
    }

    /**
     * Sets up the ability cycling handlers (left/right)
     * @private
     */
    _setupAbilityCycleHandlers() {
        this.input.on('cycleLeft', () => {
            if (this.state.current === 'PLAYING' && this.player) {
                this.player.cycleAbility(-1);
                this.ui.updateAbilityInventory();
            }
        });

        this.input.on('cycleRight', () => {
            if (this.state.current === 'PLAYING' && this.player) {
                this.player.cycleAbility(1);
                this.ui.updateAbilityInventory();
            }
        });
    }

    /**
     * Updates the player reference (useful after player respawn)
     * 
     * @param {Player} player - The new player instance
     */
    updatePlayer(player) {
        this.player = player;
        logger.debug('GameInputHandler', 'Player reference updated');
    }
}

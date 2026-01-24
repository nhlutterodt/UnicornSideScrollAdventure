import { Dom } from './utils/Dom.js';
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { engineRegistry } from './core/Registry.js';
import { InputManager } from './systems/InputManager.js';

import { Config } from './Config.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';

import { logger } from './utils/Logger.js';
import { eventManager } from './systems/EventManager.js';
import { AbilityManager } from './systems/AbilityManager.js';
import { LevelSystem } from './systems/LevelSystem.js';
import { ScoreManager } from './systems/ScoreManager.js';
import { ViewportManager } from './systems/ViewportManager.js';
import { PlayerFactory } from './factories/PlayerFactory.js';
import { SpawnManager } from './systems/SpawnManager.js';
import { UIManager } from './systems/UIManager.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { GameInputHandler } from './systems/GameInputHandler.js';
import { ThemeManager } from './systems/ThemeManager.js';
import { EnvironmentInitializer } from './utils/EnvironmentInitializer.js';

/**
 * GAME.js
 * The main coordination hub for Unicorn Magic Run.
 * Modular, Extensible, and Data-Driven.
 */

// LOGICAL_HEIGHT: The internal resolution height the game logic assumes.
// The visual canvas will scale up/down to fit this into the physical window.
const LOGICAL_HEIGHT = 600;

export class Game {
    constructor() {
        try {
            logger.info('Game', 'Initializing game engine...');

            // UI Components - Fail fast if missing
            this.container = Dom.get('gameContainer');
            if (!this.container) {
                throw new Error('Game container element not found. Check index.html for #gameContainer');
            }
            
            this.canvas = Dom.get('gameCanvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found. Check index.html for #gameCanvas');
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('Failed to get 2D rendering context. Browser may not support canvas.');
            }
            
            logger.debug('Game', 'DOM elements validated');

        // State & Systems
        this.state = new StateController(this.container, 'START');
        this.input = new InputManager(this.canvas);
        this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
        
        // Modules
        this.particles = new ParticleSystem();
        this.effects = new EffectSystem(this.particles);
        this.abilities = new AbilityManager(this);
        this.level = new LevelSystem();
        this.scoreManager = new ScoreManager();
        this.viewport = new ViewportManager(this.canvas, this.container, LOGICAL_HEIGHT);
        this.playerFactory = new PlayerFactory();
        this.spawnManager = new SpawnManager();
        this.ui = new UIManager();
        this.renderer = new RenderSystem(this.canvas, this.ctx, this.viewport, this.level, LOGICAL_HEIGHT);
        this.inputHandler = new GameInputHandler(this.input, this.state);
        this.themeManager = new ThemeManager(this.particles, this.viewport, LOGICAL_HEIGHT);
        this.updateHighScoreUI();

        // Game Logic State
        this.resetInternalState();

            this.setupEvents();
            this.init();
            
            logger.info('Game', '✓ Game engine initialized successfully');
        } catch (error)
        {
            logger.error('Game', 'Initialization failed:', error);
            throw error; // Re-throw to propagate to main.js
        }
    }

    setupEvents() {
        eventManager.on('LEVEL_UP', ({ level }) => logger.info('Game', `Level ${level} reached`));
        eventManager.on('ABILITY_APPLIED', () => this.ui.updateAbilityInventory());
        eventManager.on('VIEWPORT_RESIZED', (data) => this.onViewportResize(data));
        eventManager.on('LIFE_CHANGED', () => this.player && this.ui.updateLives());
    }

    init() {
        // Register start button handlers with validation
        const startButtons = Dom.all('.js-start-btn');
        if (startButtons.length === 0) {
            logger.warn('Game', 'No start buttons found. Check DOM structure.');
        } else {
            logger.info('Game', `Registering ${startButtons.length} start button(s)`);
            startButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    logger.info('Game', 'Start button clicked');
                    this.start();
                });
            });
        }
        
        // Register resize handler
        window.addEventListener('resize', () => this.resize());
        
        // Initial resize to set canvas dimensions
        this.resize();
        
        // Start render loop (game logic gated by state)
        logger.info('Game', 'Starting render loop');
        this.loop.start();
        
        logger.info('Game', 'Initialization complete. Ready to start.');
    }

    resetInternalState() {
        logger.debug('Game', 'Resetting internal state...');
        
        // Reset scoring
        this.scoreManager.reset();
        this.gameSpeed = Config.INITIAL_GAME_SPEED;

        // Reset level progression
        if (this.level) this.level.reset();
        
        // Clear spawners and all entities
        this.spawnManager.reset();
        engineRegistry.clear();
        
        logger.debug('Game', 'Registry cleared, creating new player...');

        // Create new player instance
        this.player = this.playerFactory.create(() => this.gameOver());
        
        if (!this.player) {
            logger.error('Game', 'Failed to create player!');
            throw new Error('Player creation failed');
        }
        
        // Bind player to systems
        this.ui.setPlayer(this.player);
        this.ui.updateStats(this.scoreManager.getScore());
        this.inputHandler.bindGameCommands(this.player, this.particles, this.effects, this.ui);
        
        logger.debug('Game', `Player created at (${this.player.x}, ${this.player.y})`);

        // Spawn environment decorations
        EnvironmentInitializer.spawnInitialClouds(this.viewport.logicalWidth || 800, LOGICAL_HEIGHT);
        
        logger.debug('Game', 'State reset complete');
    }

    start() {
        logger.info('Game', 'Starting new game...');
        
        // Reset all game state and create fresh player
        this.resetInternalState();
        
        // Transition to playing state
        this.state.setState('PLAYING');
        
        logger.info('Game', `Game started. State: ${this.state.current}`);
    }

    gameOver() {
        this.state.setState('GAMEOVER');
        const scoreData = this.scoreManager.finalize();
        if (scoreData.isHighScore) this.updateHighScoreUI();
        this.ui.updateFinalScore(scoreData.score);
    }

    updateHighScoreUI() {
        this.ui.updateHighScore(this.scoreManager.getHighScore());
    }

    resize() {
        this.viewport.resize();
    }

    onViewportResize(data) {
        if (this.state.current !== 'PLAYING' && this.player) {
            this.player.y = LOGICAL_HEIGHT - Config.GROUND_HEIGHT - this.player.height;
        }
    }

    update(dt) {
        if (this.state.current !== 'PLAYING') return;

        this.level.update(dt);
        this.abilities.update(dt);
        this.gameSpeed = this.level.gameSpeed;

        const context = {
            config: Config,
            logicalHeight: LOGICAL_HEIGHT,
            gameSpeed: this.gameSpeed,
            worldModifiers: this.level.worldModifiers,
            platforms: engineRegistry.getByType('platform'),
            registry: engineRegistry,
            particles: this.particles,
            onObstaclePassed: () => this.scoreManager.addPoints(1)
        };

        this.spawnManager.update(dt, this.viewport, this.level, this.player, this.particles);
        this.particles.update(dt, context);
        this.effects.update(dt, context);
        engineRegistry.updateAll(dt, context);
        CollisionSystem.resolve(engineRegistry, this.particles, context);
    }

    draw() {
        this.renderer.render(this.player, engineRegistry, this.particles, this.effects, this.gameSpeed);
    }
}

import { Dom } from './utils/Dom.js';
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { engineRegistry } from './core/Registry.js';
import { InputManager } from './systems/InputManager.js';

import { Config } from './Config.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';
import { FeedbackSystem } from './systems/FeedbackSystem.js';

import { logger, VerbosityLevel } from './utils/Logger.js';
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
import { HybridControlsBar } from './systems/HybridControlsBar.js';
import { ThemeManager } from './systems/ThemeManager.js';
import { EnvironmentInitializer } from './utils/EnvironmentInitializer.js';
import { LogOverlay } from './systems/LogOverlay.js';
import { Storage } from './systems/Storage.js';

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
        this.feedback = new FeedbackSystem(Config.FEEDBACK);
        this.effects = new EffectSystem(this.particles, this.feedback);
        this.abilities = new AbilityManager(this);
        this.level = new LevelSystem();
        this.scoreManager = new ScoreManager();
        this.viewport = new ViewportManager(this.canvas, this.container, LOGICAL_HEIGHT);
        this.playerFactory = new PlayerFactory();
        this.spawnManager = new SpawnManager();
        this.ui = new UIManager();
        this.renderer = new RenderSystem(this.canvas, this.ctx, this.viewport, this.level, LOGICAL_HEIGHT);
        this.inputHandler = new GameInputHandler(this.input, this.state);
        this.controlsBar = new HybridControlsBar({
            host: Dom.get('gameControlsHost'),
            inputManager: this.input,
            stateController: this.state,
            controlsConfig: Config.CONTROLS,
            onStart: () => this.start(),
            onRetry: () => this.start(),
            getHasAbility: () => !!(this.player && this.player.abilities && this.player.abilities.length > 0)
        });
        this.themeManager = new ThemeManager(this.particles, this.viewport, LOGICAL_HEIGHT);
        this.updateHighScoreUI();

        // Game Logic State
        this.resetInternalState();

            // Initialize log overlay (after all systems ready)
            this.logOverlay = new LogOverlay();

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
        eventManager.on('ABILITY_APPLIED', () => {
            this.ui.updateAbilityInventory();
            this.controlsBar.sync();
        });
        eventManager.on('VIEWPORT_RESIZED', (data) => this.onViewportResize(data));
        eventManager.on('LIFE_CHANGED', () => this.player && this.ui.updateLives());
        eventManager.on('ENTITY_SPAWNED', (event) => {
            if (!event) return;
            this.spawnHistory.push(event);
            if (this.spawnHistory.length > 100) {
                this.spawnHistory.shift();
            }

            if (!this.spawnStats.byType[event.type]) {
                this.spawnStats.byType[event.type] = 0;
            }
            this.spawnStats.byType[event.type]++;
            this.spawnStats.total++;
        });

        eventManager.on('ENTITY_BUDGET_WARNING', (event) => {
            logger.game(VerbosityLevel.MEDIUM, 'Game', '⚠️ Entity budget warning', event);
        });
    }

    init() {
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
        this.spawnHistory = [];
        this.spawnStats = {
            total: 0,
            byType: {}
        };

        // Reset level progression before deriving preset-dependent runtime values.
        if (this.level) this.level.reset();

        // Safe start: no damaging hazards until this window elapses (see Config.SAFE_START)
        const safeStartMultiplier = this.level?.difficultyPreset?.safeStartMultiplier || 1.0;
        this.safeStartRemaining = (Config.SAFE_START.FIRST_HAZARD_DELAY_MS / 1000) * safeStartMultiplier;
        this._lastSafeStartTick = null;
        
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
        this.controlsBar.sync();
        
        logger.debug('Game', `Player created at (${this.player.x}, ${this.player.y})`);

        // Spawn environment decorations
        EnvironmentInitializer.spawnInitialClouds(this.viewport.logicalWidth || 800, LOGICAL_HEIGHT);
        
        logger.debug('Game', 'State reset complete');
    }

    start() {
        logger.info('Game', 'Starting new game...');
        logger.game(VerbosityLevel.LOW, 'Game', '🎮 NEW GAME STARTED');
        
        // Reset all game state and create fresh player
        this.resetInternalState();
        
        // Transition to playing state
        this.state.setState('PLAYING');
        this.controlsBar.sync();
        
        logger.info('Game', `Game started. State: ${this.state.current}`);
        logger.game(VerbosityLevel.MEDIUM, 'Game', 'Entered PLAYING state', { 
            level: this.level.level,
            lives: this.player.lives
        });
    }

    gameOver() {
        logger.game(VerbosityLevel.LOW, 'Game', '💀 GAME OVER', {
            finalScore: this.scoreManager.getScore(),
            finalLevel: this.level.level,
            lives: this.player.lives
        });
        
        this.state.setState('GAMEOVER');
        this.controlsBar.sync();
        const scoreData = this.scoreManager.finalize();
        const runTelemetry = {
            timestamp: Date.now(),
            score: scoreData.score,
            isHighScore: scoreData.isHighScore,
            level: this.level.level,
            distance: this.level.distance,
            difficultyPreset: this.level.difficultyPresetName,
            spawnStats: this.spawnStats,
            lastSpawns: this.spawnHistory.slice(-15)
        };

        Storage.save('last_run_telemetry', runTelemetry);
        eventManager.emit('RUN_TELEMETRY_READY', runTelemetry);
        
        if (scoreData.isHighScore) {
            logger.game(VerbosityLevel.LOW, 'Game', '🏆 NEW HIGH SCORE!', { score: scoreData.score });
            this.updateHighScoreUI();
        }
        
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
        // Decays independently of state/hit-stop so a death-impact shake can still
        // play out as the screen cuts to GAMEOVER, rather than freezing mid-shake.
        this.feedback.update(dt);
        this.controlsBar.sync();

        if (this.state.current !== 'PLAYING') return;

        this._updateSafeStart(dt);

        // Hit-stop freezes gameplay logic while particles keep animating on the raw dt,
        // so an impact still feels alive during the freeze-frame.
        const gameplayDt = this.feedback.getGameplayDt(dt);

        this.level.update(gameplayDt);
        this.abilities.update(gameplayDt);
        this.gameSpeed = this.level.gameSpeed;

        const context = {
            config: Config,
            logicalHeight: LOGICAL_HEIGHT,
            gameSpeed: this.gameSpeed,
            worldModifiers: this.level.worldModifiers,
            platforms: engineRegistry.getByType('platform'),
            registry: engineRegistry,
            particles: this.particles,
            feedback: this.feedback,
            onObstaclePassed: () => this.scoreManager.addPoints(1)
        };

        const isSafeStart = this.safeStartRemaining > 0;
        this.spawnManager.update(gameplayDt, this.viewport, this.level, this.player, this.particles, isSafeStart);
        this.particles.update(dt, context);
        this.effects.update(gameplayDt, context);
        engineRegistry.updateAll(gameplayDt, context);
        CollisionSystem.resolve(engineRegistry, this.particles, context);
    }

    /**
     * Counts down the safe-start window and emits a tick event only when the
     * displayed countdown digit changes, so UIManager can stay event-driven
     * rather than polling every frame.
     */
    _updateSafeStart(dt) {
        if (this.safeStartRemaining <= 0) return;

        this.safeStartRemaining = Math.max(0, this.safeStartRemaining - dt);

        if (this.safeStartRemaining <= 0) {
            this._lastSafeStartTick = null;
            eventManager.emit('SAFE_START_END', {});
            return;
        }

        const tick = Math.ceil(this.safeStartRemaining);
        if (tick !== this._lastSafeStartTick) {
            this._lastSafeStartTick = tick;
            eventManager.emit('SAFE_START_TICK', { remaining: tick });
        }
    }

    draw() {
        const shakeOffset = this.feedback.getShakeOffset();
        this.renderer.render(this.player, engineRegistry, this.particles, this.effects, this.gameSpeed, shakeOffset);
    }
}

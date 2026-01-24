import { Dom } from './utils/Dom.js';
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { engineRegistry } from './core/Registry.js';
import { InputManager } from './systems/InputManager.js';

import { Storage } from './systems/Storage.js';

import { Obstacle } from './entities/Obstacle.js';
import { Cloud } from './entities/Cloud.js';
import { Platform } from './entities/Platform.js';
import { Item } from './entities/Item.js';

import { Config } from './Config.js';
import { PhysicsUtils } from './utils/PhysicsUtils.js';
import { LevelUtils } from './utils/LevelUtils.js';
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
        logger.info('Game', 'Initializing...');

        // UI Components
        this.container = Dom.get('gameContainer');
        this.canvas = Dom.get('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = Dom.get('scoreBoard');
        this.livesElement = Dom.get('livesDisplay');
        this.finalScoreElement = Dom.get('finalScore');
        this.startHighScoreElement = Dom.get('startHighScore');
        this.gameOverHighScoreElement = Dom.get('gameOverHighScore');
        this.abilityInventoryElement = Dom.get('abilityInventory');

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
        this.updateHighScoreUI();

        // Game Logic State
        this.resetInternalState();

        this.setupEvents();
        this.init();
    }

    setupEvents() {
        // Event-driven UI updates
        eventManager.on('LEVEL_UP', ({ level }) => {
            logger.info('Game', `Systemic Level Up: ${level}`);
            // Show level up toast or effect
        });

        eventManager.on('STAGE_CHANGED', (stage) => {
            this.applyStageTheme(stage);
        });

        eventManager.on('ABILITY_APPLIED', () => {
            this.updateAbilityUI();
        });

        eventManager.on('VIEWPORT_RESIZED', (data) => {
            this.onViewportResize(data);
        });

        eventManager.on('LIFE_CHANGED', () => {
            this.updateStatsUI();
        });
    }

    applyStageTheme(stage) {
        if (!stage || !stage.theme) return;

        // Apply theme to document for UI consistency
        document.documentElement.style.setProperty('--primary-color', stage.theme.primary);
        document.documentElement.style.setProperty('--bg-color', stage.theme.background);
        
        // You could also trigger a "World Transition" particle effect here
        this.particles.play('PICKUP_BURST', { 
            x: this.viewport.logicalWidth / 2, 
            y: LOGICAL_HEIGHT / 2, 
            color: stage.theme.primary 
        });

        logger.info('Game', `Applied Stage Theme: ${stage.name}`);
    }

    init() {
        // Input handling
        this.input.on('jump', () => {
            if (this.state.current === 'PLAYING') {
                this.player.jump(Config, (x, y, color) => {
                    this.particles.play('LAND_DUST', { x, y, color });
                });
            }
        });

        this.input.on('useAbility', () => {
            if (this.state.current === 'PLAYING') {
                const context = { registry: engineRegistry, particles: this.particles };
                this.player.useAbility(this.effects, context);
                this.updateAbilityUI();
            }
        });

        this.input.on('cycleLeft', () => {
            if (this.state.current === 'PLAYING') {
                this.player.cycleAbility(-1);
                this.updateAbilityUI();
            }
        });

        this.input.on('cycleRight', () => {
            if (this.state.current === 'PLAYING') {
                this.player.cycleAbility(1);
                this.updateAbilityUI();
            }
        });

        // UI Listeners
        Dom.all('.js-start-btn').forEach(btn => {
            btn.addEventListener('click', () => this.start());
        });

        window.addEventListener('resize', () => this.resize());

        this.resize();
        this.loop.start();
    }

    resetInternalState() {
        this.scoreManager.reset();
        this.gameSpeed = Config.INITIAL_GAME_SPEED;

        // Level System reset
        if (this.level) this.level.reset();

        // Time accumulators for spawning
        this.obstacleTimer = 0;
        this.platformTimer = 0;
        this.cloudTimer = 0;
        this.particleTimer = 0;
        this.itemTimer = 0;

        // Entities
        engineRegistry.clear();

        // Create Player via Factory
        this.player = this.playerFactory.create(() => this.gameOver());

        this.updateStatsUI();

        // Initial environment
        const spawnWidth = this.viewport.logicalWidth || 800;

        for (let i = 0; i < 5; i++) {
            const x = Math.random() * spawnWidth;
            const y = Math.random() * (LOGICAL_HEIGHT - 150);
            new Cloud(x, y);
        }
    }

    start() {
        this.resetInternalState();
        this.state.setState('PLAYING');
    }

    gameOver() {
        this.state.setState('GAMEOVER');

        // Finalize score and check for high score
        const scoreData = this.scoreManager.finalize();
        if (scoreData.isHighScore) {
            this.updateHighScoreUI();
        }

        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = `Final Score: ${this.scoreManager.getScore()}`;
        }
    }

    updateStatsUI() {
        if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.scoreManager.getScore()}`;
        if (this.livesElement && this.player) {
            this.livesElement.textContent = `💖 x${this.player.lives}`;
        }
    }

    updateHighScoreUI() {
        const text = `High Score: ${this.scoreManager.getHighScore()}`;
        if (this.startHighScoreElement) this.startHighScoreElement.textContent = text;
        if (this.gameOverHighScoreElement) this.gameOverHighScoreElement.textContent = text;
    }

    onViewportResize(data) {
        // Adjust player position if resizing while idle to keep them on ground
        if (this.state.current !== 'PLAYING' && this.player) {
            this.player.y = LOGICAL_HEIGHT - Config.GROUND_HEIGHT - this.player.height;
        }
    }

    update(dt) {
        if (this.state.current !== 'PLAYING') return;

        // 1. Update Core Systems
        this.level.update(dt);
        this.abilities.update(dt);
        
        // Sync Game Speed from Level System
        this.gameSpeed = this.level.gameSpeed;

        const context = {
            config: Config,
            logicalHeight: LOGICAL_HEIGHT,
            gameSpeed: this.gameSpeed,
            worldModifiers: this.level.worldModifiers, // Pass world modifiers (gravity, etc)
            platforms: engineRegistry.getByType('platform'),
            registry: engineRegistry,
            particles: this.particles,
            onObstaclePassed: () => {
                this.scoreManager.addPoints(1);
                this.updateStatsUI();
            }
        };

        // 2. Spawning Systems (Modified to use LevelSystem intervals)
        this.particleTimer += dt;
        if (this.particleTimer > 0.05) {
            this.particleTimer = 0;
            const trailColors = this.player.appearance.trail.colors;
            const color = trailColors[Math.floor(Math.random() * trailColors.length)];
            this.particles.play('TRAIL', { x: this.player.x, y: this.player.y + 25, color });
        }

        this.obstacleTimer += dt;
        if (this.obstacleTimer > this.level.spawnInterval) {
            this.obstacleTimer = 0;
            new Obstacle(this.viewport.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);
        }

        this.platformTimer += dt;
        if (this.platformTimer > this.level.spawnInterval * 1.5) {
            this.platformTimer = 0;
            
            let shouldSpawn = false;
            if (Config.PLATFORM_PLACEMENT_MODE === 'deterministic') {
                shouldSpawn = true;
            } else {
                shouldSpawn = Math.random() < Config.PLATFORM_PROBABILITY;
            }

            if (shouldSpawn) {
                const width = Config.PLATFORM_MIN_WIDTH + Math.random() * (Config.PLATFORM_MAX_WIDTH - Config.PLATFORM_MIN_WIDTH);
                const y = Config.PLATFORM_VERTICAL_RANGE[0] + Math.random() * (Config.PLATFORM_VERTICAL_RANGE[1] - Config.PLATFORM_VERTICAL_RANGE[0]);
                new Platform(this.viewport.logicalWidth + 100, y, width, Config.PLATFORM_HEIGHT);
            }
        }

        this.cloudTimer += dt;
        if (this.cloudTimer > 2.5) {
            this.cloudTimer = 0;
            new Cloud(this.viewport.logicalWidth + 100, Math.random() * (LOGICAL_HEIGHT - 150));
        }

        this.itemTimer += dt;
        if (this.itemTimer > Config.ITEM_SPAWN_INTERVAL) {
            this.itemTimer = 0;
            const x = this.viewport.logicalWidth + 100;
            const y = LevelUtils.getRandomSpawnY(LOGICAL_HEIGHT, Config.GROUND_HEIGHT);
            LevelUtils.spawnRandomItem(x, y);
        }

        // 3. Particle & Effect Update
        this.particles.update(dt, context);
        this.effects.update(dt, context);

        // 4. Polymorphic Entity Update
        engineRegistry.updateAll(dt, context);

        // 5. Ability UI Check (Only if needed, now supported by events too)
        if (this.player.abilities.length > 0) {
            // We still update it if time-based values change
            this.updateAbilityUI();
        }

        // 6. Collision Detection
        CollisionSystem.resolve(engineRegistry, this.particles, context);
    }

    updateAbilityUI() {
        if (!this.abilityInventoryElement) return;

        // Clear existing card
        this.abilityInventoryElement.innerHTML = '';

        this.player.abilities.forEach((ability, index) => {
            const card = document.createElement('div');
            card.className = `ability-card ${index === this.player.currentAbilityIndex ? 'active' : ''}`;
            
            const icon = document.createElement('div');
            icon.className = 'ability-icon';
            icon.textContent = ability.icon;
            
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
            this.abilityInventoryElement.appendChild(card);
        });
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background Theme
        if (this.level.currentStage) {
            this.ctx.fillStyle = this.level.currentStage.theme.background;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.ctx.save();
        this.ctx.scale(this.viewport.scaleRatio, this.viewport.scaleRatio);

        // Ordered Drawing via Entity Groups
        engineRegistry.getByType('cloud').forEach(c => c.draw(this.ctx));

        // Ground Theme
        const theme = this.level.currentStage?.theme || { primary: '#8ce68c', secondary: '#76c476' };
        this.ctx.fillStyle = theme.primary;
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.viewport.logicalWidth, Config.GROUND_HEIGHT);
        this.ctx.fillStyle = theme.secondary;
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.viewport.logicalWidth, 5);

        this.particles.draw(this.ctx);
        this.effects.draw(this.ctx);
        engineRegistry.getByType('platform').forEach(p => p.draw(this.ctx));
        engineRegistry.getByType('obstacle').forEach(o => o.draw(this.ctx));
        engineRegistry.getByType('item').forEach(i => i.draw(this.ctx));
        this.player.draw(this.ctx);

        this.drawEnvironment();

        this.ctx.restore();
    }

    drawEnvironment() {
        this.ctx.font = '20px serif';
        this.ctx.textBaseline = 'bottom';

        const time = performance.now() / 1000;
        const speed = this.gameSpeed;
        const stage = this.level.currentStage;
        const elements = stage?.theme.elements || ['🌸'];

        // Loop across logical width
        // Ensure we draw enough flowers to cover the screen
        for (let i = 0; i < this.viewport.logicalWidth; i += 100) {
            let offset = ((time * speed) + i) % (this.viewport.logicalWidth + 100);
            const icon = elements[Math.floor((i / 100) % elements.length)];
            this.ctx.fillText(icon, this.viewport.logicalWidth - offset, LOGICAL_HEIGHT - 20);
        }
    }
}

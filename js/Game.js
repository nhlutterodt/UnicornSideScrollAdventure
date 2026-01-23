import { Dom } from './utils/Dom.js';
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { engineRegistry } from './core/Registry.js';
import { InputManager } from './systems/InputManager.js';

import { Storage } from './systems/Storage.js';

import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Cloud } from './entities/Cloud.js';
import { Platform } from './entities/Platform.js';
import { PowerUp } from './entities/PowerUp.js';

import { Config } from './Config.js';
import { PhysicsUtils } from './utils/PhysicsUtils.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';

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
        // UI Components
        this.container = Dom.get('gameContainer');
        this.canvas = Dom.get('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = Dom.get('scoreBoard');
        this.finalScoreElement = Dom.get('finalScore');
        this.startHighScoreElement = Dom.get('startHighScore');
        this.gameOverHighScoreElement = Dom.get('gameOverHighScore');
        this.abilityInventoryElement = Dom.get('abilityInventory');

        // State & Systems
        this.state = new StateController(this.container, 'START');
        this.input = new InputManager(this.canvas);
        this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));
        
        // Effects System (Visual + Audio)
        this.particles = new ParticleSystem();
        this.effects = new EffectSystem(this.particles);

        // Persistent State
        this.highScore = Storage.load('highScore', 0);
        this.updateHighScoreUI();

        // Screen Dimensions (Logical)
        this.logicalWidth = 800; // Default startup, updated in resize
        this.scaleRatio = 1;

        // Game Logic State
        this.resetInternalState();

        this.init();
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
        this.score = 0;
        this.gameSpeed = Config.INITIAL_GAME_SPEED;

        // Time accumulators for spawning
        this.obstacleTimer = 0;
        this.platformTimer = 0;
        this.cloudTimer = 0;
        this.particleTimer = 0;
        this.powerUpTimer = 0;
        this.currentSpawnInterval = Config.SPAWN_INTERVAL_START;

        // Entities
        engineRegistry.clear();

        // Load Customization
        const outfit = Storage.load('current_outfit', {
            body: 'pink',
            mane: 'gold',
            accessory: 'none',
            trail: 'rainbow'
        });
        this.player = new Player(outfit);
        this.player.onGameOver = () => this.gameOver();

        if (this.scoreElement) this.scoreElement.textContent = `Score: 0`;

        // Initial environment
        const spawnWidth = this.logicalWidth || 800;

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

        // Check and Save High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            Storage.save('highScore', this.highScore);
            this.updateHighScoreUI();
        }

        if (this.finalScoreElement) {
            this.finalScoreElement.textContent = `Final Score: ${this.score}`;
        }
    }

    updateHighScoreUI() {
        const text = `High Score: ${this.highScore}`;
        if (this.startHighScoreElement) this.startHighScoreElement.textContent = text;
        if (this.gameOverHighScoreElement) this.gameOverHighScoreElement.textContent = text;
    }

    resize() {
        if (!this.container) return;

        // 1. Get Physical Size
        const physicalWidth = this.container.clientWidth;
        const physicalHeight = this.container.clientHeight;

        // 2. Update Canvas Resolution to match Physical Size (for crisp text/vectors)
        this.canvas.width = physicalWidth;
        this.canvas.height = physicalHeight;

        // 3. Calculate Scale Ratio to fit LOGICAL_HEIGHT into physicalHeight
        this.scaleRatio = physicalHeight / LOGICAL_HEIGHT;

        // 4. Determine Logical Width based on the new aspect ratio
        this.logicalWidth = physicalWidth / this.scaleRatio;

        // Adjust player position if resizing while idle to keep them on ground
        if (this.state.current !== 'PLAYING' && this.player) {
            this.player.y = LOGICAL_HEIGHT - Config.GROUND_HEIGHT - this.player.height;
        }
    }

    update(dt) {
        if (this.state.current !== 'PLAYING') return;

        const context = {
            config: Config,
            logicalHeight: LOGICAL_HEIGHT,
            gameSpeed: this.gameSpeed,
            platforms: engineRegistry.getByType('platform'),
            registry: engineRegistry,
            particles: this.particles,
            onObstaclePassed: () => {
                this.score++;
                if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`;
                if (this.score % 10 === 0) {
                    this.gameSpeed = Math.min(this.gameSpeed + Config.SPEED_INCREMENT, Config.MAX_GAME_SPEED);
                    this.currentSpawnInterval = Math.max(Config.SPAWN_INTERVAL_MIN, this.currentSpawnInterval - 0.1);
                }
            }
        };

        // 1. Spawning Systems
        this.particleTimer += dt;
        if (this.particleTimer > 0.05) {
            this.particleTimer = 0;
            const trailColors = this.player.appearance.trail.colors;
            const color = trailColors[Math.floor(Math.random() * trailColors.length)];
            this.particles.play('TRAIL', { x: this.player.x, y: this.player.y + 25, color });
        }

        this.obstacleTimer += dt;
        if (this.obstacleTimer > this.currentSpawnInterval) {
            this.obstacleTimer = 0;
            new Obstacle(this.logicalWidth + 100, LOGICAL_HEIGHT - Config.GROUND_HEIGHT);
        }

        this.platformTimer += dt;
        if (this.platformTimer > this.currentSpawnInterval * 1.5) {
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
                new Platform(this.logicalWidth + 100, y, width, Config.PLATFORM_HEIGHT);
            }
        }

        this.cloudTimer += dt;
        if (this.cloudTimer > 2.5) {
            this.cloudTimer = 0;
            new Cloud(this.logicalWidth + 100, Math.random() * (LOGICAL_HEIGHT - 150));
        }

        this.powerUpTimer += dt;
        if (this.powerUpTimer > Config.POWERUP_SPAWN_INTERVAL) {
            this.powerUpTimer = 0;
            const abilityData = Config.ABILITIES[Math.floor(Math.random() * Config.ABILITIES.length)];
            const y = 100 + Math.random() * (LOGICAL_HEIGHT - 300);
            new PowerUp(this.logicalWidth + 100, y, abilityData);
        }

        // 2. Particle System Update
        this.particles.update(dt, context);
        this.effects.update(dt, context);

        // 3. Polymorphic Entity Update
        engineRegistry.updateAll(dt, context);

        // 3. Update Ability UI (Optimized: only if abilities exist)
        if (this.player.abilities.length > 0) {
            this.updateAbilityUI();
        } else if (this.abilityInventoryElement && this.abilityInventoryElement.children.length > 0) {
            this.abilityInventoryElement.innerHTML = '';
        }

        // 4. Collision Detection
        CollisionSystem.resolve(engineRegistry, this.particles);
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

        this.ctx.save();
        this.ctx.scale(this.scaleRatio, this.scaleRatio);

        // Ordered Drawing via Entity Groups
        engineRegistry.getByType('cloud').forEach(c => c.draw(this.ctx));

        // Ground
        this.ctx.fillStyle = '#8ce68c';
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.logicalWidth, Config.GROUND_HEIGHT);
        this.ctx.fillStyle = '#76c476';
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.logicalWidth, 5);

        this.particles.draw(this.ctx);
        this.effects.draw(this.ctx);
        engineRegistry.getByType('platform').forEach(p => p.draw(this.ctx));
        engineRegistry.getByType('obstacle').forEach(o => o.draw(this.ctx));
        this.player.draw(this.ctx);

        this.drawEnvironment();

        this.ctx.restore();
    }

    drawEnvironment() {
        this.ctx.font = '20px serif';
        this.ctx.textBaseline = 'bottom';

        const time = performance.now() / 1000;
        const speed = this.gameSpeed;

        // Loop across logical width
        // Ensure we draw enough flowers to cover the screen
        for (let i = 0; i < this.logicalWidth; i += 100) {
            let offset = ((time * speed) + i) % (this.logicalWidth + 100);
            this.ctx.fillText('🌸', this.logicalWidth - offset, LOGICAL_HEIGHT - 20);
        }
    }
}

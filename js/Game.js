import { Dom } from './utils/Dom.js';
import { GameLoop } from './core/GameLoop.js';
import { StateController } from './core/StateController.js';
import { engineRegistry } from './core/Registry.js';
import { InputManager } from './systems/InputManager.js';

import { Storage } from './systems/Storage.js';

import { Player } from './entities/Player.js';
import { Obstacle } from './entities/Obstacle.js';
import { Cloud } from './entities/Cloud.js';
import { Particle } from './entities/Particle.js';

import { Config } from './Config.js';
import { PhysicsUtils } from './utils/PhysicsUtils.js';

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

        // State & Systems
        this.state = new StateController(this.container, 'START');
        this.input = new InputManager(this.canvas);
        this.loop = new GameLoop(this.update.bind(this), this.draw.bind(this));

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
                this.player.jump(Config, (x, y, color) => this.spawnParticles(x, y, color || '#ffffff', 10));
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
        this.cloudTimer = 0;
        this.particleTimer = 0;
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

        this.obstacles = [];
        this.clouds = [];
        this.particles = [];

        if (this.scoreElement) this.scoreElement.textContent = `Score: 0`;

        // Initial environment
        // Use logicalWidth if available, else canvas width (though resize is called early)
        const spawnWidth = this.logicalWidth || 800;

        for (let i = 0; i < 5; i++) {
            const c = new Cloud(spawnWidth, LOGICAL_HEIGHT);
            c.x = Math.random() * spawnWidth;
            this.clouds.push(c);
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

    spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, this.gameSpeed));
        }
    }

    update(dt) {
        if (this.state.current !== 'PLAYING') return;

        // Pass LOGICAL_HEIGHT to player for ground collision
        this.player.update(dt, Config, LOGICAL_HEIGHT);

        // Magic Trail (Time based now: roughly every 0.05s)
        this.particleTimer += dt;
        if (this.particleTimer > 0.05) {
            this.particleTimer = 0;
            const trailColors = this.player.appearance.trail.colors;
            const color = trailColors[Math.floor(Math.random() * trailColors.length)];
            this.spawnParticles(this.player.x, this.player.y + 25, color, 1);
        }

        // Spawning Obstacles
        this.obstacleTimer += dt;
        if (this.obstacleTimer > this.currentSpawnInterval) {
            this.obstacleTimer = 0;
            // Spawn at logicalWidth so it appears just off the right edge of the logical view
            this.obstacles.push(new Obstacle(this.logicalWidth, LOGICAL_HEIGHT, Config.GROUND_HEIGHT));
        }

        // Spawning Clouds
        this.cloudTimer += dt;
        if (this.cloudTimer > 2.5) { // Fixed interval for clouds
            this.cloudTimer = 0;
            this.clouds.push(new Cloud(this.logicalWidth, LOGICAL_HEIGHT));
        }

        // Update Obstacles & Collision
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.update(dt, this.gameSpeed, LOGICAL_HEIGHT, Config.GROUND_HEIGHT);

            // Collision using Utility
            // Padding of 10 creates a forgiving hit box
            if (PhysicsUtils.checkCollision(this.player, o, 10)) {
                this.gameOver();
                return;
            }

            if (o.isOffscreen) {
                o.destroy();
                this.obstacles.splice(i, 1);
                this.score++;
                if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`;

                // Increase speed and difficulty
                if (this.score % 10 === 0) {
                    this.gameSpeed = Math.min(this.gameSpeed + Config.SPEED_INCREMENT, Config.MAX_GAME_SPEED);
                    this.currentSpawnInterval = Math.max(Config.SPAWN_INTERVAL_MIN, this.currentSpawnInterval - 0.1);
                }
            }
        }

        // Update Clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            this.clouds[i].update(dt);
            if (this.clouds[i].isOffscreen) {
                this.clouds[i].destroy();
                this.clouds.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].isDead) this.particles.splice(i, 1);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // IMPORTANT: Apply the scale so that 1 logical unit = scaleRatio physical pixels
        this.ctx.scale(this.scaleRatio, this.scaleRatio);

        // Clouds
        this.clouds.forEach(c => c.draw(this.ctx));

        // Ground
        this.ctx.fillStyle = '#8ce68c';
        // Draw ground at LOGICAL_HEIGHT
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.logicalWidth, Config.GROUND_HEIGHT);
        this.ctx.fillStyle = '#76c476';
        this.ctx.fillRect(0, LOGICAL_HEIGHT - Config.GROUND_HEIGHT, this.logicalWidth, 5);

        // Assets
        this.particles.forEach(p => p.draw(this.ctx));
        this.obstacles.forEach(o => o.draw(this.ctx));
        this.player.draw(this.ctx);

        // Dynamic Environment Details
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

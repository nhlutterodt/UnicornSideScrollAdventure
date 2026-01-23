import { Player } from './entities/Player.js';
import { Item } from './entities/Item.js';
import { Config } from './Config.js';
import { engineRegistry } from './core/Registry.js';
import { LevelUtils } from './utils/LevelUtils.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';

/**
 * ITEM-LAB-MAIN.js
 * Specialized driver for testing the Item System.
 */
class ItemLab {
    constructor() {
        this.canvas = document.getElementById('itemCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = new ParticleSystem();
        this.effects = new EffectSystem(this.particles);
        
        // Ground constant for lab
        this.GROUND_Y = 500 - Config.GROUND_HEIGHT;

        this.player = new Player();
        this.player.x = 100;
        this.player.y = this.GROUND_Y - 50;

        this.lastTime = 0;
        this.setupEventListeners();
        
        requestAnimationFrame(this.loop.bind(this));
    }

    setupEventListeners() {
        // Human input
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyW') {
                this.player.jump(Config, (x, y, color) => {
                    this.particles.play('LAND_DUST', { x, y, color });
                });
            }
        });

        // Specific Spawns
        this.bindSpawn('spawnLife', 'extra_life');
        this.bindSpawn('spawnStar', 'invincibility_star');
        this.bindSpawn('spawnFeather', 'gravity_feather');
        this.bindSpawn('spawnStone', 'heavy_stone');
        this.bindSpawn('spawnLaser', 'ability_lasers');
        this.bindSpawn('spawnRoar', 'ability_roar');

        document.getElementById('spawnRandom').onclick = () => {
            const y = LevelUtils.getRandomSpawnY(500, Config.GROUND_HEIGHT);
            LevelUtils.spawnRandomItem(700, y);
        };

        document.getElementById('clearItems').onclick = () => {
            const items = engineRegistry.getByType('item');
            items.forEach(i => i.destroy());
        };

        document.getElementById('resetPlayer').onclick = () => {
            this.player.lives = 1;
            this.player.invincibleTimer = 0;
            this.player.physicsMod = { gravityMultiplier: 1, jumpMultiplier: 1 };
            this.player.physicsModTimer = 0;
            this.player.abilities = [];
            this.player.currentAbilityIndex = -1;
        };
    }

    bindSpawn(btnId, itemId) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        btn.onclick = () => {
            const data = Config.ITEMS.find(i => i.id === itemId);
            const y = LevelUtils.getRandomSpawnY(500, Config.GROUND_HEIGHT);
            new Item(700, y, data);
        };
    }

    update(dt) {
        const context = {
            config: Config,
            logicalHeight: 500,
            registry: engineRegistry,
            particles: this.particles
        };

        // Player physics
        this.player.update(dt, context);
        
        // Item physics/movement
        const items = engineRegistry.getByType('item');
        items.forEach(item => {
            item.x -= 150 * dt; // Slow scroll to the left
            if (item.x < -50) item.destroy();
        });

        // Collision
        CollisionSystem.resolve(engineRegistry, this.particles);
        this.particles.update(dt, context);

        this.updateUI();
    }

    updateUI() {
        document.getElementById('livesStat').textContent = `💖 x${this.player.lives}`;
        
        const physEl = document.getElementById('physicsStat');
        if (this.player.physicsMod.gravityMultiplier !== 1) {
            physEl.textContent = `⚡ Float Mode (${this.player.physicsMod.gravityMultiplier}x G)`;
            physEl.classList.add('lab-status-active');
            physEl.classList.remove('lab-status-normal');
        } else {
            physEl.textContent = `⚡ Normal Physics`;
            physEl.classList.add('lab-status-normal');
            physEl.classList.remove('lab-status-active');
        }

        const invincEl = document.getElementById('invincibilityStat');
        if (this.player.invincibleTimer > 0) {
            invincEl.classList.remove('is-hidden');
        } else {
            invincEl.classList.add('is-hidden');
        }
    }

    draw() {
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(0, 0, 800, 500);

        // Ground
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, this.GROUND_Y, 800, Config.GROUND_HEIGHT);

        this.player.draw(this.ctx);
        
        const items = engineRegistry.getByType('item');
        items.forEach(item => item.draw(this.ctx));

        this.particles.draw(this.ctx);
    }

    loop(timestamp) {
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }
}

new ItemLab();

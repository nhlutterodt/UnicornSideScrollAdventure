import { Player } from './entities/Player.js';
import { Item } from './entities/Item.js';
import { Config } from './Config.js';
import { engineRegistry } from './core/Registry.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { LevelUtils } from './utils/LevelUtils.js';

/**
 * ITEMS-TEST-MAIN.js
 * Sandbox for testing the decoupled Item and Ability system.
 */
class ItemsLab {
    constructor() {
        this.canvas = document.getElementById('labCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.logElement = document.getElementById('eventLog');
        
        // Systems
        this.particles = new ParticleSystem();
        this.effects = new EffectSystem(this.particles);
        
        // Initial State
        this.isAutoSpawning = false;
        this.lastTime = 0;
        this.spawnTimer = 0;

        // Player setup
        this.player = new Player({
            body: '#ff7eb9',
            mane: '#ffd700',
            accessory: '🎩',
            trail: { colors: ['#ff7eb9', '#7afcff'] }
        });
        this.player.x = 150;
        this.player.y = 250;

        this.init();
    }

    init() {
        this.setupButtons();
        this.setupControls();
        
        // Kick off loop
        requestAnimationFrame(this.loop.bind(this));
        this.log('Lab Ready. Use buttons to spawn items or WASD to move.');
    }

    setupButtons() {
        const container = document.getElementById('itemSpawnButtons');
        
        Config.ITEMS.forEach(itemData => {
            const btn = document.createElement('button');
            btn.className = 'lab-btn';
            
            // Resolve icon/color for UI preview
            let displayIcon = itemData.icon || '✨';
            if (itemData.type === 'ability') {
                const ability = Config.ABILITIES.find(a => a.id === itemData.abilityId);
                if (ability) displayIcon = ability.icon;
            }

            btn.innerHTML = `<span>${displayIcon}</span> ${itemData.name || itemData.id}`;
            btn.onclick = () => this.spawnItem(itemData);
            container.appendChild(btn);
        });

        document.getElementById('toggleAutoSpawn').onclick = (e) => {
            this.isAutoSpawning = !this.isAutoSpawning;
            e.target.textContent = this.isAutoSpawning ? '🛑 Stop Generation' : '▶️ Start Wave Generation';
            this.log(this.isAutoSpawning ? 'Auto-spawn enabled' : 'Auto-spawn disabled');
        };
    }

    setupControls() {
        const keys = {};
        window.onkeydown = (e) => {
            keys[e.code] = true;
            
            // Hotkeys
            if (e.code === 'Space') {
                this.player.useAbility(this.effects, { registry: engineRegistry });
            }
            if (e.key === 'q') this.player.cycleAbility(-1);
            if (e.key === 'e') this.player.cycleAbility(1);
        };
        window.onkeyup = (e) => keys[e.code] = false;

        this.keys = keys;
    }

    spawnItem(itemData) {
        const x = this.canvas.width + 50;
        const y = LevelUtils.getRandomSpawnY(this.canvas.height, Config.GROUND_HEIGHT);
        const item = new Item(x, y, itemData);
        this.log(`Spawned Item: ${itemData.id} at [${Math.round(x)}, ${Math.round(y)}]`);
        return item;
    }

    log(msg, type = '') {
        const entry = document.createElement('div');
        entry.className = `lab-log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
        this.logElement.prepend(entry);
    }

    update(dt) {
        // Player manual movement (for testing collisions)
        const moveSpeed = 300;
        if (this.keys['KeyW']) this.player.y -= moveSpeed * dt;
        if (this.keys['KeyS']) this.player.y += moveSpeed * dt;
        if (this.keys['KeyA']) this.player.x -= moveSpeed * dt;
        if (this.keys['KeyD']) this.player.x += moveSpeed * dt;

        // Auto Spawning logic
        if (this.isAutoSpawning) {
            this.spawnTimer += dt;
            if (this.spawnTimer > 1.5) {
                this.spawnTimer = 0;
                const item = LevelUtils.spawnRandomItem(this.canvas.width + 50, LevelUtils.getRandomSpawnY(this.canvas.height, Config.GROUND_HEIGHT));
                if (item) this.log(`Auto-spawned: ${item.itemData.id}`, 'effect');
            }
        }

        const context = {
            config: Config,
            logicalHeight: this.canvas.height,
            gameSpeed: this.isAutoSpawning ? 400 : 0, // Items only move if auto-spawning or simulated speed
            registry: engineRegistry,
            particles: this.particles
        };

        // Systems
        this.particles.update(dt, context);
        this.effects.update(dt, context);
        
        // Entities
        engineRegistry.updateAll(dt, context);
        CollisionSystem.resolve(engineRegistry, this.particles);

        // Track state changes for UI
        this.updateStatsUI();
    }

    updateStatsUI() {
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
        
        // Re-use ability UI logic
        this.updateAbilityUI();
    }

    updateAbilityUI() {
        const inventory = document.getElementById('abilityInventory');
        inventory.innerHTML = '';
        this.player.abilities.forEach((ability, index) => {
            const card = document.createElement('div');
            card.className = `ability-card ${index === this.player.currentAbilityIndex ? 'active' : ''}`;
            card.innerHTML = `<div class="ability-icon">${ability.icon}</div>`;
            inventory.appendChild(card);
        });
    }

    loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Ground line
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - Config.GROUND_HEIGHT);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - Config.GROUND_HEIGHT);
        this.ctx.stroke();

        this.particles.draw(this.ctx);
        engineRegistry.entities.forEach(entity => entity.draw(this.ctx));
        this.effects.draw(this.ctx);
    }
}

// Global instance for debugging
window.lab = new ItemsLab();

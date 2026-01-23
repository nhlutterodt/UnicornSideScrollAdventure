import { Player } from './entities/Player.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';
import { Config } from './Config.js';
import { engineRegistry } from './core/Registry.js';
import { Storage } from './systems/Storage.js';

/**
 * POWERS-TEST-MAIN.js
 * Sandbox for testing ability timing, UI feedback, and visual effects.
 */

class PowersLab {
    constructor() {
        this.canvas = document.getElementById('abilityCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.inventoryElement = document.getElementById('abilityInventory');
        
        this.particles = new ParticleSystem();
        this.effects = new EffectSystem(this.particles);
        
        // Setup Player with default outfit
        const outfit = {
            body: '#ff7eb9',
            mane: '#ffd700',
            accessory: '🎩',
            trail: { colors: ['#ff7eb9', '#7afcff'] }
        };
        this.player = new Player(outfit);
        this.player.x = 100;
        this.player.y = 500 - Config.GROUND_HEIGHT - this.player.height;

        this.lastTime = 0;
        this.init();
    }

    init() {
        const spawnContainer = document.getElementById('spawnButtons');
        
        // Create buttons for each defined ability in Config
        Config.ABILITIES.forEach((ability, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerHTML = `<span>${ability.icon}</span> ${ability.name}`;
            btn.onclick = () => this.grantPower(ability);
            spawnContainer.appendChild(btn);
        });

        // Controls
        document.getElementById('useCurrent').onclick = () => {
            const context = { registry: engineRegistry, particles: this.particles };
            this.player.useAbility(this.effects, context);
        };
        document.getElementById('clearAll').onclick = () => {
            this.player.abilities = [];
            this.player.currentAbilityIndex = -1;
        };

        // Keybindings
        window.addEventListener('keydown', (e) => {
            const context = { registry: engineRegistry, particles: this.particles };
            if (e.code === 'Space') this.player.useAbility(this.effects, context);
            if (e.key === 'q') this.player.cycleAbility(-1);
            if (e.key === 'e') this.player.cycleAbility(1);
            if (e.key === 'w') this.player.jump(Config, (x, y, color) => this.particles.play('LAND_DUST', { x, y, color }));
            
            const num = parseInt(e.key);
            if (num > 0 && num <= Config.ABILITIES.length) {
                this.grantPower(Config.ABILITIES[num - 1]);
            }
        });

        requestAnimationFrame(this.loop.bind(this));
    }

    grantPower(abilityData) {
        this.player.addAbility(abilityData);
        // Play pickup effect
        this.particles.play('PICKUP_BURST', { 
            x: this.player.x + this.player.width/2, 
            y: this.player.y + this.player.height/2 
        });
    }

    updateAbilityUI() {
        if (!this.inventoryElement) return;
        this.inventoryElement.innerHTML = '';

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
            this.inventoryElement.appendChild(card);
        });
    }

    loop(currentTime) {
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        const context = {
            config: Config,
            logicalHeight: 500,
            gameSpeed: 0 // Stationary
        };

        // Update player & particles
        this.player.update(Math.min(dt, 0.1), context);
        this.particles.update(Math.min(dt, 0.1), context);
        this.effects.update(Math.min(dt, 0.1), { ...context, registry: engineRegistry, particles: this.particles });
        
        this.updateAbilityUI();
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Ground
        const groundY = 500 - Config.GROUND_HEIGHT;
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, groundY, this.canvas.width, Config.GROUND_HEIGHT);
        this.ctx.strokeStyle = '#4a4e69';
        this.ctx.strokeRect(0, groundY, this.canvas.width, 1);

        this.particles.draw(this.ctx);
        this.effects.draw(this.ctx);
        this.player.draw(this.ctx);
    }
}

new PowersLab();

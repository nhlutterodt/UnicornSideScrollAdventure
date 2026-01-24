import { ParticleSystem } from './systems/ParticleSystem.js';
import { Config } from './Config.js';
import { engineRegistry } from './core/Registry.js';
import { Logger } from './utils/Logger.js';

/**
 * PARTICLE-TEST-MAIN.js
 * Specialized entry point for stress-testing and visual tuning of the particle engine.
 */

class ParticleLab {
    constructor() {
        this.canvas = document.getElementById('testCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = new ParticleSystem();
        
        this.lastTime = 0;
        this.gameSpeed = 0; // Stationary for testing, or can be simulated
        
        this.init();
    }

    init() {
        // Event Listeners for UI
        document.querySelectorAll('[data-effect]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const effectId = e.target.dataset.effect;
                this.triggerEffect(effectId);
            });
        });

        document.getElementById('toggleDebug').addEventListener('click', () => {
            Config.PARTICLE_DEBUG = !Config.PARTICLE_DEBUG;
        });

        document.getElementById('clearParticles').addEventListener('click', () => {
            this.particles.active.fill(0);
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.particles.play('IMPACT_SPARK', { x, y });
        });

        // Start the lab loop
        requestAnimationFrame(this.loop.bind(this));
        
        Logger.log('ParticleLab', 'Particle Lab Initialized. Max Capacity:', Config.PARTICLE_SYSTEM.MAX_PARTICLES);
    }

    triggerEffect(effectId) {
        // Center of canvas
        const x = this.canvas.width / 2;
        const y = this.canvas.height / 2;
        
        this.particles.play(effectId, { x, y });
    }

    loop(currentTime) {
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Simplified context for the particle system
        const context = {
            gameSpeed: this.gameSpeed, // Can be changed to simulate running
            logicalHeight: 500
        };

        this.update(Math.min(dt, 0.1), context);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    update(dt, context) {
        this.particles.update(dt, context);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a simulated ground line if needed
        const groundY = 500 - Config.GROUND_HEIGHT;
        this.ctx.strokeStyle = '#4a4e69';
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.canvas.width, groundY);
        this.ctx.stroke();

        this.particles.draw(this.ctx);
    }
}

// Instantiate the lab
const lab = new ParticleLab();
window.lab = lab; // Expose for console hacking

import { Config } from '../Config.js';
import { PhysicsUtils, CollisionLayers } from '../utils/PhysicsUtils.js';
import { engineRegistry } from '../core/Registry.js';

/**
 * PARTICLE_SYSTEM.js
 * High-performance, SoA-based particle engine.
 * Handles tiered collision and budgeted updates.
 */
export class ParticleSystem {
    constructor() {
        const cfg = Config.PARTICLE_SYSTEM;
        this.maxParticles = cfg.MAX_PARTICLES;
        
        // Structure of Arrays (SoA) for better cache locality and zero-GC updates
        this.x = new Float32Array(this.maxParticles);
        this.y = new Float32Array(this.maxParticles);
        this.vx = new Float32Array(this.maxParticles);
        this.vy = new Float32Array(this.maxParticles);
        this.age = new Float32Array(this.maxParticles);
        this.life = new Float32Array(this.maxParticles);
        this.size = new Float32Array(this.maxParticles);
        this.gravity = new Float32Array(this.maxParticles);
        this.tier = new Int8Array(this.maxParticles);
        this.active = new Uint8Array(this.maxParticles);
        
        // Visual data (per-index)
        this.colors = new Array(this.maxParticles).fill('#ffffff');
        
        this.count = 0;
        this.nextIndex = 0;

        // Pre-computed Look-Up Tables (LUTs) for curves
        this.alphaLUT = new Float32Array(128);
        this.sizeLUT = new Float32Array(128);
        this.initLUTs();

        // Performance Metrics
        this.metrics = {
            activeCount: 0,
            tier2Checks: 0,
            budgetDrops: 0
        };
    }

    /**
     * Pre-computes easing curves to avoid per-particle math.
     */
    initLUTs() {
        for (let i = 0; i < 128; i++) {
            const t = i / 127;
            // Linear fade out for alpha
            this.alphaLUT[i] = 1.0 - t;
            // Slight shrink over lifetime
            this.sizeLUT[i] = 1.0 - (t * 0.5);
        }
    }

    /**
     * Triggers a particle effect burst.
     * @param {string} effectId 
     * @param {Object} params - {x, y, color?, vx?, vy?}
     */
    play(effectId, params) {
        const effect = Config.EFFECTS[effectId];
        if (!effect) return;

        const count = effect.count || 1;
        for (let i = 0; i < count; i++) {
            this.spawn(effect, params);
        }
    }

    /**
     * Internal: Spawns a single particle into the circular buffer.
     */
    spawn(effect, params) {
        const idx = this.nextIndex;
        
        this.active[idx] = 1;
        this.x[idx] = params.x;
        this.y[idx] = params.y;
        
        // Randomize based on effect range
        const lifeRange = effect.life || [0.5, 1.0];
        this.life[idx] = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
        this.age[idx] = 0;

        const speedRange = effect.speed || [50, 100];
        const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
        const angle = Math.random() * Math.PI * 2;
        
        this.vx[idx] = (params.vx || 0) + Math.cos(angle) * speed;
        this.vy[idx] = (params.vy || 0) + Math.sin(angle) * speed;
        
        const sizeRange = effect.size || [2, 5];
        this.size[idx] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
        
        this.gravity[idx] = effect.gravity || 0;
        this.tier[idx] = effect.tier || 0;
        this.colors[idx] = params.color || effect.color || '#ffffff';

        this.nextIndex = (this.nextIndex + 1) % this.maxParticles;
    }

    /**
     * Updates all active particles with tiered collision logic.
     */
    update(dt, context) {
        const { gameSpeed, logicalHeight } = context;
        const cfg = Config.PARTICLE_SYSTEM;
        const groundY = (logicalHeight || 600) - Config.GROUND_HEIGHT;

        this.metrics.activeCount = 0;
        this.metrics.tier2Checks = 0;
        this.metrics.budgetDrops = 0;

        // Collect Tier 2 candidates once per frame
        const candidates = engineRegistry.getEntitiesByLayers(
            CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM
        );

        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.active[i]) continue;

            const prevX = this.x[i];
            const prevY = this.y[i];

            // 1. Integration (including world scroll)
            this.vy[i] += this.gravity[i] * dt;
            this.x[i] += (this.vx[i] - gameSpeed) * dt;
            this.y[i] += this.vy[i] * dt;
            this.age[i] += dt;

            // 2. Lifecycle check
            if (this.age[i] >= this.life[i] || this.x[i] < -cfg.DESPAWN_MARGIN) {
                this.active[i] = 0;
                continue;
            }

            this.metrics.activeCount++;

            // 3. Tiered Collision
            let currentTier = this.tier[i];

            // Downgrade Tier 2 if budget exceeded
            if (currentTier === 2 && this.metrics.tier2Checks >= cfg.TIER2_MAX_CHECKS_PER_FRAME) {
                currentTier = 1;
                this.metrics.budgetDrops++;
            }

            if (currentTier === 2) {
                // Tier 2: Entity collision with swept-point check
                for (const entity of candidates) {
                    if (this.metrics.tier2Checks >= cfg.TIER2_MAX_CHECKS_PER_FRAME) break;
                    
                    this.metrics.tier2Checks++;
                    if (PhysicsUtils.testSegmentVsAABB(prevX, prevY, this.x[i], this.y[i], entity)) {
                        this.active[i] = 0; // Destroy particle on hit for simplicity
                        break;
                    }
                }
            } 
            
            if (currentTier === 1) {
                // Tier 1: Ground collision
                if (this.y[i] >= groundY) {
                    this.y[i] = groundY;
                    this.vy[i] *= -0.3; // Simple bounce
                    if (Math.abs(this.vy[i]) < 10) this.active[i] = 0; // Settle and die
                }
            }
        }
    }

    /**
     * Draws active particles using LUT-driven visuals.
     */
    draw(ctx) {
        ctx.save();
        
        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.active[i]) continue;

            const t = Math.min(this.age[i] / this.life[i], 1);
            const lutIdx = Math.floor(t * 127);
            
            const alpha = this.alphaLUT[lutIdx];
            const sizeScale = this.sizeLUT[lutIdx];
            const currentSize = this.size[i] * sizeScale;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.colors[i];
            
            // Draw as squares for performance, or circles if fidelity is required
            ctx.fillRect(
                this.x[i] - currentSize / 2, 
                this.y[i] - currentSize / 2, 
                currentSize, 
                currentSize
            );
        }

        if (Config.PARTICLE_DEBUG) {
            this.drawDebug(ctx);
        }

        ctx.restore();
    }

    drawDebug(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(`Particles: ${this.metrics.activeCount}`, 10, 80);
        ctx.fillText(`T2 Checks: ${this.metrics.tier2Checks}`, 10, 95);
        ctx.fillText(`Drops: ${this.metrics.budgetDrops}`, 10, 110);
    }
}

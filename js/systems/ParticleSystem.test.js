import { ParticleSystem } from './ParticleSystem.js';
import { Config } from '../Config.js';
import { engineRegistry } from '../core/Registry.js';

describe('ParticleSystem spawn saturation behavior', () => {
    const originalMaxParticles = Config.PARTICLE_SYSTEM.MAX_PARTICLES;

    beforeEach(() => {
        engineRegistry.clear();
    });

    afterEach(() => {
        Config.PARTICLE_SYSTEM.MAX_PARTICLES = originalMaxParticles;
        engineRegistry.clear();
    });

    test('spawning fewer than maxParticles leaves all spawned particles alive and distinct', () => {
        Config.PARTICLE_SYSTEM.MAX_PARTICLES = 4;
        const system = new ParticleSystem();
        const effect = {
            life: [5, 5],
            speed: [0, 0],
            size: [2, 2],
            gravity: 0,
            tier: 0,
            color: '#fff'
        };

        system.spawn(effect, { x: 10, y: 1 });
        system.spawn(effect, { x: 20, y: 2 });
        system.spawn(effect, { x: 30, y: 3 });

        expect(system.active[0]).toBe(1);
        expect(system.active[1]).toBe(1);
        expect(system.active[2]).toBe(1);
        expect(system.active[3]).toBe(0);
        expect(system.x[0]).toBe(10);
        expect(system.x[1]).toBe(20);
        expect(system.x[2]).toBe(30);
        expect(system.y[0]).toBe(1);
        expect(system.y[1]).toBe(2);
        expect(system.y[2]).toBe(3);
    });

    test('spawning maxParticles + 1 does not overwrite first live particle slot', () => {
        Config.PARTICLE_SYSTEM.MAX_PARTICLES = 3;
        const system = new ParticleSystem();
        const effect = {
            life: [999, 999],
            speed: [0, 0],
            size: [1, 1],
            gravity: 0,
            tier: 0,
            color: '#abc'
        };

        system.spawn(effect, { x: 100, y: 1, color: '#111' });
        system.spawn(effect, { x: 200, y: 2, color: '#222' });
        system.spawn(effect, { x: 300, y: 3, color: '#333' });

        const firstBefore = {
            active: system.active[0],
            x: system.x[0],
            y: system.y[0],
            age: system.age[0],
            life: system.life[0],
            color: system.colors[0]
        };

        system.spawn(effect, { x: 999, y: 999, color: '#999' });

        expect(system.active[0]).toBe(firstBefore.active);
        expect(system.x[0]).toBe(firstBefore.x);
        expect(system.y[0]).toBe(firstBefore.y);
        expect(system.age[0]).toBe(firstBefore.age);
        expect(system.life[0]).toBe(firstBefore.life);
        expect(system.colors[0]).toBe(firstBefore.color);
        expect(system.nextIndex).toBe(0);
    });

    test('expired particles free slots that can be reused by later spawns', () => {
        Config.PARTICLE_SYSTEM.MAX_PARTICLES = 2;
        const system = new ParticleSystem();
        const shortLife = {
            life: [0.05, 0.05],
            speed: [0, 0],
            size: [1, 1],
            gravity: 0,
            tier: 0,
            color: '#fff'
        };

        system.spawn(shortLife, { x: 10, y: 10 });
        system.spawn(shortLife, { x: 20, y: 20 });

        system.update(0.1, { gameSpeed: 0, logicalHeight: 600 });

        expect(system.active[0]).toBe(0);
        expect(system.active[1]).toBe(0);

        system.spawn(shortLife, { x: 50, y: 50 });

        expect(system.active[0]).toBe(1);
        expect(system.x[0]).toBe(50);
        expect(system.y[0]).toBe(50);
    });

    test('middle slot reclamation when write pointer points to active slot', () => {
        Config.PARTICLE_SYSTEM.MAX_PARTICLES = 3;
        const system = new ParticleSystem();
        const effect = {
            life: [999, 999],
            speed: [0, 0],
            size: [1, 1],
            gravity: 0,
            tier: 0,
            color: '#fff'
        };

        system.spawn(effect, { x: 10, y: 10 });
        system.spawn(effect, { x: 20, y: 20 });
        system.spawn(effect, { x: 30, y: 30 });

        // Pool is full. nextIndex is 0.
        // Manually expire slot 1, while slot 0 and 2 remain active
        system.active[1] = 0;

        // Try spawning. It should find slot 1, even though nextIndex points to slot 0 (which is active)
        system.spawn(effect, { x: 42, y: 42 });

        expect(system.active[0]).toBe(1);
        expect(system.active[1]).toBe(1); // Reclaimed!
        expect(system.active[2]).toBe(1);
        expect(system.x[1]).toBe(42);
        expect(system.nextIndex).toBe(2); // (1 + 1) % 3
    });

    test('broadphase proximity filtering bypasses far-away obstacles', () => {
        // Set up mock obstacles in registry
        const nearObstacle = {
            collisionLayer: 2, // CollisionLayers.OBSTACLE
            x: 100,
            y: 100,
            width: 32,
            height: 32,
            isDead: false
        };
        const farObstacle = {
            collisionLayer: 2, // CollisionLayers.OBSTACLE
            x: 500,
            y: 100,
            width: 32,
            height: 32,
            isDead: false
        };

        engineRegistry.register(nearObstacle, 'obstacle');
        engineRegistry.register(farObstacle, 'obstacle');

        const system = new ParticleSystem();
        const tier2Effect = {
            life: [1, 1],
            speed: [0, 0],
            size: [2, 2],
            gravity: 0,
            tier: 2, // Enable Tier 2 sweeps
            color: '#fff'
        };

        // Spawn particle 0 near nearObstacle
        // Particle is at x=90 (within 50px of obstacle at 100)
        system.spawn(tier2Effect, { x: 90, y: 110, vx: 0, vy: 0 });

        // Spawn particle 1 far from both obstacles
        // Particle is at x=300 (more than 50px from obstacle at 100 and obstacle at 500)
        system.spawn(tier2Effect, { x: 300, y: 110, vx: 0, vy: 0 });

        // Update the particle system.
        // Particle 0 checks nearObstacle (Diff = 10 <= 50) and skips farObstacle (Diff = 410 > 50).
        // Particle 1 skips both obstacles (Diff = 200 > 50).
        // Total Tier 2 checks should be exactly 1.
        system.update(0.016, { gameSpeed: 0, logicalHeight: 600 });

        expect(system.metrics.tier2Checks).toBe(1);
    });
});

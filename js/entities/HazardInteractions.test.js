import { jest } from '@jest/globals';
import { IceSpike, LavaGeyser, NeonBarrier } from './SpecialHazards.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { eventManager } from '../systems/EventManager.js';
import { engineRegistry } from '../core/Registry.js';
import { entityPool } from '../core/EntityPool.js';
import { Config } from '../Config.js';

describe('Hazard to Hazard Interactions', () => {
    let scoreManager;
    let particles;
    let context;

    beforeEach(() => {
        engineRegistry.clear();
        entityPool.reset();
        eventManager.clearAll(); // Ensure event mock isolation

        scoreManager = new ScoreManager();
        scoreManager.reset();

        particles = {
            play: jest.fn()
        };

        context = {
            config: Config,
            viewport: { logicalWidth: 800, logicalHeight: 600 }
        };
    });

    test('IceSpike colliding with LavaGeyser causes mutual destruction and awards points', () => {
        // Construct and position overlapping hazards on the ground
        // Both default to ground y level (groundY = 600 - 60 = 540)
        // IceSpike constructor: (x, y, width, height, yOffset)
        // Heights: IceSpike = 90, LavaGeyser = 80
        // Grounded positions:
        // IceSpike y = 540 - 90 = 450
        // LavaGeyser y = 540 - 80 = 460
        const spike = entityPool.acquire(IceSpike, 100, 450, 30, 90);
        const geyser = entityPool.acquire(LavaGeyser, 110, 460, 50, 80);

        // Ensure collision layer and mask include OBSTACLE
        expect(spike.collisionMask & geyser.collisionLayer).not.toBe(0);
        expect(geyser.collisionMask & spike.collisionLayer).not.toBe(0);

        // Resolve collisions
        CollisionSystem.resolve(engineRegistry, particles, context);

        // Expect both to be dead/destroyed
        expect(spike.isDead).toBe(true);
        expect(geyser.isDead).toBe(true);

        // Expect 50 bonus points to have been awarded to the player
        expect(scoreManager.getScore()).toBe(50);
        
        // Expect STEAM_BURST particle effect to have been played at midpoint
        expect(particles.play).toHaveBeenCalledWith('STEAM_BURST', {
            x: 105,
            y: 455,
            color: '#ffffff'
        });
    });

    test('IceSpike colliding with NeonBarrier causes IceSpike destruction only', () => {
        // NeonBarrier height = 100 -> y = 540 - 100 = 440
        const spike = entityPool.acquire(IceSpike, 100, 450, 30, 90);
        const barrier = entityPool.acquire(NeonBarrier, 110, 440, 20, 100);

        // Resolve collisions
        CollisionSystem.resolve(engineRegistry, particles, context);

        // Expect IceSpike to be destroyed, but NeonBarrier to survive
        expect(spike.isDead).toBe(true);
        expect(barrier.isDead).toBe(false);

        // Expect 50 points awarded
        expect(scoreManager.getScore()).toBe(50);
    });
});

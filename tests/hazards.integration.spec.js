import { test, expect } from '@playwright/test';

test.describe('spawning and hazard interactions integration tests', () => {
    
    test.beforeEach(async ({ page }) => {
        // Load index and transition to PLAYING state before each test
        await page.goto('/index.html', { waitUntil: 'load' });
        await page.click('[data-action-id="startGame"]');
        const gameContainer = page.locator('#gameContainer');
        await expect(gameContainer).toHaveAttribute('data-state', 'PLAYING');
    });

    test('should dynamically resolve and spawn hazards via entityFactory', async ({ page }) => {
        const spawnedDetails = await page.evaluate(async () => {
            const { entityFactory } = await import('/js/factories/EntityFactory.js');
            const { IceSpike } = await import('/js/entities/SpecialHazards.js');
            
            const spike = entityFactory.create('ice_spike', 200, 300, 40, 80);
            return {
                isInstance: spike instanceof IceSpike,
                x: spike.x,
                y: spike.y,
                width: spike.width,
                height: spike.height
            };
        });

        expect(spawnedDetails.isInstance).toBe(true);
        expect(spawnedDetails.x).toBe(200);
        expect(spawnedDetails.y).toBe(300);
        expect(spawnedDetails.width).toBe(40);
        expect(spawnedDetails.height).toBe(80);
    });

    test('colliding IceSpike and LavaGeyser should trigger destroy_both interaction and award score', async ({ page }) => {
        await page.evaluate(async () => {
            const { entityFactory } = await import('/js/factories/EntityFactory.js');
            const { eventManager } = await import('/js/systems/EventManager.js');

            // Reset score for test predictability
            window.game.scoreManager.reset();

            window.lastInteraction = null;
            eventManager.on('HAZARD_INTERACTION', (data) => {
                window.lastInteraction = data;
            });

            // Spawn overlapping hazards
            // ice_spike (height=90, ground_y=540) -> y = 540-90 = 450
            // lava_geyser (height=80, ground_y=540) -> y = 540-80 = 460
            const spike = entityFactory.create('ice_spike', 100, 450, 30, 90);
            const geyser = entityFactory.create('lava_geyser', 110, 460, 50, 80);
        });

        // Wait for running game collision loop to detect and resolve interaction
        await page.waitForFunction(() => window.lastInteraction !== null, { timeout: 3000 });

        const score = await page.evaluate(() => window.game.scoreManager.getScore());
        expect(score).toBe(50);

        const payload = await page.evaluate(() => window.lastInteraction);
        expect(payload.typeA).toBe('ice_spike');
        expect(payload.typeB).toBe('lava_geyser');
        expect(payload.action).toBe('destroy_both');
    });

    test('colliding IceSpike and NeonBarrier should trigger destroy_first (IceSpike only) and award score', async ({ page }) => {
        const barrierAliveStatus = await page.evaluate(async () => {
            const { entityFactory } = await import('/js/factories/EntityFactory.js');
            const { eventManager } = await import('/js/systems/EventManager.js');

            window.game.scoreManager.reset();

            window.lastInteraction = null;
            eventManager.on('HAZARD_INTERACTION', (data) => {
                window.lastInteraction = data;
            });

            // Spawn overlapping hazards
            // ice_spike (height=90) -> y = 540-90 = 450
            // neon_barrier (height=100) -> y = 540-100 = 440
            const spike = entityFactory.create('ice_spike', 150, 450, 30, 90);
            const barrier = entityFactory.create('neon_barrier', 160, 440, 20, 100);

            // Store barrier id to query its state later
            window.testBarrierId = barrier.id;
        });

        // Wait for interaction to resolve
        await page.waitForFunction(() => window.lastInteraction !== null, { timeout: 3000 });

        const score = await page.evaluate(() => window.game.scoreManager.getScore());
        expect(score).toBe(50);

        const payload = await page.evaluate(() => window.lastInteraction);
        expect(payload.typeA).toBe('ice_spike');
        expect(payload.typeB).toBe('neon_barrier');
        expect(payload.action).toBe('destroy_first');

        // Verify barrier is still alive while spike is dead
        const states = await page.evaluate(() => {
            const entities = Array.from(window.gameEntities.values());
            const barrier = entities.find(e => e.id === window.testBarrierId);
            const spikeExists = entities.some(e => e.entityType === 'ice_spike');
            return {
                barrierExists: !!barrier,
                barrierDead: barrier ? barrier.isDead : true,
                spikeExists
            };
        });

        expect(states.barrierExists).toBe(true);
        expect(states.barrierDead).toBe(false);
        expect(states.spikeExists).toBe(false);
    });
});

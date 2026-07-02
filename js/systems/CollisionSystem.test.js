import { jest } from '@jest/globals';
import { CollisionSystem } from './CollisionSystem.js';
import { Config } from '../Config.js';
import { logger } from '../utils/Logger.js';

function makeRegistry(count) {
    const map = new Map();
    for (let i = 0; i < count; i++) {
        // collisionLayer: 0 so the nested loop's own `continue` skips every
        // pair immediately - these tests are only exercising the budget guard,
        // not collision resolution itself.
        map.set(`e_${i}`, { collisionLayer: 0, isDead: false });
    }
    return { entities: map };
}

describe('CollisionSystem entity budget', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        // Reset the edge-triggered flag between tests since it's static/shared.
        CollisionSystem._overBudget = false;
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('does not warn while the entity count stays within budget', () => {
        const registry = makeRegistry(Config.COLLISION_SYSTEM.MAX_ENTITIES);
        CollisionSystem.resolve(registry, null, {});

        expect(warnSpy).not.toHaveBeenCalled();
    });

    test('warns once when the entity count exceeds the budget', () => {
        const registry = makeRegistry(Config.COLLISION_SYSTEM.MAX_ENTITIES + 1);
        CollisionSystem.resolve(registry, null, {});

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toBe('CollisionSystem');
    });

    test('does not re-warn every frame while sustained over budget', () => {
        const registry = makeRegistry(Config.COLLISION_SYSTEM.MAX_ENTITIES + 1);

        CollisionSystem.resolve(registry, null, {});
        CollisionSystem.resolve(registry, null, {});
        CollisionSystem.resolve(registry, null, {});

        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test('warns again after dropping back under budget and re-exceeding', () => {
        const overRegistry = makeRegistry(Config.COLLISION_SYSTEM.MAX_ENTITIES + 1);
        const underRegistry = makeRegistry(Config.COLLISION_SYSTEM.MAX_ENTITIES);

        CollisionSystem.resolve(overRegistry, null, {}); // 1st warning
        CollisionSystem.resolve(underRegistry, null, {}); // drops back under budget
        CollisionSystem.resolve(overRegistry, null, {}); // exceeds again -> 2nd warning

        expect(warnSpy).toHaveBeenCalledTimes(2);
    });
});

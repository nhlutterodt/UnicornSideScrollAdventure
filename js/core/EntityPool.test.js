import { EntityPool as EntityPoolClass, entityPool } from './EntityPool.js';
import { Entity } from './Entity.js';
import { engineRegistry } from './Registry.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { Platform } from '../entities/Platform.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

class DummyPoolable extends Entity {
    static poolable = true;

    constructor(x, y) {
        super(x, y, 10, 10, 'dummy_poolable');
        this.revivedWith = null;
    }

    revive(x, y) {
        this.reviveBase(x, y, 10, 10);
        this.revivedWith = { x, y };
    }
}

class DummyNonPoolable extends Entity {
    constructor(x, y) {
        super(x, y, 10, 10, 'dummy_non_poolable');
    }
}

describe('EntityPool', () => {
    beforeEach(() => {
        engineRegistry.clear();
    });

    describe('acquire() / release() on an isolated pool', () => {
        test('acquire() with an empty free list creates a new instance', () => {
            const pool = new EntityPoolClass();
            const a = pool.acquire(DummyPoolable, 0, 0);

            expect(a).toBeInstanceOf(DummyPoolable);
            expect(pool.getMetrics().DummyPoolable).toEqual({ created: 1, reused: 0 });
        });

        test('release() then acquire() returns the exact same object identity, not a new one', () => {
            const pool = new EntityPoolClass();
            const first = pool.acquire(DummyPoolable, 10, 20);
            pool.release(first);
            const second = pool.acquire(DummyPoolable, 99, 99);

            expect(second).toBe(first);
            expect(pool.getMetrics().DummyPoolable).toEqual({ created: 1, reused: 1 });
        });

        test('reused instances are revive()d with the new spawn args', () => {
            const pool = new EntityPoolClass();
            const first = pool.acquire(DummyPoolable, 10, 20);
            pool.release(first);
            const second = pool.acquire(DummyPoolable, 42, 84);

            expect(second.x).toBe(42);
            expect(second.y).toBe(84);
            expect(second.revivedWith).toEqual({ x: 42, y: 84 });
        });

        test('release() is a no-op for classes that do not opt into pooling', () => {
            const pool = new EntityPoolClass();
            const instance = new DummyNonPoolable(0, 0);
            pool.release(instance);

            const acquired = pool.acquire(DummyNonPoolable, 1, 1);

            expect(acquired).not.toBe(instance);
            expect(pool.getMetrics().DummyNonPoolable).toEqual({ created: 1, reused: 0 });
        });

        test('object identity stays bounded across many spawn/despawn cycles', () => {
            const pool = new EntityPoolClass();
            const seen = new Set();

            for (let i = 0; i < 50; i++) {
                const instance = pool.acquire(DummyPoolable, i, i);
                seen.add(instance);
                pool.release(instance);
            }

            // A correctly-pooled class never allocates more than one live instance
            // when every acquire() is immediately followed by a release().
            expect(seen.size).toBe(1);
            expect(pool.getMetrics().DummyPoolable).toEqual({ created: 1, reused: 49 });
        });
    });

    describe('Registry integration (the real singleton pool)', () => {
        beforeEach(() => {
            entityPool.reset();
        });

        test('an offscreen entity pruned by Registry.updateAll is handed back to the pool', () => {
            const platform = entityPool.acquire(Platform, 0, 0, 40, 20);
            platform.x = -1000; // beyond Platform's isOffscreen threshold

            engineRegistry.updateAll(0, { gameSpeed: 0, config: {} });

            const reused = entityPool.acquire(Platform, 5, 5, 40, 20);
            expect(reused).toBe(platform);
        });

        test('CrumblingPlatform sheds its crumbled/non-collidable state on revive', () => {
            const platform = entityPool.acquire(CrumblingPlatform, 100, 200, 80, 20);
            platform.activate();
            // Fast-forward past the crumble delay so it falls and disables its own collision.
            platform.update(platform.crumbleDelay + 0.1, { gameSpeed: 0, config: {} });

            expect(platform.isCrumbling).toBe(true);
            expect(platform.collisionLayer).toBe(0);

            platform.x = -1000;
            engineRegistry.updateAll(0, { gameSpeed: 0, config: {} });

            const revived = entityPool.acquire(CrumblingPlatform, 300, 50, 80, 20);

            expect(revived).toBe(platform);
            expect(revived.isCrumbling).toBe(false);
            expect(revived.collisionLayer).toBe(CollisionLayers.PLATFORM);
        });

        test('an explicit destroy() followed by a redundant unregister() does not release the same instance twice', () => {
            const platform = entityPool.acquire(Platform, 0, 0, 40, 10);
            platform.destroy();
            // Simulate the entity also being caught by Registry.updateAll's prune
            // check in the same tick - unregister() must be idempotent so the
            // pool never ends up with two references to the same live object.
            engineRegistry.unregister(platform);

            const a = entityPool.acquire(Platform, 1, 1, 40, 10);
            const b = entityPool.acquire(Platform, 2, 2, 40, 10);

            expect(a).toBe(platform);
            expect(b).not.toBe(platform);
        });
    });
});

import { jest } from '@jest/globals';
import { RenderSystem, Z_LAYERS } from './RenderSystem.js';

function makeEntity(renderLayer, isDead = false) {
    return { renderLayer, isDead, draw: () => {} };
}

function makeRegistry(entitiesArray) {
    const map = new Map();
    entitiesArray.forEach((e, i) => map.set(`e_${i}`, e));
    return { entities: map, version: 0 };
}

describe('RenderSystem draw-order cache', () => {
    let renderSystem;

    beforeEach(() => {
        renderSystem = new RenderSystem(
            { width: 100, height: 100 },
            {},
            { scaleRatio: 1, logicalWidth: 800 },
            { currentStage: null }
        );
    });

    test('returns the exact same array reference across calls when the registry has not changed', () => {
        const registry = makeRegistry([makeEntity(2), makeEntity(0)]);

        const first = renderSystem._getRenderOrder(registry, null);
        const second = renderSystem._getRenderOrder(registry, null);

        expect(second).toBe(first);
    });

    test('does not re-sort when the registry version is unchanged', () => {
        const registry = makeRegistry([makeEntity(2), makeEntity(0)]);
        renderSystem._getRenderOrder(registry, null);

        const sortSpy = jest.spyOn(Array.prototype, 'sort');
        renderSystem._getRenderOrder(registry, null);

        expect(sortSpy).not.toHaveBeenCalled();
        sortSpy.mockRestore();
    });

    test('sorts ascending by renderLayer, defaulting missing layers to ENTITIES', () => {
        const withoutLayer = { isDead: false, draw: () => {} }; // renderLayer left undefined
        const registry = makeRegistry([makeEntity(3), makeEntity(0), withoutLayer, makeEntity(1)]);

        const order = renderSystem._getRenderOrder(registry, null);

        expect(order.map(e => e.renderLayer !== undefined ? e.renderLayer : Z_LAYERS.ENTITIES))
            .toEqual([0, 1, Z_LAYERS.ENTITIES, 3]);
    });

    test('rebuilds in place (same array reference) after the registry version changes, picking up new entities', () => {
        const entityA = makeEntity(0);
        const registry = makeRegistry([entityA]);

        const first = renderSystem._getRenderOrder(registry, null);
        expect(first).toEqual([entityA]);

        const entityB = makeEntity(1);
        registry.entities.set('e_new', entityB);
        registry.version++; // simulates Registry.register()'s version bump

        const second = renderSystem._getRenderOrder(registry, null);

        expect(second).toBe(first); // same array object reused, not a fresh allocation
        expect(second).toEqual([entityA, entityB]);
    });

    test('excludes dead entities from the cached order', () => {
        const alive = makeEntity(1);
        const dead = makeEntity(1, true);
        const registry = makeRegistry([alive, dead]);

        const order = renderSystem._getRenderOrder(registry, null);

        expect(order).toEqual([alive]);
    });

    test('drops a previously-dead entity from the cache once the registry version changes again', () => {
        const alive = makeEntity(1);
        const dying = makeEntity(1);
        const registry = makeRegistry([alive, dying]);

        renderSystem._getRenderOrder(registry, null);

        dying.isDead = true;
        registry.entities.delete('e_1'); // simulates Registry.unregister() removing it
        registry.version++; // simulates Registry.unregister()'s version bump

        const order = renderSystem._getRenderOrder(registry, null);
        expect(order).toEqual([alive]);
    });
});

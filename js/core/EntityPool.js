'use strict';

/**
 * ENTITY_POOL.js
 * Per-class free-list object pool for spawned entities (Obstacle, Hazard family,
 * Platform family, Item, JumpPad, LaserEntity, Cloud). Mirrors the zero-GC intent
 * of ParticleSystem's SoA buffer, but for heterogeneous class instances that can't
 * be flattened into typed arrays - reuse is per exact class, not per entityType,
 * since some subclasses (e.g. CrumblingPlatform/Platform) share an entityType
 * string but must never be handed back out as the wrong class.
 */
export class EntityPool {
    constructor() {
        this.freeLists = new Map(); // EntityClass -> instance[]
        this.metrics = new Map();   // EntityClass -> { created, reused }
    }

    _metricsFor(EntityClass) {
        let m = this.metrics.get(EntityClass);
        if (!m) {
            m = { created: 0, reused: 0 };
            this.metrics.set(EntityClass, m);
        }
        return m;
    }

    /**
     * Returns a live instance of EntityClass, reviving a freed one if available.
     * @param {Function} EntityClass - Class opted into pooling via `static poolable = true`
     * @param {...*} args - Forwarded to `new EntityClass(...)` or `instance.revive(...)`
     */
    acquire(EntityClass, ...args) {
        const metrics = this._metricsFor(EntityClass);
        const list = this.freeLists.get(EntityClass);

        if (list && list.length > 0) {
            const instance = list.pop();
            instance.revive(...args);
            metrics.reused++;
            return instance;
        }

        metrics.created++;
        return new EntityClass(...args);
    }

    /**
     * Returns a dead/pruned entity to its class's free list, if that class opted in.
     * No-ops for non-poolable entities (Player, generic VisualEntity effects, etc).
     * @param {Object} entity
     */
    release(entity) {
        const EntityClass = entity.constructor;
        if (!EntityClass.poolable) return;

        let list = this.freeLists.get(EntityClass);
        if (!list) {
            list = [];
            this.freeLists.set(EntityClass, list);
        }
        list.push(entity);
    }

    /**
     * Debug/test helper: snapshot of created/reused counts keyed by class name.
     */
    getMetrics() {
        const snapshot = {};
        for (const [EntityClass, m] of this.metrics) {
            snapshot[EntityClass.name] = { ...m };
        }
        return snapshot;
    }

    /**
     * Test/debug helper: drops all free lists and metrics. Not part of normal
     * gameplay - the pool singleton lives for the page's lifetime.
     */
    reset() {
        this.freeLists.clear();
        this.metrics.clear();
    }
}

// Export singleton instance
export const entityPool = new EntityPool();

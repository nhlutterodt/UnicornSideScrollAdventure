'use strict';

import { entityPool } from '../core/EntityPool.js';
import { Obstacle } from '../entities/Obstacle.js';
import { LavaGeyser, IceSpike, NeonBarrier } from '../entities/SpecialHazards.js';
import { Platform } from '../entities/Platform.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { JumpPad } from '../entities/JumpPad.js';
import { Cloud } from '../entities/Cloud.js';
import { Item } from '../entities/Item.js';
import { logger } from '../utils/Logger.js';

/**
 * EntityFactory - Centralized registry for dynamic entity instantiation.
 * Registers constructor classes and delegates dynamic creation to EntityPool.
 */
class EntityFactory {
    constructor() {
        this.registry = new Map();

        // Register default game entities
        this.register('obstacle', Obstacle);
        this.register('lava_geyser', LavaGeyser);
        this.register('ice_spike', IceSpike);
        this.register('neon_barrier', NeonBarrier);
        this.register('platform', Platform);
        this.register('crumbling_platform', CrumblingPlatform);
        this.register('jump_pad', JumpPad);
        this.register('cloud', Cloud);
        this.register('item', Item);

        logger.info('EntityFactory', 'Initialized with 9 entity mappings');
    }

    /**
     * Register a new constructor class with the factory.
     * @param {string} type - Unique string identifier
     * @param {Function} EntityClass - Constructor class extending Entity
     */
    register(type, EntityClass) {
        if (typeof type !== 'string' || !type) {
            throw new Error('EntityFactory: type must be a non-empty string');
        }
        if (typeof EntityClass !== 'function') {
            throw new Error(`EntityFactory: EntityClass for type "${type}" must be a class/function`);
        }
        this.registry.set(type, EntityClass);
        logger.debug('EntityFactory', `Registered entity mapping: ${type} -> ${EntityClass.name}`);
    }

    /**
     * Unregister a constructor class from the factory.
     * @param {string} type - Unique string identifier
     */
    unregister(type) {
        if (this.registry.has(type)) {
            this.registry.delete(type);
            logger.debug('EntityFactory', `Unregistered entity mapping: ${type}`);
        }
    }

    /**
     * Resolves the constructor class and acquires a pooled instance.
     * @param {string} type - The registered type key
     * @param {number} x - Horizontal coordinate
     * @param {number} y - Vertical coordinate
     * @param {...*} args - Additional arguments forwarded to constructor/revive
     * @returns {Entity} The acquired entity instance
     */
    create(type, x, y, ...args) {
        const EntityClass = this.registry.get(type);
        if (!EntityClass) {
            logger.warn('EntityFactory', `Unregistered entity type requested: ${type}`);
            throw new Error(`EntityFactory: Unregistered entity type: "${type}"`);
        }
        return entityPool.acquire(EntityClass, x, y, ...args);
    }

    /**
     * Clear all registrations (for testing purposes).
     */
    clear() {
        this.registry.clear();
        logger.info('EntityFactory', 'All entity mappings cleared');
    }
}

export const entityFactory = new EntityFactory();

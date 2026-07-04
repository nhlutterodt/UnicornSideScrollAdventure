'use strict';

import { Config } from '../Config.js';
import { logger } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';
import { engineRegistry } from '../core/Registry.js';
import { CloudSpawner } from './spawners/CloudSpawner.js';
import { ItemSpawner } from './spawners/ItemSpawner.js';
import { PlatformSpawner } from './spawners/PlatformSpawner.js';
import { HazardSpawner } from './spawners/HazardSpawner.js';

/**
 * SpawnManager - Centralized entity spawning coordinator.
 * Manages registered Spawner subsystems dynamically and maintains player trail timers.
 */
export class SpawnManager {
    constructor() {
        this.particleTimer = 0;
        this.SPAWN_OFFSET = 100; // Pixels beyond viewport edge
        
        this.sessionTime = 0;
        this.lastEntityBudgetWarningTime = -999;

        // Register modular spawner subsystems
        this.spawners = new Map([
            ['hazard', new HazardSpawner()],
            ['platform', new PlatformSpawner()],
            ['cloud', new CloudSpawner()],
            ['item', new ItemSpawner()]
        ]);

        logger.info('SpawnManager', 'Initialized with decomposed Spawner subsystems');
    }

    /**
     * Update all spawner subsystems and trigger spawning
     * @param {number} dt - Delta time in seconds
     * @param {ViewportManager} viewport - Viewport for spawn positioning
     * @param {LevelSystem} level - Level system for spawn intervals
     * @param {Player} player - Player for trail particles
     * @param {ParticleSystem} particles - Particle system for trails
     * @param {boolean} isSafeStart - When true, suppresses hazard/pattern spawning
     */
    update(dt, viewport, level, player, particles, isSafeStart = false) {
        if (!viewport || !level || !player || !particles) {
            logger.warn('SpawnManager', 'Missing dependencies for update');
            return;
        }

        const spawnX = viewport.logicalWidth + this.SPAWN_OFFSET;
        
        // Resolve settings
        const spawnSettings = (typeof level.getSpawnSettings === 'function')
            ? level.getSpawnSettings()
            : {
                obstacleInterval: level.spawnInterval,
                platformInterval: level.spawnInterval * 1.5,
                itemInterval: Config.ITEM_SPAWN_INTERVAL,
                cloudInterval: Config.CLOUD_SPAWN_INTERVAL,
                patternProbability: Config.PATTERN_PROBABILITY,
                patternCooldownFallback: Config.PATTERN_COOLDOWN_FALLBACK,
                entityBudget: Config.COLLISION_SYSTEM.MAX_ENTITIES
            };

        this.sessionTime += dt;
        this._checkEntityBudget(spawnSettings.entityBudget, level.currentStage?.name || 'Unknown Stage');

        // 1. Particle Trail Spawning (Simple & kept local to player dynamics)
        this.spawnParticleTrail(dt, player, particles);

        // 2. Run Modular Spawners
        const context = {
            viewport,
            level,
            player,
            particles,
            isSafeStart,
            spawnSettings,
            emitTelemetry: (type, x, y, reason) => this._emitSpawnTelemetry(type, x, y, level, reason)
        };

        for (const [name, spawner] of this.spawners) {
            spawner.update(dt, viewport, level, spawnX, context);
        }
    }

    _checkEntityBudget(entityBudget, stageName) {
        if (!Number.isFinite(entityBudget) || entityBudget <= 0) return;

        const count = engineRegistry.getCount();
        if (count <= entityBudget) return;

        if ((this.sessionTime - this.lastEntityBudgetWarningTime) < 1.0) return;
        this.lastEntityBudgetWarningTime = this.sessionTime;

        logger.warn('SpawnManager', `Entity budget exceeded in ${stageName}: ${count}/${entityBudget}`);
        eventManager.emit('ENTITY_BUDGET_WARNING', {
            stageName,
            entityCount: count,
            entityBudget,
            sessionTime: this.sessionTime
        });
    }

    _emitSpawnTelemetry(type, x, y, level, reason) {
        const stageName = level.currentStage ? level.currentStage.name : 'Unknown Stage';
        eventManager.emit('ENTITY_SPAWNED', {
            type,
            x,
            y,
            reason,
            stageName,
            level: level.level,
            distanceAtSpawn: level.distance,
            entityCount: engineRegistry.getCount(),
            sessionTime: this.sessionTime
        });
    }

    /**
     * Spawn particle trail behind player
     */
    spawnParticleTrail(dt, player, particles) {
        this.particleTimer += dt;
        if (this.particleTimer > Config.PARTICLE_TRAIL_INTERVAL) {
            this.particleTimer = 0;
            
            if (player.appearance && player.appearance.trail) {
                const trailColors = player.appearance.trail.colors;
                const color = trailColors[Math.floor(Math.random() * trailColors.length)];
                particles.play('TRAIL', { 
                    x: player.x, 
                    y: player.y + 25, 
                    color 
                });
            }
        }
    }

    /**
     * Reset all spawn timers (for new game)
     */
    reset() {
        this.particleTimer = 0;
        this.sessionTime = 0;
        this.lastEntityBudgetWarningTime = -999;

        // Reset all modular spawners
        this.spawners.forEach(s => s.reset());
        
        logger.info('SpawnManager', 'All spawn timers reset');
    }

    /**
     * Get current timer states (for debugging)
     * @returns {Object} Timer values
     */
    getTimerStates() {
        const states = {
            particle: this.particleTimer
        };
        for (const [name, spawner] of this.spawners) {
            states[name] = spawner.timer;
        }
        return states;
    }
}

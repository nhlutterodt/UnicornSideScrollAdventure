'use strict';

import { Obstacle } from '../entities/Obstacle.js';
import { LavaGeyser, IceSpike, NeonBarrier } from '../entities/SpecialHazards.js';
import { Platform } from '../entities/Platform.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { JumpPad } from '../entities/JumpPad.js';
import { Cloud } from '../entities/Cloud.js';
import { Config } from '../Config.js';
import { LevelUtils } from '../utils/LevelUtils.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';
import { entityPool } from '../core/EntityPool.js';
import { eventManager } from './EventManager.js';
import { engineRegistry } from '../core/Registry.js';

const HAZARD_REGISTRY = {
    default: Obstacle,
    ice_spike: IceSpike,
    lava_geyser: LavaGeyser,
    neon_barrier: NeonBarrier
};

/**
 * SpawnManager - Centralized entity spawning coordination
 * 
 * Responsibilities:
 * - Manages spawn timers for all entity types
 * - Coordinates spawn intervals with LevelSystem
 * - Handles spawn positioning and entity creation
 * - Manages particle trail spawning
 * - Applies spawn probability logic (platforms)
 * 
 * Architecture:
 * - Timer-based spawning synchronized with level difficulty
 * - Spawns entities off-screen (viewport.logicalWidth + 100)
 * - Uses Config for spawn intervals and probabilities
 * - Delegates random item spawning to LevelUtils
 * 
 * Events Emitted:
 * - ENTITY_SPAWNED: { type, x, y } - When any entity spawns
 * 
 * Events Consumed:
 * - None (managed by Game.js update loop)
 * 
 * @example
 * const spawner = new SpawnManager();
 * spawner.update(dt, viewport, level, player, particles);
 */
export class SpawnManager {
    constructor() {
        // Spawn timers
        this.obstacleTimer = 0;
        this.platformTimer = 0;
        this.cloudTimer = 0;
        this.particleTimer = 0;
        this.itemTimer = 0;

        // Constants
        this.SPAWN_OFFSET = 100; // Pixels beyond viewport edge
        
        // Pattern logic
        this.patternCooldown = 0; // Negative timer that prevents random spawns while a pattern is passing
        this.sessionTime = 0;
        this.lastEntityBudgetWarningTime = -999;

        logger.info('SpawnManager', 'Initialized with 5 spawn systems');
    }

    /**
     * Update all spawn timers and trigger spawning
     * @param {number} dt - Delta time in seconds
     * @param {ViewportManager} viewport - Viewport for spawn positioning
     * @param {LevelSystem} level - Level system for spawn intervals
     * @param {Player} player - Player for trail particles
     * @param {ParticleSystem} particles - Particle system for trails
     * @param {boolean} isSafeStart - When true, suppresses hazard/pattern spawning
     *   (used to give new runs a clear runway - see Config.SAFE_START)
     */
    update(dt, viewport, level, player, particles, isSafeStart = false) {
        if (!viewport || !level || !player || !particles) {
            logger.warn('SpawnManager', 'Missing dependencies for update');
            return;
        }

        const logicalHeight = 600; // LOGICAL_HEIGHT constant
        const spawnX = viewport.logicalWidth + this.SPAWN_OFFSET;
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

        // 1. Particle Trail Spawning
        this.spawnParticleTrail(dt, player, particles);

        // Update Pattern Cooldown
        if (this.patternCooldown > 0) {
            this.patternCooldown -= (level.gameSpeed * dt);
        } else {
            // Only spawn regular structural obstacles/platforms if a pattern isn't actively rolling out

            // 2. Obstacle & Pattern Spawning - suppressed during the safe-start window since
            // patterns can also place hazards (platforms are non-damaging, so they're exempt).
            if (!isSafeStart) {
                this.spawnObstaclesAndPatterns(dt, level, spawnX, logicalHeight, spawnSettings);
            }

            // 3. Platform Spawning
            this.spawnPlatforms(dt, level, spawnX, spawnSettings);
        }

        // 4. Cloud Spawning
        this.spawnClouds(dt, spawnX, logicalHeight, spawnSettings, level);

        // 5. Item Spawning
        this.spawnItems(dt, spawnX, logicalHeight, spawnSettings, level);
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
     * @private
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
     * Spawn obstacles or patterns at level-specific intervals
     * @private
     */
    spawnObstaclesAndPatterns(dt, level, spawnX, logicalHeight, spawnSettings) {
        this.obstacleTimer += dt;
        if (this.obstacleTimer > spawnSettings.obstacleInterval) {
            this.obstacleTimer = 0;
            const groundY = logicalHeight - Config.GROUND_HEIGHT;
            const stageName = level.currentStage ? level.currentStage.name : '';
            
            // Chance to spawn a structured pattern instead of a generic obstacle
            if (Config.PATTERNS && Object.keys(Config.PATTERNS).length > 0 && Math.random() < spawnSettings.patternProbability) {
                const patternKeys = Object.keys(Config.PATTERNS);
                const randomPatternKey = patternKeys[Math.floor(Math.random() * patternKeys.length)];
                const pattern = Config.PATTERNS[randomPatternKey];
                
                this.spawnPattern(pattern, spawnX, groundY, stageName, level);
                
                // Set the cooldown (in pixels) so we wait for the pattern to pass before resuming normal spawns
                this.patternCooldown = pattern.durationOffset || spawnSettings.patternCooldownFallback;
                
                logger.game(VerbosityLevel.HIGH, 'SpawnManager', `🧩 Pattern spawned: ${randomPatternKey}`, {
                    x: Math.round(spawnX), offset: this.patternCooldown
                });
                return;
            }
            
            // Default: Spawn single hazard
            this.spawnSingleHazard(spawnX, groundY, stageName, level, 'single_hazard');
            
            logger.debug('SpawnManager', `Spawned hazard at x=${spawnX} for stage ${stageName}`);
            logger.game(VerbosityLevel.HIGH, 'SpawnManager', `💀 Hazard spawned [${stageName}]`, {
                x: Math.round(spawnX),
                interval: spawnSettings.obstacleInterval.toFixed(2)
            });
        }
    }

    /**
     * Helper to spawn a single specific hazard based on stage
     * @private
     */
    spawnSingleHazard(x, y, stageName, level, reason = 'hazard', width = null, height = null, yOffset = 0) {
        const hazardId = Config.STAGE_HAZARD_MAP[stageName] || 'default';
        const HazardClass = HAZARD_REGISTRY[hazardId] || HAZARD_REGISTRY.default;
        entityPool.acquire(HazardClass, x, y, width, height, yOffset);
        this._emitSpawnTelemetry('hazard', x, y, level, reason);
    }

    /**
     * Instantiates all entities in a defined pattern sequence
     * @private
     */
    spawnPattern(pattern, baseX, groundY, stageName, level) {
        pattern.entities.forEach(ent => {
            const x = baseX + ent.dx;
            const y = groundY + (ent.dy || 0);
            
            if (ent.type === 'hazard') {
                this.spawnSingleHazard(x, y, stageName, level, 'pattern_hazard', ent.width, ent.height, ent.dy || 0);
            } else if (ent.type === 'platform') {
                const width = ent.width || Config.PLATFORM_MIN_WIDTH;
                const height = ent.height || Config.PLATFORM_HEIGHT;
                entityPool.acquire(Platform, x, y, width, height);
                this._emitSpawnTelemetry('platform', x, y, level, 'pattern_platform');
            }
        });
    }

    /**
     * Spawn platforms with probability check
     * @private
     */
    spawnPlatforms(dt, level, spawnX, spawnSettings) {
        this.platformTimer += dt;
        const platformInterval = spawnSettings.platformInterval;
        
        if (this.platformTimer > platformInterval) {
            this.platformTimer = 0;
            
            // Determine if platform should spawn
            let shouldSpawn = false;
            if (Config.PLATFORM_PLACEMENT_MODE === 'deterministic') {
                shouldSpawn = true;
            } else {
                shouldSpawn = Math.random() < Config.PLATFORM_PROBABILITY;
            }

            if (shouldSpawn) {
                // Calculate platform dimensions
                const width = Config.PLATFORM_MIN_WIDTH + 
                    Math.random() * (Config.PLATFORM_MAX_WIDTH - Config.PLATFORM_MIN_WIDTH);
                
                const y = Config.PLATFORM_VERTICAL_RANGE[0] + 
                    Math.random() * (Config.PLATFORM_VERTICAL_RANGE[1] - Config.PLATFORM_VERTICAL_RANGE[0]);
                
                // Chance for a crumbling platform
                let platform;
                if (Math.random() < Config.CRUMBLING_PLATFORM_PROBABILITY) {
                    platform = entityPool.acquire(CrumblingPlatform, spawnX, y, width, Config.PLATFORM_HEIGHT);
                    logger.debug('SpawnManager', `Spawned crumbling platform at x=${spawnX}`);
                    this._emitSpawnTelemetry('crumbling_platform', spawnX, y, level, 'platform_cycle');
                } else {
                    platform = entityPool.acquire(Platform, spawnX, y, width, Config.PLATFORM_HEIGHT);
                    this._emitSpawnTelemetry('platform', spawnX, y, level, 'platform_cycle');

                    // If it's a regular platform, maybe spawn a jump pad on it!
                    if (Math.random() < Config.JUMP_PAD_ON_PLATFORM_PROBABILITY) {
                        const jumpPadX = spawnX + (width / 2) - 20; // Center it on the platform
                        entityPool.acquire(JumpPad, jumpPadX, y);
                        logger.debug('SpawnManager', `Spawned jump pad on platform at x=${jumpPadX}`);
                        this._emitSpawnTelemetry('jump_pad', jumpPadX, y, level, 'platform_cycle');
                    }
                }
            }
        }
    }

    /**
     * Spawn clouds at fixed interval
     * @private
     */
    spawnClouds(dt, spawnX, logicalHeight, spawnSettings, level) {
        this.cloudTimer += dt;
        if (this.cloudTimer > spawnSettings.cloudInterval) {
            this.cloudTimer = 0;
            
            const y = Math.random() * (logicalHeight - 150);
            entityPool.acquire(Cloud, spawnX, y);
            this._emitSpawnTelemetry('cloud', spawnX, y, level, 'ambient');
            
            logger.debug('SpawnManager', `Spawned cloud at x=${spawnX}, y=${y}`);
        }
    }

    /**
     * Spawn random items via LevelUtils
     * @private
     */
    spawnItems(dt, spawnX, logicalHeight, spawnSettings, level) {
        this.itemTimer += dt;
        if (this.itemTimer > spawnSettings.itemInterval) {
            this.itemTimer = 0;
            
            const y = LevelUtils.getRandomSpawnY(logicalHeight, Config.GROUND_HEIGHT);
            LevelUtils.spawnRandomItem(spawnX, y);
            this._emitSpawnTelemetry('item', spawnX, y, level, 'item_cycle');
            
            logger.debug('SpawnManager', `Spawned item at x=${spawnX}, y=${y}`);
        }
    }

    /**
     * Reset all spawn timers (for new game)
     */
    reset() {
        this.obstacleTimer = 0;
        this.platformTimer = 0;
        this.cloudTimer = 0;
        this.particleTimer = 0;
        this.itemTimer = 0;
        this.sessionTime = 0;
        this.lastEntityBudgetWarningTime = -999;
        
        logger.info('SpawnManager', 'All spawn timers reset');
    }

    /**
     * Get current timer states (for debugging)
     * @returns {Object} Timer values
     */
    getTimerStates() {
        return {
            obstacle: this.obstacleTimer,
            platform: this.platformTimer,
            cloud: this.cloudTimer,
            particle: this.particleTimer,
            item: this.itemTimer
        };
    }
}

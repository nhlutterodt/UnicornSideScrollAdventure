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

        logger.info('SpawnManager', 'Initialized with 5 spawn systems');
    }

    /**
     * Update all spawn timers and trigger spawning
     * @param {number} dt - Delta time in seconds
     * @param {ViewportManager} viewport - Viewport for spawn positioning
     * @param {LevelSystem} level - Level system for spawn intervals
     * @param {Player} player - Player for trail particles
     * @param {ParticleSystem} particles - Particle system for trails
     */
    update(dt, viewport, level, player, particles) {
        if (!viewport || !level || !player || !particles) {
            logger.warn('SpawnManager', 'Missing dependencies for update');
            return;
        }

        const logicalHeight = 600; // LOGICAL_HEIGHT constant
        const spawnX = viewport.logicalWidth + this.SPAWN_OFFSET;

        // 1. Particle Trail Spawning
        this.spawnParticleTrail(dt, player, particles);

        // Update Pattern Cooldown
        if (this.patternCooldown > 0) {
            this.patternCooldown -= (level.gameSpeed * dt);
        } else {
            // Only spawn regular structural obstacles/platforms if a pattern isn't actively rolling out
            
            // 2. Obstacle & Pattern Spawning
            this.spawnObstaclesAndPatterns(dt, level, spawnX, logicalHeight);

            // 3. Platform Spawning
            this.spawnPlatforms(dt, level, spawnX);
        }

        // 4. Cloud Spawning
        this.spawnClouds(dt, spawnX, logicalHeight);

        // 5. Item Spawning
        this.spawnItems(dt, spawnX, logicalHeight);
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
    spawnObstaclesAndPatterns(dt, level, spawnX, logicalHeight) {
        this.obstacleTimer += dt;
        if (this.obstacleTimer > level.spawnInterval) {
            this.obstacleTimer = 0;
            const groundY = logicalHeight - Config.GROUND_HEIGHT;
            const stageName = level.currentStage ? level.currentStage.name : '';
            
            // Chance to spawn a structured pattern instead of a generic obstacle
            if (Config.PATTERNS && Object.keys(Config.PATTERNS).length > 0 && Math.random() < Config.PATTERN_PROBABILITY) {
                const patternKeys = Object.keys(Config.PATTERNS);
                const randomPatternKey = patternKeys[Math.floor(Math.random() * patternKeys.length)];
                const pattern = Config.PATTERNS[randomPatternKey];
                
                this.spawnPattern(pattern, spawnX, groundY, stageName);
                
                // Set the cooldown (in pixels) so we wait for the pattern to pass before resuming normal spawns
                this.patternCooldown = pattern.durationOffset || Config.PATTERN_COOLDOWN_FALLBACK;
                
                logger.game(VerbosityLevel.HIGH, 'SpawnManager', `🧩 Pattern spawned: ${randomPatternKey}`, {
                    x: Math.round(spawnX), offset: this.patternCooldown
                });
                return;
            }
            
            // Default: Spawn single hazard
            this.spawnSingleHazard(spawnX, groundY, stageName);
            
            logger.debug('SpawnManager', `Spawned hazard at x=${spawnX} for stage ${stageName}`);
            logger.game(VerbosityLevel.HIGH, 'SpawnManager', `💀 Hazard spawned [${stageName}]`, {
                x: Math.round(spawnX),
                interval: level.spawnInterval.toFixed(2)
            });
        }
    }

    /**
     * Helper to spawn a single specific hazard based on stage
     * @private
     */
    spawnSingleHazard(x, y, stageName) {
        if (stageName === 'Crystal Caverns') {
            new IceSpike(x, y);
        } else if (stageName === 'Inferno Ridge') {
            new LavaGeyser(x, y);
        } else if (stageName === 'Cyber City') {
            new NeonBarrier(x, y);
        } else {
            new Obstacle(x, y);
        }
    }

    /**
     * Instantiates all entities in a defined pattern sequence
     * @private
     */
    spawnPattern(pattern, baseX, groundY, stageName) {
        pattern.entities.forEach(ent => {
            const x = baseX + ent.dx;
            const y = groundY + (ent.dy || 0);
            
            if (ent.type === 'hazard') {
                this.spawnSingleHazard(x, y, stageName);
            } else if (ent.type === 'platform') {
                const width = ent.width || Config.PLATFORM_MIN_WIDTH;
                const height = ent.height || Config.PLATFORM_HEIGHT;
                new Platform(x, y, width, height);
            }
        });
    }

    /**
     * Spawn platforms with probability check
     * @private
     */
    spawnPlatforms(dt, level, spawnX) {
        this.platformTimer += dt;
        const platformInterval = level.spawnInterval * 1.5;
        
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
                    platform = new CrumblingPlatform(spawnX, y, width, Config.PLATFORM_HEIGHT);
                    logger.debug('SpawnManager', `Spawned crumbling platform at x=${spawnX}`);
                } else {
                    platform = new Platform(spawnX, y, width, Config.PLATFORM_HEIGHT);
                    
                    // If it's a regular platform, maybe spawn a jump pad on it!
                    if (Math.random() < Config.JUMP_PAD_ON_PLATFORM_PROBABILITY) {
                        const jumpPadX = spawnX + (width / 2) - 20; // Center it on the platform
                        new JumpPad(jumpPadX, y);
                        logger.debug('SpawnManager', `Spawned jump pad on platform at x=${jumpPadX}`);
                    }
                }
            }
        }
    }

    /**
     * Spawn clouds at fixed interval
     * @private
     */
    spawnClouds(dt, spawnX, logicalHeight) {
        this.cloudTimer += dt;
        if (this.cloudTimer > Config.CLOUD_SPAWN_INTERVAL) {
            this.cloudTimer = 0;
            
            const y = Math.random() * (logicalHeight - 150);
            new Cloud(spawnX, y);
            
            logger.debug('SpawnManager', `Spawned cloud at x=${spawnX}, y=${y}`);
        }
    }

    /**
     * Spawn random items via LevelUtils
     * @private
     */
    spawnItems(dt, spawnX, logicalHeight) {
        this.itemTimer += dt;
        if (this.itemTimer > Config.ITEM_SPAWN_INTERVAL) {
            this.itemTimer = 0;
            
            const y = LevelUtils.getRandomSpawnY(logicalHeight, Config.GROUND_HEIGHT);
            LevelUtils.spawnRandomItem(spawnX, y);
            
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

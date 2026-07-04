'use strict';

import { Spawner } from './Spawner.js';
import { entityFactory } from '../../factories/EntityFactory.js';
import { logger, VerbosityLevel } from '../../utils/Logger.js';
import { Config } from '../../Config.js';

export class HazardSpawner extends Spawner {
    constructor() {
        super();
        this.patternCooldown = 0;
    }

    reset() {
        super.reset();
        this.patternCooldown = 0;
    }

    update(dt, viewport, level, spawnX, context) {
        if (this.patternCooldown > 0) {
            this.patternCooldown -= (level.gameSpeed * dt);
            return;
        }

        if (context.isSafeStart) {
            return; // Suppress obstacle/pattern spawning during safe start
        }

        this.timer += dt;
        const interval = context.spawnSettings.obstacleInterval;

        if (this.timer > interval) {
            this.timer = 0;
            const logicalHeight = 600; // LOGICAL_HEIGHT constant
            const groundY = logicalHeight - Config.GROUND_HEIGHT;
            const stage = level.currentStage;
            const stageName = stage ? stage.name : '';

            // Chance to spawn a curated pattern
            if (Config.PATTERNS && Object.keys(Config.PATTERNS).length > 0 && Math.random() < context.spawnSettings.patternProbability) {
                const patternKeys = Object.keys(Config.PATTERNS);
                let filteredKeys = patternKeys;

                // Biome-Specific Pattern Pools filtering
                if (stage && Array.isArray(stage.eligiblePatterns) && stage.eligiblePatterns.length > 0) {
                    filteredKeys = patternKeys.filter(k => stage.eligiblePatterns.includes(k));
                    if (filteredKeys.length === 0) {
                        filteredKeys = patternKeys; // fallback if configuration is mismatch/empty
                    }
                }

                const randomPatternKey = filteredKeys[Math.floor(Math.random() * filteredKeys.length)];
                const pattern = Config.PATTERNS[randomPatternKey];

                this.spawnPattern(pattern, spawnX, groundY, stage, level, context);

                // Set pattern cooldown
                this.patternCooldown = pattern.durationOffset || context.spawnSettings.patternCooldownFallback;

                logger.game(VerbosityLevel.HIGH, 'HazardSpawner', `🧩 Pattern spawned: ${randomPatternKey}`, {
                    x: Math.round(spawnX), offset: this.patternCooldown
                });
                return;
            }

            // Default: Spawn single hazard
            this.spawnSingleHazard(spawnX, groundY, stage, level, context, 'single_hazard');
        }
    }

    /**
     * Rolls a hazard ID based on the stage's weighted hazard configuration.
     * @private
     */
    _rollStageHazard(stage) {
        const hazards = stage?.hazards;
        if (!hazards || hazards.length === 0) return 'obstacle';

        const totalWeight = hazards.reduce((sum, h) => sum + (h.weight || 1), 0);
        let random = Math.random() * totalWeight;

        for (const hazard of hazards) {
            const weight = hazard.weight || 1;
            if (random < weight) {
                return hazard.id;
            }
            random -= weight;
        }
        return hazards[0].id;
    }

    /**
     * Spawns a single stage-appropriate hazard.
     * @private
     */
    spawnSingleHazard(x, y, stage, level, context, reason = 'hazard', width = null, height = null, yOffset = 0) {
        const hazardId = this._rollStageHazard(stage);
        entityFactory.create(hazardId, x, y, width, height, yOffset);
        context.emitTelemetry(hazardId, x, y, reason);

        logger.debug('HazardSpawner', `Spawned hazard ${hazardId} at x=${x}`);
        logger.game(VerbosityLevel.HIGH, 'HazardSpawner', `💀 Hazard spawned [${stage?.name || 'Meadow'}]`, {
            type: hazardId,
            x: Math.round(x)
        });
    }

    /**
     * Spawns a curated pattern of platforms and hazards.
     * @private
     */
    spawnPattern(pattern, baseX, groundY, stage, level, context) {
        pattern.entities.forEach(ent => {
            const x = baseX + ent.dx;
            const y = groundY + (ent.dy || 0);
            
            let type = ent.type;
            
            // Map generic 'hazard' to a stage-specific hazard roll
            if (type === 'hazard') {
                type = this._rollStageHazard(stage);
            }

            if (type === 'platform') {
                const width = ent.width || Config.PLATFORM_MIN_WIDTH;
                const height = ent.height || Config.PLATFORM_HEIGHT;
                entityFactory.create('platform', x, y, width, height);
                context.emitTelemetry('platform', x, y, 'pattern_platform');
            } else if (type === 'crumbling_platform') {
                const width = ent.width || Config.PLATFORM_MIN_WIDTH;
                const height = ent.height || Config.PLATFORM_HEIGHT;
                entityFactory.create('crumbling_platform', x, y, width, height);
                context.emitTelemetry('crumbling_platform', x, y, 'pattern_platform');
            } else if (type === 'jump_pad') {
                entityFactory.create('jump_pad', x, y);
                context.emitTelemetry('jump_pad', x, y, 'pattern_jump_pad');
            } else if (type === 'item') {
                const itemId = ent.itemId || 'extra_life';
                const itemData = Config.ITEMS.find(i => i.id === itemId) || Config.FALLBACK.ITEMS[0];
                const enrichedData = { ...itemData };
                if (itemData.type === 'ability') {
                    const ability = Config.ABILITIES.find(a => a.id === itemData.abilityId);
                    if (ability) {
                        enrichedData.icon = ability.icon;
                        enrichedData.color = ability.color;
                    }
                }
                entityFactory.create('item', x, y, enrichedData);
                context.emitTelemetry('item', x, y, 'pattern_item');
            } else {
                // Instantiates a specific registered hazard (e.g. ice_spike, lava_geyser, neon_barrier, obstacle)
                const width = ent.width || null;
                const height = ent.height || null;
                const dy = ent.dy || 0;
                entityFactory.create(type, x, y, width, height, dy);
                context.emitTelemetry(type, x, y, 'pattern_hazard');
            }
        });
    }
}

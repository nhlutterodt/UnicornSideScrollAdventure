'use strict';

import { Spawner } from './Spawner.js';
import { entityFactory } from '../../factories/EntityFactory.js';
import { logger } from '../../utils/Logger.js';
import { Config } from '../../Config.js';

export class PlatformSpawner extends Spawner {
    update(dt, viewport, level, spawnX, context) {
        this.timer += dt;
        const platformInterval = context.spawnSettings.platformInterval;

        if (this.timer > platformInterval) {
            this.timer = 0;

            let shouldSpawn = false;
            if (Config.PLATFORM_PLACEMENT_MODE === 'deterministic') {
                shouldSpawn = true;
            } else {
                shouldSpawn = Math.random() < Config.PLATFORM_PROBABILITY;
            }

            if (shouldSpawn) {
                const width = Config.PLATFORM_MIN_WIDTH + 
                    Math.random() * (Config.PLATFORM_MAX_WIDTH - Config.PLATFORM_MIN_WIDTH);
                
                const y = Config.PLATFORM_VERTICAL_RANGE[0] + 
                    Math.random() * (Config.PLATFORM_VERTICAL_RANGE[1] - Config.PLATFORM_VERTICAL_RANGE[0]);
                
                if (Math.random() < Config.CRUMBLING_PLATFORM_PROBABILITY) {
                    entityFactory.create('crumbling_platform', spawnX, y, width, Config.PLATFORM_HEIGHT);
                    logger.debug('PlatformSpawner', `Spawned crumbling platform at x=${spawnX}`);
                    context.emitTelemetry('crumbling_platform', spawnX, y, 'platform_cycle');
                } else {
                    entityFactory.create('platform', spawnX, y, width, Config.PLATFORM_HEIGHT);
                    context.emitTelemetry('platform', spawnX, y, 'platform_cycle');

                    if (Math.random() < Config.JUMP_PAD_ON_PLATFORM_PROBABILITY) {
                        const jumpPadX = spawnX + (width / 2) - 20; // Center on platform
                        entityFactory.create('jump_pad', jumpPadX, y);
                        logger.debug('PlatformSpawner', `Spawned jump pad on platform at x=${jumpPadX}`);
                        context.emitTelemetry('jump_pad', jumpPadX, y, 'platform_cycle');
                    }
                }
            }
        }
    }
}

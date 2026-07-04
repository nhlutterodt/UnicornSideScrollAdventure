'use strict';

import { Spawner } from './Spawner.js';
import { LevelUtils } from '../../utils/LevelUtils.js';
import { logger } from '../../utils/Logger.js';
import { Config } from '../../Config.js';

export class ItemSpawner extends Spawner {
    update(dt, viewport, level, spawnX, context) {
        this.timer += dt;
        const interval = context.spawnSettings.itemInterval;

        if (this.timer > interval) {
            this.timer = 0;
            const logicalHeight = 600; // LOGICAL_HEIGHT constant
            const y = LevelUtils.getRandomSpawnY(logicalHeight, Config.GROUND_HEIGHT);

            LevelUtils.spawnRandomItem(spawnX, y);
            context.emitTelemetry('item', spawnX, y, 'item_cycle');

            logger.debug('ItemSpawner', `Spawned item at x=${spawnX}, y=${y}`);
        }
    }
}

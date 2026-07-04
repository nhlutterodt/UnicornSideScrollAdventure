'use strict';

import { Spawner } from './Spawner.js';
import { entityFactory } from '../../factories/EntityFactory.js';
import { logger } from '../../utils/Logger.js';

export class CloudSpawner extends Spawner {
    update(dt, viewport, level, spawnX, context) {
        this.timer += dt;
        const interval = context.spawnSettings.cloudInterval;

        if (this.timer > interval) {
            this.timer = 0;
            const logicalHeight = 600; // LOGICAL_HEIGHT constant
            const y = Math.random() * (logicalHeight - 150);

            entityFactory.create('cloud', spawnX, y);
            context.emitTelemetry('cloud', spawnX, y, 'ambient');
            
            logger.debug('CloudSpawner', `Spawned cloud at x=${spawnX}, y=${y}`);
        }
    }
}

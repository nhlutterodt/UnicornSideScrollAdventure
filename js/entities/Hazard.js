'use strict';

import { Entity } from '../core/Entity.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';

/**
 * HAZARD.js
 * Base class for specific environmental dangers. Replaces generic Obstacles.
 */
export class Hazard extends Entity {
    constructor(x, y, width, height, type = 'hazard') {
        super(x, y, width, height, type);

        this.collisionLayer = CollisionLayers.OBSTACLE;
        this.collisionMask = CollisionLayers.PLAYER;
        
        this.renderLayer = 2; // Z_LAYERS.ENTITIES
        this.passed = false;
    }

    update(dt, context) {
        const { gameSpeed, logicalHeight, config, onObstaclePassed } = context;
        const oldX = this.x;
        this.x -= gameSpeed * dt;
        
        // Snap to ground by default, though subclasses might override
        this.y = logicalHeight - config.GROUND_HEIGHT - this.height;

        // Score mechanism (player passes obstacle)
        if (oldX >= 80 && this.x < 80 && !this.passed) {
            this.passed = true;
            if (onObstaclePassed) onObstaclePassed();
        }
    }

    draw(ctx) {
        // Fallback drawing, subclasses should override
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    get isOffscreen() {
        return this.x + this.width < 0;
    }
}

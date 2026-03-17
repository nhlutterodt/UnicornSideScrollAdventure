'use strict';

import { Entity } from '../core/Entity.js';
import { Z_LAYERS } from '../systems/RenderSystem.js';

/**
 * VISUAL_ENTITY.js
 * Base class for complex, logic-bearing visual effects that exist in the ECS.
 */
export class VisualEntity extends Entity {
    /**
     * @param {number} x - Target x position
     * @param {number} y - Target y position
     * @param {number} width 
     * @param {number} height 
     * @param {number} duration - Time in seconds before the effect is destroyed
     * @param {number} renderLayer - Z-Index layer from RenderSystem
     */
    constructor(x, y, width, height, duration = 1.0, renderLayer = Z_LAYERS.PARTICLES) {
        // Base type allows registry to clear them if needed
        super(x, y, width, height, 'visual_effect');
        
        this.duration = duration;
        this.elapsed = 0;
        this.renderLayer = renderLayer;
        
        // Disable physical collision layer by default, effects usually don't block movement
        // But subclasses can override this if they are solid (like a magic wall)
    }

    update(dt, context) {
        this.elapsed += dt;
        
        if (this.elapsed >= this.duration) {
            this.destroy();
        }
    }

    draw(ctx) {
        // To be implemented by subclasses
    }
}

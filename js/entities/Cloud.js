import { Entity } from '../core/Entity.js';

/**
 * CLOUD.js
 * Background elements for the game world.
 */
export class Cloud extends Entity {
    static poolable = true;

    constructor(x, y) {
        const { width, height, size } = Cloud._rollDims();
        super(x, y, width, height, 'cloud');
        this._configure(size);
    }

    /**
     * Called by EntityPool when reusing a freed instance instead of `new`-ing one.
     */
    revive(x, y) {
        const { width, height, size } = Cloud._rollDims();
        this.reviveBase(x, y, width, height);
        this._configure(size);
    }

    static _rollDims() {
        const size = Math.random() * 0.5 + 0.5;
        return { width: size * 60, height: size * 60, size }; // Approximate dims based on font size
    }

    _configure(size) {
        this.speed = (Math.random() * 1 + 0.5) * 60; // Scale for time-based (approx 30-90 px/s)
        this.size = size;
        this.renderLayer = 0; // Z_LAYERS.BACKGROUND
    }

    update(dt, context) {
        this.x -= this.speed * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.font = `${this.size * 60}px serif`;
        ctx.fillText('☁️', this.x, this.y);
        ctx.restore();
    }

    get isOffscreen() {
        return this.x < -100;
    }
}

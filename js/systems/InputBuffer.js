'use strict';

/**
 * INPUT_BUFFER.js
 * Generic, dt-driven timer buffer for input forgiveness (coyote time, jump buffering, etc).
 * Pure logic, no DOM or wall-clock dependency - callers must call update(dt) once per frame
 * with the same dt used to advance gameplay, so buffered windows stay in sync with game time.
 *
 * @example
 * const buffer = new InputBuffer();
 * buffer.buffer('coyote', 0.12); // arm a 120ms window
 * buffer.isBuffered('coyote');   // true until 0.12s of update(dt) calls have passed
 * buffer.consume('coyote');      // clear it immediately once acted upon
 */
export class InputBuffer {
    constructor() {
        this.timers = new Map();
    }

    /**
     * Marks `key` as active for `seconds`. Re-arming an existing key refreshes its window.
     * @param {string} key
     * @param {number} seconds
     */
    buffer(key, seconds) {
        if (seconds <= 0) return;
        this.timers.set(key, seconds);
    }

    /**
     * @param {string} key
     * @returns {boolean} True if `key` is currently within its buffered window.
     */
    isBuffered(key) {
        return (this.timers.get(key) || 0) > 0;
    }

    /**
     * Clears `key` immediately. Call this once a buffered input has been acted on,
     * so it can't fire a second time.
     * @param {string} key
     */
    consume(key) {
        this.timers.delete(key);
    }

    /**
     * Ages all buffered timers down by `dt` seconds, dropping any that expire.
     * @param {number} dt
     */
    update(dt) {
        for (const [key, remaining] of this.timers) {
            const next = remaining - dt;
            if (next <= 0) {
                this.timers.delete(key);
            } else {
                this.timers.set(key, next);
            }
        }
    }
}

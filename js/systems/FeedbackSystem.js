'use strict';

/**
 * FEEDBACK_SYSTEM.js
 * Shared "impact" coordinator for hit-stop and screen shake.
 *
 * Any future ability or hazard can call triggerImpact('medium' | 'heavy') instead of
 * wiring up its own bespoke freeze/shake logic. Pure timers + math, no DOM/canvas
 * dependency - Game.js reads getGameplayDt()/getShakeOffset() to apply the effect.
 *
 * @example
 * const feedback = new FeedbackSystem(Config.FEEDBACK);
 * feedback.triggerImpact('heavy');
 * feedback.update(dt);                 // call once per real (unscaled) frame
 * const gameplayDt = feedback.getGameplayDt(dt); // 0 while hit-stopped, else dt
 * const { x, y } = feedback.getShakeOffset();    // canvas translate offset
 */
export class FeedbackSystem {
    constructor(config = {}) {
        this.intensity = config.intensity ?? 1.0;
        this.shakeEnabled = config.screenShakeEnabled ?? true;
        this.hitStopEnabled = config.hitStopEnabled ?? true;
        this.presets = config.presets || {};

        this.hitStopRemaining = 0;

        this.shakeRemaining = 0;
        this.shakeDuration = 0;
        this.shakeMagnitude = 0;
    }

    /**
     * Triggers a named impact preset (e.g. 'medium', 'heavy'). Unknown levels are ignored.
     * @param {string} level
     */
    triggerImpact(level) {
        const preset = this.presets[level];
        if (!preset) return;

        if (this.hitStopEnabled && preset.hitStopMs > 0) {
            this.hitStopRemaining = Math.max(this.hitStopRemaining, preset.hitStopMs / 1000);
        }

        if (this.shakeEnabled && preset.shakeMagnitude > 0) {
            this.shakeDuration = preset.shakeDurationMs / 1000;
            this.shakeRemaining = this.shakeDuration;
            this.shakeMagnitude = preset.shakeMagnitude * this.intensity;
        }
    }

    /**
     * Ages hit-stop and shake timers down. Call once per real (unscaled) frame,
     * regardless of game state, so effects decay even if PLAYING ends mid-effect.
     * @param {number} dt
     */
    update(dt) {
        if (this.hitStopRemaining > 0) {
            this.hitStopRemaining = Math.max(0, this.hitStopRemaining - dt);
        }
        if (this.shakeRemaining > 0) {
            this.shakeRemaining = Math.max(0, this.shakeRemaining - dt);
        }
    }

    /**
     * @param {number} dt - The real frame dt
     * @returns {number} 0 while hit-stopped, otherwise dt unchanged. Gameplay systems
     *   (level, spawner, entities, collision) should use this instead of the raw dt so
     *   particles - updated with the raw dt separately - keep animating during a freeze.
     */
    getGameplayDt(dt) {
        return this.hitStopRemaining > 0 ? 0 : dt;
    }

    /**
     * @returns {{x: number, y: number}} A random offset to apply as a canvas translate,
     *   decaying to {0, 0} as the shake finishes.
     */
    getShakeOffset() {
        if (this.shakeRemaining <= 0 || this.shakeMagnitude <= 0 || this.shakeDuration <= 0) {
            return { x: 0, y: 0 };
        }

        const falloff = this.shakeRemaining / this.shakeDuration;
        const magnitude = this.shakeMagnitude * falloff;

        return {
            x: (Math.random() * 2 - 1) * magnitude,
            y: (Math.random() * 2 - 1) * magnitude
        };
    }
}

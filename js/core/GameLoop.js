/**
 * GAME_LOOP.js
 * High-performance, decoupled game loop.
 * Follows Coding Standards 4.4.
 */
export class GameLoop {
    constructor(updateFn, drawFn) {
        this.update = updateFn;
        this.draw = drawFn;
        this.isRunning = false;
        this.requestId = null;
        this.lastTime = 0;
        this.timeScale = 1.0;

        this.tick = this.tick.bind(this);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.requestId = requestAnimationFrame(this.tick);
    }

    stop() {
        this.isRunning = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    setTimeScale(scale) {
        this.timeScale = scale;
    }

    tick(currentTime) {
        if (!this.isRunning) return;

        // Calculate Delta Time in Seconds
        const dtMs = currentTime - this.lastTime;
        // Cap dt at 0.1s (10 FPS) to prevent huge jumps if tab is inactive
        const dt = Math.min(dtMs / 1000, 0.1) * this.timeScale;
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.requestId = requestAnimationFrame(this.tick);
    }
}

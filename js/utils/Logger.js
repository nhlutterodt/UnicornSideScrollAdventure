/**
 * LOGGER.js
 * Centralized logging and debug utility.
 * Supports different log levels and can be toggled via Config.
 */
import { Config } from '../Config.js';

class Logger {
    constructor() {
        this.enabled = true; // Could be tied to Config.DEBUG
    }

    info(module, message, ...args) {
        if (!this.enabled) return;
        console.log(`%c[${module}] %c${message}`, 'color: #7afcff; font-weight: bold;', 'color: inherit;', ...args);
    }

    debug(module, message, ...args) {
        if (!this.enabled || !Config.DEBUG) return;
        console.debug(`%c[DEBUG:${module}] %c${message}`, 'color: #ffd700; font-weight: bold;', 'color: #ccc;', ...args);
    }

    warn(module, message, ...args) {
        console.warn(`[${module}] ${message}`, ...args);
    }
}

export const logger = new Logger();

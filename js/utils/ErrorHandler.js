/**
 * ERROR_HANDLER.js
 * Centralized error utility for the game.
 */
import { logger } from './Logger.js';

export class ErrorHandler {
    /**
     * Handles an error gracefully, logging it and optionally stopping the game.
     * @param {string} module - The name of the module where error occurred.
     * @param {Error|string} error - The error object or message.
     * @param {boolean} fatal - If true, can trigger a game stop or crash screen.
     */
    static handle(module, error, fatal = false) {
        const message = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : '';

        logger.warn('ERROR_HANDLER', `Fail in [${module}]: ${message}`, stack);

        if (fatal) {
            // Future: Trigger Game Over or Error Overlay
            logger.error('ERROR_HANDLER', `FATAL ERROR in ${module}: ${message}`);
        }
    }
}

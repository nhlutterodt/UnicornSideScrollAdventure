/**
 * LOGGER.js
 * Centralized logging and debug utility.
 * Supports different log levels, verbosity control, and log capture for overlay.
 */
import { Config } from '../Config.js';

export const VerbosityLevel = {
    OFF: 0,
    LOW: 1,      // Only critical events (game over, level up, score milestones)
    MEDIUM: 2,   // Add player actions (jump, collision, pickup, damage)
    HIGH: 3,     // Add entity lifecycle (spawn, destroy, offscreen)
    VERBOSE: 4   // Everything (physics updates, state changes, frame events)
};

class Logger {
    constructor() {
        this.enabled = true;
        this.verbosity = VerbosityLevel.VERBOSE; // Default ON and verbose
        this.logHistory = [];
        this.maxHistorySize = 200; // Keep last 200 log entries
        this.listeners = [];
    }

    /**
     * Set verbosity level for gameplay logging
     * @param {number} level - VerbosityLevel constant
     */
    setVerbosity(level) {
        this.verbosity = level;
        this.info('Logger', `Verbosity set to ${this.getVerbosityName(level)}`);
    }

    /**
     * Get current verbosity level
     * @returns {number}
     */
    getVerbosity() {
        return this.verbosity;
    }

    /**
     * Get verbosity level name
     * @param {number} level
     * @returns {string}
     */
    getVerbosityName(level) {
        const names = ['OFF', 'LOW', 'MEDIUM', 'HIGH', 'VERBOSE'];
        return names[level] || 'UNKNOWN';
    }

    /**
     * Check if a message should be logged based on verbosity
     * @param {number} requiredLevel - Minimum verbosity level needed
     * @returns {boolean}
     */
    shouldLog(requiredLevel) {
        return this.verbosity >= requiredLevel;
    }

    /**
     * Register a listener for log events (used by overlay)
     * @param {Function} callback - Called with log entry object
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove a log listener
     * @param {Function} callback
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners of a log event
     * @private
     */
    notifyListeners(level, module, message, data) {
        const logEntry = {
            timestamp: Date.now(),
            level,
            module,
            message,
            data: data || null
        };
        
        // Add to history
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
        
        // Notify listeners (overlay)
        this.listeners.forEach(listener => {
            try {
                listener(logEntry);
            } catch (err) {
                // Avoid infinite loop if listener fails
                console.error('Logger listener error:', err);
            }
        });
    }

    /**
     * Get log history
     * @returns {Array}
     */
    getHistory() {
        return this.logHistory;
    }

    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
    }

    /**
     * Log info message (always shown in console when enabled)
     */
    info(module, message, ...args) {
        if (!this.enabled) return;
        console.log(`%c[${module}] %c${message}`, 'color: #7afcff; font-weight: bold;', 'color: inherit;', ...args);
        this.notifyListeners('INFO', module, message, args.length > 0 ? args : null);
    }

    /**
     * Log debug message (shown when Config.DEBUG is true)
     */
    debug(module, message, ...args) {
        if (!this.enabled || !Config.DEBUG) return;
        console.debug(`%c[DEBUG:${module}] %c${message}`, 'color: #ffd700; font-weight: bold;', 'color: #ccc;', ...args);
        this.notifyListeners('DEBUG', module, message, args.length > 0 ? args : null);
    }

    /**
     * Log warning message (always shown)
     */
    warn(module, message, ...args) {
        console.warn(`[${module}] ${message}`, ...args);
        this.notifyListeners('WARN', module, message, args.length > 0 ? args : null);
    }

    /**
     * Log gameplay event with verbosity filtering
     * @param {number} requiredLevel - Minimum verbosity level
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    game(requiredLevel, module, message, data = null) {
        if (!this.shouldLog(requiredLevel)) return;
        
        // Always notify listeners regardless of console output
        this.notifyListeners('GAME', module, message, data);
        
        // Console output only if debug enabled
        if (Config.DEBUG) {
            console.log(`%c[GAME:${module}] %c${message}`, 'color: #ff6ec7; font-weight: bold;', 'color: #fff;', data || '');
        }
    }
}

export const logger = new Logger();

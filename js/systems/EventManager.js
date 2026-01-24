/**
 * EVENT_MANAGER.js
 * Decoupled event system for game signaling.
 */
import { ErrorHandler } from '../utils/ErrorHandler.js';
import { logger } from '../utils/Logger.js';

class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName 
     * @param {Function} callback 
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);
        logger.debug('EventManager', `Subscribed to: ${eventName}`);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName 
     * @param {Function} callback 
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).delete(callback);
        }
    }

    /**
     * Emit an event.
     * @param {string} eventName 
     * @param {any} data 
     */
    emit(eventName, data) {
        if (!this.listeners.has(eventName)) return;

        this.listeners.get(eventName).forEach(callback => {
            try {
                callback(data);
            } catch (error)
            {
                ErrorHandler.handle('EventManager', `Error in listener for ${eventName}: ${error.message}`);
            }
        });
    }
}

export const eventManager = new EventManager();

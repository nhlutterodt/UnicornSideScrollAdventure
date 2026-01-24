'use strict';

import { logger } from '../utils/Logger.js';

/**
 * STORAGE_MANAGER.js
 * Robust wrapper for LocalStorage with namespacing and versioning.
 * Follows 'Local Storage Analysis' Decision 1, 3, and 5.
 */
export class StorageManager {
    /**
     * @param {string} namespace - Unique prefix for data (e.g., 'unicorn_run').
     * @param {number} version - Current schema version.
     */
    constructor(namespace = 'unicorn_magical_run', version = 1) {
        this.ns = `${namespace}_v${version}`;
    }

    /**
     * Saves data to localStorage.
     * @param {string} key 
     * @param {any} value - Will be JSON stringified.
     */
    save(key, value) {
        try {
            const data = JSON.stringify(value);
            localStorage.setItem(`${this.ns}_${key}`, data);
        } catch (e) {
            logger.error('StorageManager', 'Failed to save data.', e);
        }
    }

    /**
     * Loads data from localStorage.
     * @param {string} key 
     * @param {any} defaultValue 
     */
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`${this.ns}_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            logger.warn('StorageManager', `Failed to parse data for ${key}. Using default.`, e);
            return defaultValue;
        }
    }

    /**
     * Clears all data within this namespace.
     */
    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith(this.ns)) {
                localStorage.removeItem(k);
            }
        });
    }
}

// Export a default instance for general use
export const gameStorage = new StorageManager();

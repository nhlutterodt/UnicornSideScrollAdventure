'use strict';

import { Config } from '../Config.js';
import { Logger } from '../utils/Logger.js';

/**
 * STORAGE.js
 * Handles local storage with namespacing, versioning, and error handling.
 * Singleton pattern.
 */
class StorageSystem {
    constructor() {
        this.prefix = 'unicorn_magic_run_v1_';
        this.isSupported = this._checkSupport();
        if (!this.isSupported) {
            Logger.warn('StorageSystem: LocalStorage is not supported or disabled.');
        }
    }

    /**
     * Checks if localStorage is available and working.
     * @returns {boolean}
     * @private
     */
    _checkSupport() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Generates a namespaced key.
     * @param {string} key 
     * @returns {string}
     * @private
     */
    _getKey(key) {
        return `${this.prefix}${key}`;
    }

    /**
     * Saves data to localStorage.
     * @param {string} key - The identifier key.
     * @param {*} value - The data to save (will be JSON stringified).
     * @returns {boolean} - True if successful, false otherwise.
     */
    save(key, value) {
        if (!this.isSupported) return false;

        try {
            const storageKey = this._getKey(key);
            const data = {
                version: Config.VERSION || 1, // Fallback if Config.VERSION isn't set
                timestamp: Date.now(),
                payload: value
            };
            const serialized = JSON.stringify(data);
            localStorage.setItem(storageKey, serialized);
            return true;
        } catch (e) {
            Logger.error('StorageSystem: Save failed.', e);
            return false;
        }
    }

    /**
     * Loads data from localStorage.
     * @param {string} key - The identifier key.
     * @param {*} defaultValue - Value to return if key doesn't exist or fails.
     * @returns {*} - The stored payload or defaultValue.
     */
    load(key, defaultValue = null) {
        if (!this.isSupported) return defaultValue;

        try {
            const storageKey = this._getKey(key);
            const serialized = localStorage.getItem(storageKey);

            if (!serialized) return defaultValue;

            const data = JSON.parse(serialized);

            // Basic validation: ensure it has the structure we expect
            if (data && typeof data === 'object' && 'payload' in data) {
                // Future: Add version migration logic here if data.version < Config.VERSION
                return data.payload;
            }

            // Fallback for raw data if migration happened or strictness varies
            return defaultValue;
        } catch (e) {
            Logger.error('StorageSystem: Load failed.', e);
            return defaultValue;
        }
    }

    /**
     * Removes a specific item.
     * @param {string} key 
     */
    remove(key) {
        if (!this.isSupported) return;
        localStorage.removeItem(this._getKey(key));
    }

    /**
     * Clears all items associated with this game's namespace.
     */
    clear() {
        if (!this.isSupported) return;

        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(this.prefix)) {
                localStorage.removeItem(k);
            }
        });
    }
}

// Export as Singleton
export const Storage = new StorageSystem();

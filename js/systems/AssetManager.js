'use strict';

import { logger, VerbosityLevel } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';

/**
 * ASSET_MANAGER.js
 * Handles asynchronous preloading and caching of game assets (images, audio).
 */
class AssetManager {
    constructor() {
        this.images = new Map();
        this.audio = new Map();
        
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.hasFailed = false;
        this.isInitialized = false;
    }

    /**
     * Initializes the manager and begins loading all necessary assets.
     * @returns {Promise} Resolves when all assets are loaded.
     */
    async initialize() {
        if (this.isInitialized) return Promise.resolve();
        
        logger.info('AssetManager', 'Initializing Asset Manager...');
        
        // Define assets to load (this could eventually be loaded from a JSON manifest)
        const assetsToLoad = {
            images: [
                // { key: 'player_idle', path: '/assets/images/player_idle.png' }
            ],
            audio: [
                // { key: 'bg_music', path: '/assets/audio/music.mp3' }
            ]
        };

        this.totalAssets = assetsToLoad.images.length + assetsToLoad.audio.length;
        
        if (this.totalAssets === 0) {
            logger.info('AssetManager', 'No assets configured for preloading.');
            this.isInitialized = true;
            return Promise.resolve();
        }

        const promises = [];

        // Load Images
        for (const imgConfig of assetsToLoad.images) {
            promises.push(this.loadImage(imgConfig.key, imgConfig.path));
        }

        // Load Audio (Placeholder for future actual audio buffer preloading if needed)
        // Currently AudioSystem uses standard HTML5 Audio tags or dynamic buffering, 
        // but this lays the foundation for WebAudio API Buffer preloading.
        for (const audConfig of assetsToLoad.audio) {
            promises.push(this.loadAudio(audConfig.key, audConfig.path));
        }

        try {
            await Promise.all(promises);
            this.isInitialized = true;
            logger.info('AssetManager', 'All assets preloaded successfully.');
        } catch (error) {
            this.hasFailed = true;
            logger.error('AssetManager', `Asset loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Loads a single image.
     * @param {string} key 
     * @param {string} path 
     * @returns {Promise}
     */
    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(key, img);
                this._incrementLoaded(key, 'image');
                resolve(img);
            };
            img.onerror = (e) => reject(new Error(`Failed to load image at ${path}`));
            img.src = path;
        });
    }

    /**
     * Placeholder for formal WebAudio or generic audio preloading.
     * @param {string} key 
     * @param {string} path 
     * @returns {Promise}
     */
    loadAudio(key, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => {
                this.audio.set(key, audio);
                this._incrementLoaded(key, 'audio');
                resolve(audio);
            };
            audio.onerror = (e) => reject(new Error(`Failed to load audio at ${path}`));
            audio.src = path;
        });
    }

    _incrementLoaded(key, type) {
        this.loadedAssets++;
        eventManager.emit('ASSET_LOADED', { 
            key, 
            type, 
            progress: this.loadedAssets / this.totalAssets 
        });
    }

    /**
     * Synchronously retrieves a preloaded image.
     * @param {string} key 
     * @returns {HTMLImageElement|null}
     */
    getImage(key) {
        return this.images.get(key) || null;
    }

    /**
     * Synchronously retrieves a preloaded audio element/buffer.
     * @param {string} key 
     * @returns {HTMLAudioElement|null}
     */
    getAudio(key) {
        return this.audio.get(key) || null;
    }
}

// Export singleton instance
export const assetManager = new AssetManager();

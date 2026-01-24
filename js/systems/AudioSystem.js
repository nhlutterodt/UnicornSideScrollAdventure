'use strict';

import { logger } from '../utils/Logger.js';
import { Storage } from './Storage.js';
import { eventManager } from './EventManager.js';
import { getHowl, getHowler, initHowler } from '../libs/howler-wrapper.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * AUDIO_SYSTEM.js
 * Handles audio playback using Howler.js for cross-browser compatibility.
 * Supports volume persistence, muting, and event-driven sound effects.
 * 
 * CRITICAL: Never use html5: true for short sounds (<5 seconds).
 * Only use html5: true for large files (>5MB) or streaming audio.
 * See docs/audio_integration_guide.md for details.
 */
export class AudioSystem {
    constructor() {
        this.sounds = {};
        this.initialized = false;
        this.unlocked = false;
        this.Howl = null;
        this.Howler = null;
        
        // Will be set after init()
        this.savedVolume = Storage.load('audio.volume', 0.7);
        this.savedMuted = Storage.load('audio.muted', false);
    }

    /**
     * Initialize audio system - loads Howler.js and applies saved settings
     * Must be called before registering or playing sounds
     * @returns {Promise<void>}
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Load Howler.js dynamically
            await initHowler();
            this.Howl = await getHowl();
            this.Howler = await getHowler();
            
            // Apply saved settings
            this.Howler.volume(this.savedVolume);
            this.Howler.mute(this.savedMuted);
            
            this.initialized = true;
            logger.info('AudioSystem', `Initialized with volume=${this.savedVolume}, muted=${this.savedMuted}`);
        } catch (err)
        {
            ErrorHandler.handle(err, 'AudioSystem.init', 'Failed to initialize Howler.js');
        }
    }

    /**
     * Register a sound effect for later playback
     * @param {string} name - Sound identifier (e.g., 'jump', 'pickup')
     * @param {string|Array} src - File path(s) or data URL
     * @param {Object} options - Howler options
     * @param {number} options.volume - Sound volume (0.0 to 1.0)
     * @param {boolean} options.loop - Whether to loop
     * @param {number} options.rate - Playback rate (0.5 to 4.0)
     */
    registerSound(name, src, options = {}) {
        if (!this.initialized || !this.Howl) {
            logger.warn('AudioSystem', 'Cannot register sound - not initialized. Call init() first.');
            return;
        }
        
        if (this.sounds[name]) {
            logger.warn('AudioSystem', `Sound '${name}' already registered, skipping`);
            return;
        }
        
        this.sounds[name] = new this.Howl({
            src: Array.isArray(src) ? src : [src],
            volume: options.volume !== undefined ? options.volume : 1.0,
            loop: options.loop || false,
            rate: options.rate || 1.0,
            onload: () => {
                logger.debug('AudioSystem', `'${name}' loaded successfully`);
            },
            onloaderror: (id, err) => {
                logger.warn('AudioSystem', `'${name}' failed to load:`, err);
            },
            onplayerror: (id, err) => {
                logger.warn('AudioSystem', `'${name}' failed to play:`, err);
                // Try to unlock audio on mobile
                if (!this.unlocked) {
                    const sound = this.sounds[name];
                    sound.once('unlock', () => {
                        logger.info('AudioSystem', 'Audio unlocked via user interaction');
                        this.unlocked = true;
                        sound.play();
                    });
                }
            }
        });
        
        logger.debug('AudioSystem', `Registered sound: ${name}`);
    }

    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {Object} options - Playback options
     * @param {number} options.volume - Volume override (0.0 to 1.0)
     * @param {number} options.rate - Playback rate override (0.5 to 4.0)
     * @returns {number|null} Sound ID for controlling specific instance, or null if failed
     */
    play(name, options = {}) {
        const sound = this.sounds[name];
        if (!sound) {
            logger.warn('AudioSystem', `Cannot play '${name}' - not registered`);
            return null;
        }
        
        const id = sound.play();
        
        // Apply per-instance overrides
        if (options.volume !== undefined) {
            sound.volume(options.volume, id);
        }
        if (options.rate !== undefined) {
            sound.rate(options.rate, id);
        }
        
        logger.debug('AudioSystem', `Playing '${name}' (id=${id})`);
        return id;
    }

    /**
     * Stop a sound or all instances of it
     * @param {string} name - Sound identifier
     * @param {number} id - Optional sound ID to stop specific instance
     */
    stop(name, id = null) {
        const sound = this.sounds[name];
        if (!sound) {
            logger.warn('AudioSystem', `Cannot stop '${name}' - not registered`);
            return;
        }
        
        sound.stop(id);
        logger.debug('AudioSystem', `Stopped '${name}'${id ? ` (id=${id})` : ' (all instances)'}`);
    }

    /**
     * Pause a sound
     * @param {string} name - Sound identifier
     * @param {number} id - Optional sound ID to pause specific instance
     */
    pause(name, id = null) {
        const sound = this.sounds[name];
        if (!sound) return;
        
        sound.pause(id);
        logger.debug('AudioSystem', `Paused '${name}'`);
    }

    /**
     * Check if a sound is currently playing
     * @param {string} name - Sound identifier
     * @param {number} id - Optional sound ID to check specific instance
     * @returns {boolean}
     */
    isPlaying(name, id = null) {
        const sound = this.sounds[name];
        if (!sound) return false;
        
        return sound.playing(id);
    }

    /**
     * Set global volume for all sounds
     * @param {number} volume - Volume from 0.0 to 1.0
     */
    setVolume(volume) {
        if (!this.initialized || !this.Howler) return;
        
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.Howler.volume(clampedVolume);
        Storage.save('audio.volume', clampedVolume);
        eventManager.emit('AUDIO_VOLUME_CHANGED', { volume: clampedVolume });
        logger.info('AudioSystem', `Volume set to ${(clampedVolume * 100).toFixed(0)}%`);
    }

    /**
     * Get current global volume
     * @returns {number} Volume from 0.0 to 1.0
     */
    getVolume() {
        if (!this.initialized || !this.Howler) return this.savedVolume;
        return this.Howler.volume();
    }

    /**
     * Mute or unmute all audio
     * @param {boolean} muted - True to mute, false to unmute
     */
    setMuted(muted) {
        if (!this.initialized || !this.Howler) return;
        
        this.Howler.mute(muted);
        Storage.save('audio.muted', muted);
        eventManager.emit('AUDIO_MUTED_CHANGED', { muted });
        logger.info('AudioSystem', `Audio ${muted ? 'muted' : 'unmuted'}`);
    }

    /**
     * Get current mute state
     * @returns {boolean}
     */
    isMuted() {
        return Storage.load('audio.muted', false);
    }

    /**
     * Unload a specific sound to free memory
     * @param {string} name - Sound identifier
     */
    unloadSound(name) {
        const sound = this.sounds[name];
        if (!sound) return;
        
        sound.unload();
        delete this.sounds[name];
        logger.debug('AudioSystem', `Unloaded sound: ${name}`);
    }

    /**
     * Cleanup - unload all sounds and reset state
     */
    dispose() {
        // Unload all sounds
        Object.keys(this.sounds).forEach(name => {
            this.sounds[name].unload();
        });
        
        this.sounds = {};
        this.initialized = false;
        this.unlocked = false;
        
        logger.info('AudioSystem', 'Disposed');
    }
}

// Export singleton instance
export const audioSystem = new AudioSystem();

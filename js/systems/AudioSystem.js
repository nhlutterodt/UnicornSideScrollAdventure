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

            // Generate and register procedural audio assets
            this.registerProceduralSounds();

            // Hook up systemic event listeners
            this.setupEventListeners();
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

    registerProceduralSounds() {
        try {
            logger.info('AudioSystem', 'Generating and registering procedural sounds...');
            
            const jumpUrl = generateSweep(880, 880, 0.15, 'sine', 0.5);
            if (!jumpUrl) {
                logger.warn('AudioSystem', 'Skipping procedural sound generation (AudioContext unavailable)');
                return;
            }
            
            const pickupUrl = generateSweep(1320, 1320, 0.1, 'triangle', 0.6);
            const collisionUrl = generateSweep(220, 220, 0.2, 'square', 0.4);
            const laserUrl = generateSweep(2000, 500, 0.25, 'sawtooth', 0.4);
            const roarUrl = generateSweep(100, 30, 0.6, 'square', 0.6);
            const musicUrl = generateMelody(4.0);
            const levelUpUrl = generateSweep(440, 1760, 0.4, 'triangle', 0.5);
            const gameOverUrl = generateSweep(300, 80, 0.8, 'sawtooth', 0.5);
            
            this.registerSound('jump', jumpUrl);
            this.registerSound('pickup', pickupUrl);
            this.registerSound('collision', collisionUrl);
            this.registerSound('LASER', laserUrl);
            this.registerSound('ROAR', roarUrl);
            this.registerSound('music', musicUrl, { loop: true, volume: 0.6 });
            this.registerSound('level-up', levelUpUrl);
            this.registerSound('game-over', gameOverUrl);
            
            logger.info('AudioSystem', 'All procedural sounds registered successfully');
        } catch (error) {
            logger.warn('AudioSystem', 'Failed to generate/register procedural sounds:', error);
        }
    }

    setupEventListeners() {
        eventManager.on('PLAYER_JUMP', () => {
            this.play('jump');
        });

        eventManager.on('LIFE_CHANGED', (data) => {
            if (data.delta < 0) {
                this.play('collision');
            } else if (data.delta > 0) {
                this.play('pickup');
            }
        });

        eventManager.on('LEVEL_UP', () => {
            this.play('level-up');
        });

        eventManager.on('GAME_STARTED', () => {
            this.stop('music');
            this.play('music');
        });

        eventManager.on('GAME_OVER', () => {
            this.stop('music');
            this.play('game-over');
        });
    }
}

// Export singleton instance
export const audioSystem = new AudioSystem();

// ==========================================
// Procedural Audio Generation Helpers
// ==========================================

function generateSweep(frequencyStart, frequencyEnd, duration, waveType = 'sine', volume = 0.5) {
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioContextClass) {
        logger.warn('AudioSystem', 'Web Audio API (AudioContext) is not supported in this environment');
        return '';
    }
    const audioContext = new AudioContextClass();
    const sampleRate = audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const phase = 2 * Math.PI * (frequencyStart * t + 0.5 * (frequencyEnd - frequencyStart) * t * t / duration);
        
        let sample;
        switch (waveType) {
            case 'square':
                sample = Math.sin(phase) > 0 ? volume : -volume;
                break;
            case 'sawtooth':
                sample = volume * (2 * ((phase / (2 * Math.PI)) % 1) - 1);
                break;
            case 'triangle':
                sample = volume * (Math.abs(((phase / (2 * Math.PI)) % 1) * 4 - 2) - 1);
                break;
            case 'sine':
            default:
                sample = volume * Math.sin(phase);
        }
        
        // Envelope
        const fadeIn = Math.min(i / (sampleRate * 0.005), 1);
        const fadeOut = Math.min((numSamples - i) / (sampleRate * 0.05), 1);
        channelData[i] = sample * fadeIn * fadeOut;
    }
    
    const wav = audioBufferToWav(audioBuffer);
    const base64 = arrayBufferToBase64(wav);
    return `data:audio/wav;base64,${base64}`;
}

function generateMelody(duration = 4.0) {
    const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioContextClass) {
        logger.warn('AudioSystem', 'Web Audio API (AudioContext) is not supported in this environment');
        return '';
    }
    const audioContext = new AudioContextClass();
    const sampleRate = audioContext.sampleRate;
    const numSamples = sampleRate * duration;
    const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Simple chord progression: C-G-Am-F
    const notes = [
        [262, 330, 392], // C major chord
        [392, 494, 588], // G major chord  
        [220, 262, 330], // A minor chord
        [349, 440, 523]  // F major chord
    ];
    
    const noteLength = duration / notes.length;
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const noteIndex = Math.floor(t / noteLength);
        const chord = notes[Math.min(noteIndex, notes.length - 1)];
        
        let sample = 0;
        chord.forEach(freq => {
            sample += 0.15 * Math.sin(2 * Math.PI * freq * t);
        });
        
        const noteTime = t % noteLength;
        const attack = Math.min(noteTime / 0.05, 1);
        const release = Math.min((noteLength - noteTime) / 0.1, 1);
        
        channelData[i] = sample * attack * release;
    }
    
    const wav = audioBufferToWav(audioBuffer);
    const base64 = arrayBufferToBase64(wav);
    return `data:audio/wav;base64,${base64}`;
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = new Float32Array(buffer.length);
    buffer.copyFromChannel(data, 0);
    
    const dataLength = data.length * bytesPerSample;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

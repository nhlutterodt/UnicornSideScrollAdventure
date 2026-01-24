'use strict';

import { logger } from '../utils/Logger.js';

/**
 * AUDIO_SYSTEM.js
 * Handles synthesis and playback of game audio effects.
 * Modular and non-blocking, following the project's system standards.
 */
export class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isInitialized = false;
        
        // Map of synth definitions
        this.synthDefinitions = {
            LASER: (ctx, gain, color) => {
                const osc = ctx.createOscillator();
                const mod = ctx.createOscillator();
                const modGain = ctx.createGain();
                
                // Frequency based on color (just for fun)
                let freq = 800;
                if (color === '#ff0000') freq = 400;
                if (color === '#00ff00') freq = 1200;
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
                
                mod.frequency.setValueAtTime(50, ctx.currentTime);
                modGain.gain.setValueAtTime(100, ctx.currentTime);
                
                mod.connect(modGain);
                modGain.connect(osc.frequency);
                
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                
                osc.connect(gain);
                osc.start();
                mod.start();
                osc.stop(ctx.currentTime + 0.2);
            },
            ROAR: (ctx, gain) => {
                const osc = ctx.createOscillator();
                const noise = ctx.createBufferSource();
                const bufferSize = ctx.sampleRate * 0.5;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                noise.buffer = buffer;
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
                
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
                
                noise.connect(filter);
                filter.connect(gain);
                osc.connect(gain);
                
                noise.start();
                osc.start();
                noise.stop(ctx.currentTime + 0.5);
                osc.stop(ctx.currentTime + 0.5);
            },
            PICKUP: (ctx, gain) => {
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
                
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                
                osc.connect(gain);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }
        };
    }

    /**
     * Lazy initialization of AudioContext to satisfy browser autoplay policies.
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.isInitialized = true;
            logger.info('AudioSystem', 'Context initialized.');
        } catch (e)
        {
            logger.warn('AudioSystem', 'Web Audio API not supported.', e);
        }
    }

    /**
     * Play a sound effect by ID.
     * @param {string} soundId 
     * @param {Object} params - optional params like color
     */
    play(soundId, params = {}) {
        if (!this.isInitialized) this.init();
        if (!this.ctx) return;

        // Resume context if suspended (common in browsers)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const synth = this.synthDefinitions[soundId];
        if (synth) {
            const effectGain = this.ctx.createGain();
            effectGain.connect(this.masterGain);
            synth(this.ctx, effectGain, params.color);
        }
    }

    /**
     * Mandatory cleanup for system disposal.
     */
    dispose() {
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
            this.isInitialized = false;
        }
    }
}

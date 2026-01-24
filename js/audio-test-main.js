/**
 * audio-test-main.js
 * Test page for Howler.js audio system integration
 */

import { logger } from './utils/Logger.js';

/**
 * Generate a simple beep tone using Web Audio API
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type ('sine', 'square', 'sawtooth', 'triangle')
 * @param {number} volume - Volume multiplier (0-1)
 * @returns {Promise<Blob>} Audio blob
 */
function generateTone(frequency, duration, type = 'sine', volume = 0.5) {
    return new Promise((resolve) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const numSamples = sampleRate * duration;
        const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate tone
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample;
            
            switch (type) {
                case 'square':
                    sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? volume : -volume;
                    break;
                case 'sawtooth':
                    sample = volume * (2 * ((t * frequency) % 1) - 1);
                    break;
                case 'triangle':
                    sample = volume * (Math.abs(((t * frequency) % 1) * 4 - 2) - 1);
                    break;
                case 'sine':
                default:
                    sample = volume * Math.sin(2 * Math.PI * frequency * t);
            }
            
            // Apply envelope (fade in/out)
            const fadeIn = Math.min(i / (sampleRate * 0.01), 1);
            const fadeOut = Math.min((numSamples - i) / (sampleRate * 0.05), 1);
            channelData[i] = sample * fadeIn * fadeOut;
        }
        
        // Convert to WAV data URL
        const offlineContext = new OfflineAudioContext(1, numSamples, sampleRate);
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        offlineContext.startRendering().then(renderedBuffer => {
            const wav = audioBufferToWav(renderedBuffer);
            const base64 = arrayBufferToBase64(wav);
            resolve(`data:audio/wav;base64,${base64}`);
        });
    });
}

/**
 * Convert AudioBuffer to WAV format
 */
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

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Generate a simple melody (chord progression)
 */
function generateMelody(duration = 4.0) {
    return new Promise((resolve) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
            
            // Mix the three notes of the chord
            let sample = 0;
            chord.forEach(freq => {
                sample += 0.15 * Math.sin(2 * Math.PI * freq * t);
            });
            
            // Apply envelope for each note
            const noteTime = t % noteLength;
            const attack = Math.min(noteTime / 0.05, 1);
            const release = Math.min((noteLength - noteTime) / 0.1, 1);
            
            channelData[i] = sample * attack * release;
        }
        
        // Convert to WAV data URL
        const offlineContext = new OfflineAudioContext(1, numSamples, sampleRate);
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        offlineContext.startRendering().then(renderedBuffer => {
            const wav = audioBufferToWav(renderedBuffer);
            const base64 = arrayBufferToBase64(wav);
            resolve(`data:audio/wav;base64,${base64}`);
        });
    });
}

/**
 * Simple audio system using Howler.js with procedurally generated sounds
 */
class AudioTest {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicPlaying = false;
        this.masterVolume = 0.5;
        this.initialized = false;
    }
    
    async init() {
        logger.info('AudioTest', 'Generating test tones...');
        this.updateStatus('⏳ Generating audio...');
        
        try {
            // Generate different tones for each sound effect
            logger.info('AudioTest', 'Generating jump tone...');
            const jumpUrl = await generateTone(880, 0.15, 'sine', 0.5); // A5 note
            logger.info('AudioTest', 'Jump tone generated');
            
            logger.info('AudioTest', 'Generating pickup tone...');
            const pickupUrl = await generateTone(1320, 0.1, 'triangle', 0.6); // E6 note
            logger.info('AudioTest', 'Pickup tone generated');
            
            logger.info('AudioTest', 'Generating collision tone...');
            const collisionUrl = await generateTone(220, 0.2, 'square', 0.4); // A3 note
            logger.info('AudioTest', 'Collision tone generated');
            
            logger.info('AudioTest', 'Generating music...');
            const musicUrl = await generateMelody(4.0); // 4-second chord progression
            logger.info('AudioTest', 'Music generated');
            
            // Create Howl instances (using Web Audio API by default)
            this.sounds.jump = new Howl({
                src: [jumpUrl],
                volume: 0.5,
                onload: () => logger.info('AudioTest', 'Jump sound ready'),
                onloaderror: (id, err) => logger.warn('AudioTest', 'Jump load error:', err)
            });
            
            this.sounds.pickup = new Howl({
                src: [pickupUrl],
                volume: 0.7,
                onload: () => logger.info('AudioTest', 'Pickup sound ready'),
                onloaderror: (id, err) => logger.warn('AudioTest', 'Pickup load error:', err)
            });
            
            this.sounds.collision = new Howl({
                src: [collisionUrl],
                volume: 0.6,
                onload: () => logger.info('AudioTest', 'Collision sound ready'),
                onloaderror: (id, err) => logger.warn('AudioTest', 'Collision load error:', err)
            });
            
            this.music = new Howl({
                src: [musicUrl],
                loop: true,
                volume: 0.6,
                onload: () => logger.info('AudioTest', 'Music ready'),
                onloaderror: (id, err) => logger.warn('AudioTest', 'Music load error:', err),
                onplay: () => {
                    logger.info('AudioTest', 'Music started playing');
                    this.updateMusicButton(true);
                },
                onpause: () => {
                    logger.info('AudioTest', 'Music paused');
                    this.updateMusicButton(false);
                },
                onend: () => logger.info('AudioTest', 'Music ended')
            });
            
            // Set global volume
            Howler.volume(this.masterVolume);
            
            this.initialized = true;
            logger.info('AudioTest', 'All sounds generated successfully');
            this.updateStatus('✓ Audio ready - Click buttons to test!');
        } catch (err)
        {
            logger.warn('AudioTest', 'Failed to generate audio:', err);
            this.updateStatus('❌ Audio generation failed');
        }
    }
    
    play(soundId) {
        if (!this.initialized) {
            this.updateStatus('⚠ Audio not ready yet');
            return;
        }
        
        if (this.sounds[soundId]) {
            this.sounds[soundId].play();
            this.updateStatus(`🔊 Playing: ${soundId}`);
            logger.debug('AudioTest', `Playing sound: ${soundId}`);
        }
    }
    
    toggleMusic() {
        if (!this.initialized) {
            this.updateStatus('⚠ Audio not ready yet');
            return;
        }
        
        if (this.musicPlaying) {
            this.music.pause();
            this.musicPlaying = false;
            this.updateStatus('⏸ Music paused');
            logger.info('AudioTest', 'Music toggle: pausing');
        } else {
            const id = this.music.play();
            this.musicPlaying = true;
            this.updateStatus('▶ Music playing (chord progression)');
            logger.info('AudioTest', 'Music toggle: playing, id=' + id);
        }
    }
    
    updateMusicButton(isPlaying) {
        const button = document.getElementById('test-music');
        if (button) {
            button.textContent = isPlaying ? '⏸ Stop Music' : '▶ Play Music';
            if (isPlaying) {
                button.classList.add('playing');
            } else {
                button.classList.remove('playing');
            }
        }
    }
    
    setVolume(volume) {
        this.masterVolume = volume;
        Howler.volume(volume);
        this.updateStatus(`🔊 Volume: ${Math.round(volume * 100)}%`);
        logger.debug('AudioTest', `Volume set to: ${volume}`);
    }
    
    updateStatus(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    const audio = new AudioTest();
    
    // Initialize audio (async)
    await audio.init();
    
    // Bind test buttons
    document.getElementById('test-jump')?.addEventListener('click', () => {
        audio.play('jump');
    });
    
    document.getElementById('test-pickup')?.addEventListener('click', () => {
        audio.play('pickup');
    });
    
    document.getElementById('test-collision')?.addEventListener('click', () => {
        audio.play('collision');
    });
    
    document.getElementById('test-music')?.addEventListener('click', () => {
        audio.toggleMusic();
    });
    
    // Volume slider
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            audio.setVolume(volume);
            if (volumeValue) {
                volumeValue.textContent = `${Math.round(volume * 100)}%`;
            }
        });
    }
    
    logger.info('AudioTest', 'Test page ready');
});

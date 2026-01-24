# Audio Integration Guide - Howler.js Best Practices

## Overview
This project uses [Howler.js v2.2.3](https://github.com/goldfire/howler.js) hosted locally at `js/libs/howler.min.js` for offline audio playback. This guide documents best practices learned during integration.

## Critical Rule: When NOT to Use `html5: true`

### ❌ Never Use for Short Sounds
```javascript
// WRONG - Causes "HTML5 Audio pool exhausted" errors
const jump = new Howl({
    src: ['jump.mp3'],
    html5: true  // ❌ BAD for short sounds!
});
```

**Why?** HTML5 Audio has a limited pool (default: 10 elements). When exhausted, sounds fail to play silently or trigger warnings.

### ✅ Correct Usage - Let Howler Choose
```javascript
// CORRECT - Uses Web Audio API (default)
const jump = new Howl({
    src: ['jump.mp3'],
    volume: 0.5,
    onloaderror: (id, err) => logger.warn('Audio', 'Jump load failed:', err)
});
```

**Why?** Web Audio API (Howler's default):
- No pool limitations
- Better performance for short sounds
- Perfect support for base64 data URLs
- Ideal for procedural/generated audio

## When to Use `html5: true`

According to [Howler.js docs](https://github.com/goldfire/howler.js#html5-boolean-false):
> "Set to `true` to force HTML5 Audio. This should be used for **large audio files** so that you don't have to wait for the full file to be downloaded and decoded before playing."

✅ **Use html5: true for**:
- Large files (>5MB)
- Streaming audio (live streams, radio)
- Long music tracks that shouldn't be fully buffered

```javascript
// CORRECT - Large file streaming
const soundtrack = new Howl({
    src: ['long-soundtrack.mp3'],  // 10MB file
    html5: true,  // ✅ OK for large files
    loop: true
});
```

## Procedural Audio Generation Pipeline

For generating sounds programmatically (tested in [audio-test-main.js](../js/audio-test-main.js)):

### 1. Generate Audio with Web Audio API
```javascript
function generateTone(frequency, duration, waveType = 'sine', volume = 1.0) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    
    const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
    const oscillator = offlineCtx.createOscillator();
    const gainNode = offlineCtx.createGain();
    
    oscillator.type = waveType;  // 'sine', 'square', 'triangle', 'sawtooth'
    oscillator.frequency.value = frequency;
    
    gainNode.gain.value = volume;
    
    oscillator.connect(gainNode);
    gainNode.connect(offlineCtx.destination);
    
    oscillator.start();
    oscillator.stop(duration);
    
    return offlineCtx.startRendering();
}
```

### 2. Convert AudioBuffer to WAV
```javascript
function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = buffer.getChannelData(0);
    const dataLength = data.length * bytesPerSample;
    
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);
    
    // WAV header (44 bytes)
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
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
    
    // PCM data
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
```

### 3. Convert to Base64 Data URL
```javascript
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Complete pipeline
async function generateSoundEffect(freq, duration, waveType, volume) {
    const audioBuffer = await generateTone(freq, duration, waveType, volume);
    const wavArrayBuffer = audioBufferToWav(audioBuffer);
    const base64 = arrayBufferToBase64(wavArrayBuffer);
    return `data:audio/wav;base64,${base64}`;
}
```

### 4. Load into Howler
```javascript
const jumpUrl = await generateSoundEffect(880, 0.15, 'sine', 0.5);
const jumpSound = new Howl({
    src: [jumpUrl],  // Base64 data URL
    volume: 0.5
    // ✅ No html5: true needed for data URLs!
});
```

## Error Handling Best Practices

Always add error handlers to catch loading failures:

```javascript
const sound = new Howl({
    src: ['sound.mp3'],
    volume: 0.5,
    onload: () => logger.info('Audio', 'Sound loaded successfully'),
    onloaderror: (id, err) => {
        logger.warn('Audio', 'Failed to load sound:', err);
        // Error codes: 1=aborted, 2=network, 3=decode, 4=not suitable
    },
    onplayerror: (id, err) => {
        logger.warn('Audio', 'Failed to play sound:', err);
        // May need user interaction to unlock audio on mobile
    }
});
```

## Common Errors and Solutions

### "HTML5 Audio pool exhausted"
**Cause**: Using `html5: true` for multiple short sounds.
**Solution**: Remove `html5: true` and let Howler use Web Audio API.

### "No codec support for selected audio sources"
**Cause**: Browser doesn't support the audio format (rare with MP3/WAV).
**Solution**: 
- Use base64 data URLs instead of blob URLs for Howler
- Ensure audio format is valid (WAV header correct)
- Provide multiple formats: `src: ['sound.mp3', 'sound.ogg']`

### Sounds don't play on mobile
**Cause**: Audio locked until user interaction (iOS/Android security).
**Solution**: Howler auto-unlocks, but you can listen for it:
```javascript
const sound = new Howl({
    src: ['sound.mp3'],
    onplayerror: function() {
        sound.once('unlock', function() {
            sound.play();  // Retry after unlock
        });
    }
});
```

## Integration Checklist

When integrating audio into the game:

- [ ] Howler.js v2.2.3 loaded from `js/libs/howler.min.js`
- [ ] Short sounds (<5s) do NOT use `html5: true`
- [ ] Large files/streaming DO use `html5: true`
- [ ] All Howl instances have `onloaderror` handlers
- [ ] Logger.js used for all audio logging (no `console.log`)
- [ ] Volume controls use `Howler.volume()` for global, `sound.volume()` for individual
- [ ] Sound files organized in `sounds/` directory (or generated procedurally)
- [ ] AudioSystem.js uses Howler singleton pattern (not multiple Howl instances per sound)

## Reference Files

- **Test Page**: [audio-test.html](../audio-test.html) - Working example with volume controls
- **Test Logic**: [js/audio-test-main.js](../js/audio-test-main.js) - Procedural audio generation
- **Howler Library**: [js/libs/howler.min.js](../js/libs/howler.min.js) - v2.2.3 (36KB)
- **Official Docs**: https://github.com/goldfire/howler.js#documentation

## Next Steps

See integration plan in project discussion for migrating AudioSystem.js to use Howler.js with these best practices.

# Audio System Integration Plan

## Current State

### ✅ Completed
- Howler.js v2.2.3 downloaded locally to `js/libs/howler.min.js` (36KB)
- Test page `audio-test.html` with working procedural audio generation
- All 4 test sounds working correctly (jump, pickup, collision, music)
- Volume controls functional
- Documentation updated with best practices
- Quality checks passing

### 📋 Current AudioSystem.js Status
The existing [js/systems/AudioSystem.js](../js/systems/AudioSystem.js) uses vanilla Web Audio API directly. It needs to be migrated to use Howler.js for consistency and cross-browser compatibility.

## Integration Goals

1. **Migrate AudioSystem.js to Howler.js** - Replace direct Web Audio API usage
2. **Sound Asset Management** - Organize sound files or generate procedurally
3. **Event-Driven Integration** - Connect to EventManager for game events
4. **Volume Persistence** - Save volume settings via Storage.js
5. **Performance** - Ensure no audio pool issues or memory leaks

## Phase 1: AudioSystem.js Refactor

### Current Architecture (Web Audio API)
```javascript
class AudioSystem {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};  // Direct AudioBuffer management
    }
    
    // Loads sound files as AudioBuffers
    async loadSound(name, url) { ... }
    
    // Plays using AudioBufferSourceNode
    play(name) { ... }
}
```

### Target Architecture (Howler.js)
```javascript
import { Howl, Howler } from '../libs/howler.min.js';
import { eventManager } from './EventManager.js';
import { Storage } from './Storage.js';
import { logger } from '../utils/Logger.js';

class AudioSystem {
    constructor() {
        this.sounds = {};
        this.initialized = false;
        
        // Load saved volume
        const savedVolume = Storage.load('audio.volume', 0.7);
        Howler.volume(savedVolume);
        
        logger.info('AudioSystem', 'Initialized with Howler.js');
    }
    
    /**
     * Register a sound effect
     * @param {string} name - Sound identifier
     * @param {string|Array} src - File path(s) or data URL
     * @param {Object} options - Howler options (volume, loop, etc.)
     */
    registerSound(name, src, options = {}) {
        if (this.sounds[name]) {
            logger.warn('AudioSystem', `Sound '${name}' already registered`);
            return;
        }
        
        this.sounds[name] = new Howl({
            src: Array.isArray(src) ? src : [src],
            volume: options.volume || 1.0,
            loop: options.loop || false,
            onload: () => logger.debug('AudioSystem', `${name} loaded`),
            onloaderror: (id, err) => logger.warn('AudioSystem', `${name} load failed:`, err),
            onplayerror: (id, err) => logger.warn('AudioSystem', `${name} play failed:`, err)
        });
    }
    
    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {Object} options - Playback options (volume override, etc.)
     * @returns {number|null} Sound ID or null if failed
     */
    play(name, options = {}) {
        const sound = this.sounds[name];
        if (!sound) {
            logger.warn('AudioSystem', `Sound '${name}' not found`);
            return null;
        }
        
        const id = sound.play();
        
        // Apply volume override if provided
        if (options.volume !== undefined) {
            sound.volume(options.volume, id);
        }
        
        return id;
    }
    
    /**
     * Stop a specific sound or all instances
     * @param {string} name - Sound identifier
     * @param {number} id - Optional sound ID to stop specific instance
     */
    stop(name, id = null) {
        const sound = this.sounds[name];
        if (!sound) return;
        
        sound.stop(id);
    }
    
    /**
     * Set global volume
     * @param {number} volume - Volume from 0.0 to 1.0
     */
    setVolume(volume) {
        Howler.volume(volume);
        Storage.save('audio.volume', volume);
        eventManager.emit('AUDIO_VOLUME_CHANGED', { volume });
    }
    
    /**
     * Get current global volume
     * @returns {number} Volume from 0.0 to 1.0
     */
    getVolume() {
        return Howler.volume();
    }
    
    /**
     * Mute/unmute all audio
     * @param {boolean} muted - True to mute, false to unmute
     */
    setMuted(muted) {
        Howler.mute(muted);
        Storage.save('audio.muted', muted);
        eventManager.emit('AUDIO_MUTED_CHANGED', { muted });
    }
    
    /**
     * Cleanup - unload all sounds
     */
    dispose() {
        Object.values(this.sounds).forEach(sound => sound.unload());
        this.sounds = {};
        logger.info('AudioSystem', 'Disposed');
    }
}

// Export singleton instance
export const audioSystem = new AudioSystem();
```

## Phase 2: Sound Asset Strategy

### Option A: Real Audio Files (Recommended for production)
```javascript
// In AudioSystem initialization or Game.js
audioSystem.registerSound('jump', 'sounds/jump.mp3');
audioSystem.registerSound('pickup', 'sounds/pickup.mp3');
audioSystem.registerSound('collision', 'sounds/collision.mp3');
audioSystem.registerSound('music', 'sounds/music.mp3', { loop: true, volume: 0.6 });
```

**Pros**:
- Professional sound quality
- Smaller file size (MP3 compression)
- Easier to replace/update

**Cons**:
- Requires sourcing/creating audio files
- Adds to project size

**Free Resources**:
- [Kenney.nl](https://kenney.nl/assets?q=audio) - 1000+ free game sounds (CC0)
- [Freesound.org](https://freesound.org/) - Community sound library (various licenses)
- [Zapsplat](https://www.zapsplat.com/) - Free with attribution

### Option B: Procedural Generation (Current test implementation)
```javascript
// Use existing generateTone/generateMelody functions
const sounds = {
    jump: await generateTone(880, 0.15, 'sine', 0.5),
    pickup: await generateTone(1320, 0.1, 'triangle', 0.6),
    collision: await generateTone(220, 0.2, 'square', 0.4)
};

audioSystem.registerSound('jump', sounds.jump);
audioSystem.registerSound('pickup', sounds.pickup);
audioSystem.registerSound('collision', sounds.collision);
```

**Pros**:
- No external files needed
- Easy to tweak parameters
- Unique to the game

**Cons**:
- Basic sound quality
- Generation overhead at startup
- Larger data URLs than compressed MP3

### Recommendation: Hybrid Approach
- Use procedural for early development/MVP
- Replace with real audio files for production release
- Keep procedural generation as fallback if files fail to load

## Phase 3: Event Integration

Connect AudioSystem to game events:

```javascript
// In Game.js or AudioSystem.init()
eventManager.on('PLAYER_JUMPED', () => {
    audioSystem.play('jump');
});

eventManager.on('ITEM_PICKED_UP', () => {
    audioSystem.play('pickup');
});

eventManager.on('PLAYER_DAMAGED', () => {
    audioSystem.play('collision');
});

eventManager.on('LEVEL_UP', () => {
    audioSystem.play('level-up');
});

eventManager.on('GAME_STARTED', () => {
    audioSystem.play('music');  // Background music
});

eventManager.on('GAME_OVER', () => {
    audioSystem.stop('music');
    audioSystem.play('game-over');
});
```

## Phase 4: Settings Integration

Update `settings.html` to include audio controls:

```html
<!-- In settings.html -->
<div class="setting-group">
    <label for="volume-slider">
        <span class="setting-icon">🔊</span>
        Sound Volume
    </label>
    <input 
        type="range" 
        id="volume-slider" 
        min="0" 
        max="100" 
        value="70"
        aria-label="Adjust sound volume"
    >
    <span id="volume-value">70%</span>
</div>

<div class="setting-group">
    <label for="mute-toggle">
        <span class="setting-icon">🔇</span>
        Mute All Audio
    </label>
    <input 
        type="checkbox" 
        id="mute-toggle"
        aria-label="Mute all game audio"
    >
</div>
```

```javascript
// In settings-main.js
Dom.get('volume-slider').addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    audioSystem.setVolume(volume);
    Dom.get('volume-value').textContent = `${e.target.value}%`;
});

Dom.get('mute-toggle').addEventListener('change', (e) => {
    audioSystem.setMuted(e.target.checked);
});
```

## Phase 5: Mobile Audio Unlock

Handle mobile audio restrictions:

```javascript
// In AudioSystem or Game.js
class AudioSystem {
    constructor() {
        this.unlocked = false;
        
        // Howler handles unlock automatically, but we can listen
        eventManager.on('GAME_STARTED', () => {
            if (!this.unlocked) {
                // Play silent sound to unlock audio context
                this.play('jump', { volume: 0 });
                this.unlocked = true;
                logger.info('AudioSystem', 'Audio unlocked');
            }
        });
    }
}
```

## Implementation Checklist

### Pre-Integration
- [ ] All audio test page functionality working (✅ DONE)
- [ ] Documentation updated (✅ DONE)
- [ ] Quality checks passing (✅ DONE)

### Phase 1: AudioSystem Refactor
- [ ] Backup existing AudioSystem.js
- [ ] Rewrite to use Howler.js singleton pattern
- [ ] Add volume persistence with Storage.js
- [ ] Add error handling with Logger.js
- [ ] Test basic play/stop/volume functions

### Phase 2: Sound Assets
- [ ] Decide: Procedural vs. Real files vs. Hybrid
- [ ] If real files: Create `sounds/` directory
- [ ] If real files: Download/create sound effects
- [ ] Register all sounds in AudioSystem
- [ ] Test all sounds load and play correctly

### Phase 3: Event Integration
- [ ] Connect PLAYER_JUMPED → jump sound
- [ ] Connect ITEM_PICKED_UP → pickup sound
- [ ] Connect PLAYER_DAMAGED → collision sound
- [ ] Connect LEVEL_UP → level-up sound
- [ ] Connect GAME_STARTED → music
- [ ] Connect GAME_OVER → stop music + game-over sound
- [ ] Test in-game audio triggers

### Phase 4: Settings UI
- [ ] Add volume slider to settings.html
- [ ] Add mute toggle to settings.html
- [ ] Update settings-main.js event handlers
- [ ] Test volume persistence across page reloads
- [ ] Test mute state persistence

### Phase 5: Testing & Polish
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test audio unlock on first interaction
- [ ] Test performance (no pool exhaustion warnings)
- [ ] Test with low volume, muted, and full volume
- [ ] Run `npm test` to verify standards compliance

## Rollback Plan

If integration causes issues:
1. Existing AudioSystem.js backed up as `AudioSystem.backup.js`
2. Revert import in Game.js: `import { AudioSystem } from './systems/AudioSystem.backup.js';`
3. Remove Howler.js integration
4. Report issues and iterate

## Success Metrics

- ✅ All game sounds play on all events
- ✅ No console errors or Howler warnings
- ✅ Volume settings persist across sessions
- ✅ Audio works on mobile after first interaction
- ✅ No performance degradation (60 FPS maintained)
- ✅ `npm test` passes with zero violations

## Timeline Estimate

- Phase 1: 2-3 hours (AudioSystem refactor)
- Phase 2: 1-2 hours (Asset strategy + registration)
- Phase 3: 1 hour (Event integration)
- Phase 4: 1 hour (Settings UI)
- Phase 5: 2-3 hours (Cross-browser testing)

**Total**: 7-10 hours for complete integration

## Next Action

Ready to begin Phase 1: AudioSystem.js refactor with Howler.js when approved.

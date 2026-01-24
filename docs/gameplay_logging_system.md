# Gameplay Logging System

## Overview
Comprehensive on-screen logging overlay for analyzing gameplay sessions in real-time. Logs all game events from low-level physics to high-level progression milestones.

## Features
- **Live On-Screen Display**: Real-time log feed overlaying gameplay
- **5 Verbosity Levels**: OFF, LOW, MEDIUM, HIGH, VERBOSE
- **Persistent Settings**: Remembers visibility and verbosity across sessions
- **Keyboard Toggle**: Press `L` key to show/hide
- **Configurable**: Dropdown selector for verbosity level
- **Filterable**: Color-coded by log level (DEBUG, INFO, WARN, GAME)
- **Auto-Scroll**: Always shows most recent logs
- **Performance**: Capped at 200 logs in memory, 50 visible

## Verbosity Levels

### OFF (0)
No gameplay logging (system logs still work)

### LOW (1) - Critical Events Only
- 🎮 Game start
- 💀 Game over
- 🏆 New high score
- 📈 Level up
- 🎖️ Score milestones (10, 25, 50, 100, 250, 500, 1000)

### MEDIUM (2) - Player Actions
**Includes LOW + :**
- ⬆️ Player jumps
- 💔 Obstacle collisions
- ✨ Item pickups
- 💚 Invincibility granted
- 🎯 Score changes

### HIGH (3) - Entity Lifecycle
**Includes MEDIUM + :**
- 🌵 Obstacle spawns
- 🟢 Platform landings
- 🔁 Platform bounces
- 🛡️ Invincibility blocks
- Entity destruction

### VERBOSE (4) - Everything
**Includes HIGH + :**
- Physics updates
- State changes
- Frame events
- Performance metrics
- Internal system operations

## Usage

### In-Game Controls
- **Press L**: Toggle log overlay visibility
- **Dropdown**: Select verbosity level (OFF/LOW/MEDIUM/HIGH/VERBOSE)
- **🗑️ Button**: Clear all logs
- **🔽 Button**: Minimize overlay (hides log list)
- **✕ Button**: Hide overlay (same as pressing L)

### Log Format
```
[MM:SS.mmm] Module: Message { data }
```

Example:
```
[02:34.521] Player: ⬆️ JUMP { jumpForce: 600, multiplier: 1, position: {x: 80, y: 450} }
[02:35.103] Player: 💔 HIT OBSTACLE { livesRemaining: 0, position: {x: 82, y: 467} }
[02:35.105] Player: ☠️ DEATH - No lives remaining
[02:35.107] Game: 💀 GAME OVER { finalScore: 42, finalLevel: 3, lives: 0 }
```

## Integration Points

### Logger.js
- **logger.game(level, module, message, data)**: Main API for gameplay logging
- **logger.setVerbosity(level)**: Change verbosity level programmatically
- **logger.getVerbosity()**: Get current level
- **logger.addListener(callback)**: Subscribe to log events (used by overlay)
- **logger.clearHistory()**: Clear log buffer

### Code Examples

```javascript
import { logger, VerbosityLevel } from './utils/Logger.js';

// Critical event (always shown if verbosity >= LOW)
logger.game(VerbosityLevel.LOW, 'Game', '🎮 NEW GAME STARTED');

// Player action (shown if verbosity >= MEDIUM)
logger.game(VerbosityLevel.MEDIUM, 'Player', '⬆️ JUMP', {
    jumpForce: 600,
    position: { x: 80, y: 450 }
});

// Entity lifecycle (shown if verbosity >= HIGH)
logger.game(VerbosityLevel.HIGH, 'SpawnManager', '🌵 Obstacle spawned', {
    x: 800,
    interval: 2.5
});
```

## Files Modified/Created

### New Files
- `js/systems/LogOverlay.js` - On-screen log display system
- `css/log-overlay.css` - Overlay styling
- `docs/gameplay_logging_system.md` - This documentation

### Modified Files
- `js/utils/Logger.js` - Added verbosity levels, log capture, listener system
- `js/Game.js` - Initialize LogOverlay, add game state logging
- `js/entities/Player.js` - Log jumps, collisions, damage, pickups
- `js/systems/LevelSystem.js` - Log level progression
- `js/systems/ScoreManager.js` - Log score changes and milestones
- `js/systems/SpawnManager.js` - Log entity spawns
- `index.html` - Add log-overlay.css stylesheet

## Storage Keys
- `logOverlayVisible` (boolean) - Overlay visibility state
- `logOverlayMinimized` (boolean) - Overlay minimized state
- `logVerbosity` (number) - Current verbosity level (0-4)

## Performance Impact
- **Minimal**: Logs only created when verbosity threshold met
- **Capped**: Max 200 logs in memory, 50 visible
- **Efficient**: Uses event delegation, no frame-by-frame DOM updates
- **Smart**: Doesn't render when hidden or minimized

## Use Cases

### Balance Testing
Set to **MEDIUM** to track:
- Jump frequency vs obstacle spawn rate
- Collision patterns (where/when player hits obstacles)
- Item pickup timing
- Score progression rate

### Difficulty Analysis
Set to **LOW** to focus on:
- Level progression speed
- Score milestones reached
- Game over frequency
- High score achievement

### Technical Debugging
Set to **VERBOSE** to see:
- Full event sequence
- System interactions
- Physics calculations
- State transitions

## Default Configuration
- **Verbosity**: VERBOSE (4) - Shows everything
- **Visible**: ON - Overlay shown by default
- **Minimized**: OFF - Expanded by default
- **Position**: Bottom-right corner
- **Size**: 500px wide × 400px max height (responsive on mobile)

## Future Enhancements
- Export logs to file (download as .txt)
- Filter by module (e.g., only show Player logs)
- Search/grep functionality
- Timestamp filtering (last 10 seconds, last minute)
- FPS/performance overlay integration
- Session replay from logs

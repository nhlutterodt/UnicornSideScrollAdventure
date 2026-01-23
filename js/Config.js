/**
 * CONFIG.js
 * Centralized data-driven configuration.
 * 
 * Adjust these values to tune gameplay feel.
 * Values are properly scaled for Delta Time (Seconds).
 */
export const Config = {
    // Physics (SI-like units: pixels per second)
    GRAVITY: 1500,        // Downward acceleration p/s^2
    JUMP_FORCE: -650,     // Instant upward velocity p/s

    // Environment
    GROUND_HEIGHT: 60,

    // Gameplay
    INITIAL_GAME_SPEED: 350,   // Pixels per second
    SPEED_INCREMENT: 20,       // Speed increase per interval
    MAX_GAME_SPEED: 1200,

    SPAWN_INTERVAL_MIN: 1.0,   // Seconds
    SPAWN_INTERVAL_START: 2.0, // Seconds

    // Platforms
    PLATFORM_PLACEMENT_MODE: 'probabilistic', // 'deterministic' or 'probabilistic'
    PLATFORM_PROBABILITY: 0.3,               // Chance to spawn when timer hits
    PLATFORM_SPEED_RATIO: 1.0,               // Relative to game speed
    PLATFORM_MIN_WIDTH: 100,
    PLATFORM_MAX_WIDTH: 300,
    PLATFORM_HEIGHT: 20,
    PLATFORM_VERTICAL_RANGE: [200, 450],     // Range for Y position (from top)
    PLATFORM_GRAVITY: false,                 // Toggle if platforms should fall!

    // Visuals
    COLORS: ['#ff7eb9', '#7afcff', '#ffffff', '#ffd700'],

    // Debug
    SHOW_COLLIDERS: false,

    // System
    VERSION: 1
};

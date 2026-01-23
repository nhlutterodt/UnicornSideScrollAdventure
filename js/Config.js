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

    // Power Ups
    POWERUP_SPAWN_INTERVAL: 8.0, // Every 8 seconds on average
    ABILITIES: [
        {
            id: 'lasers',
            name: 'Ruby Eye Lasers',
            icon: '👁️',
            color: '#ff0000',
            duration: 60,
            uses: null,
            cooldown: 0.1, // Rapid fire allowed but throttled
            effectConfig: {
                type: 'beam',
                color: '#ff0000',
                thickness: 4
            }
        },
        {
            id: 'lasers_emerald',
            name: 'Emerald Lasers',
            icon: '🍏',
            color: '#00ff00',
            duration: 60,
            uses: null,
            cooldown: 0.15,
            effectConfig: {
                type: 'beam',
                color: '#00ff00',
                thickness: 6
            }
        },
        {
            id: 'roar',
            name: 'Sonic Roar',
            icon: '🦁',
            color: '#ffa500',
            duration: 120,
            uses: 10,
            cooldown: 0.8, // Forced delay between roars
            effectConfig: {
                radius: 300,
                color: '#ffa500'
            }
        }
    ],

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

    // Particle System
    PARTICLE_SYSTEM: {
        MAX_PARTICLES: 512,
        TIER2_MAX_ACTIVE: 64, // Max particles allowed to do entity collision
        TIER2_MAX_CHECKS_PER_FRAME: 256,
        DESPAWN_MARGIN: 200, // Distance behind left edge before killing
        
        EFFECTS: {
            TRAIL: {
                count: 1,
                life: [0.5, 0.8],
                size: [2, 6],
                speed: [20, 50],
                gravity: 0,
                tier: 0,
                color: '#ffffff'
            },
            LAND_DUST: {
                count: 12,
                life: [0.4, 0.7],
                size: [2, 5],
                speed: [50, 150],
                gravity: 200,
                tier: 1, // Ground collision
                color: '#e0e0e0'
            },
            IMPACT_SPARK: {
                count: 8,
                life: [0.3, 0.6],
                size: [1, 3],
                speed: [100, 300],
                gravity: 400,
                tier: 2, // Entity collision
                color: '#ffd700'
            },
            PICKUP_BURST: {
                count: 20,
                life: [0.6, 1.2],
                size: [3, 8],
                speed: [80, 200],
                gravity: -50, // Floating up
                tier: 0,
                color: '#7afcff'
            },
            ROAR: {
                count: 30,
                life: [0.3, 0.6],
                size: [5, 12],
                speed: [200, 400],
                gravity: 0,
                tier: 0,
                color: '#ffa500'
            },
            LASER: {
                count: 5,
                life: [0.1, 0.3],
                size: [2, 4],
                speed: [50, 100],
                gravity: 0,
                tier: 0,
                color: '#ffffff'
            }
        }
    },

    // Debug
    SHOW_COLLIDERS: false,
    PARTICLE_DEBUG: false,

    // System
    VERSION: 1
};

/**
 * CONFIG.js
 * Centralized data-driven configuration.
 * 
 * Adjust these values to tune gameplay feel.
 * Values are properly scaled for Delta Time (Seconds).
 */
export const Config = {
    // --- Physics & World ---
    GRAVITY: 1500,        
    JUMP_FORCE: -650,     
    GROUND_HEIGHT: 60,
    INITIAL_GAME_SPEED: 350,   
    MAX_GAME_SPEED: 1200,

    // --- Progression & Leveling ---
    // The LevelSystem consumes this to determine stage changes
    LEVEL_PROGRESSION: {
        DISTANCE_PER_LEVEL: 2000,
        SPEED_INCREMENT_PER_LEVEL: 40,
        SPAWN_INTERVAL_DECREMENT: 0.1,
        MAX_DIFFICULTY_MULTIPLIER: 2.5
    },

    // Define "Stages" with unique environmental configurations
    STAGES: [
        {
            levelStart: 1,
            name: "Morning Meadow",
            theme: {
                primary: '#8ce68c', // Ground color
                secondary: '#76c476',
                background: 'skyblue',
                elements: ['🌸', '🌼', '🍄']
            },
            modifiers: {
                gravityMultiplier: 1.0,
                timeScale: 1.0,
                friction: 1.0, // Normal ground
                bounciness: 0  // No bounce
            }
        },
        {
            levelStart: 5,
            name: "Twilight Clouds",
            theme: {
                primary: '#a29bfe',
                secondary: '#6c5ce7',
                background: '#2d3436',
                elements: ['✨', '⭐', '☁️']
            },
            modifiers: {
                gravityMultiplier: 0.8, // Lower gravity in clouds
                timeScale: 1.1,        // Slightly faster pace
                friction: 0.5,         // Slippery clouds!
                bounciness: 0.3        // Soft bounce
            }
        },
        {
            levelStart: 10,
            name: "Gravity Void",
            theme: {
                primary: '#2d3436',
                secondary: '#000000',
                background: '#0984e3',
                elements: ['🌀', '⚛️', '☄️']
            },
            modifiers: {
                gravityMultiplier: 1.4, // Crushing gravity
                timeScale: 0.9,         // Intense but slightly slower motion
                friction: 1.2,          // Heavy mud-like feeling
                bounciness: 0
            }
        }
    ],

    // --- Abstracted Customization Mapping ---
    // Maps Level Studio terms to actual game modifiers
    ENVIRONMENT_MAPPING: {
        surfaces: {
            normal: { friction: 1.0, bounciness: 0 },
            slippery: { friction: 0.2, bounciness: 0.1 },
            bouncy: { friction: 0.8, bounciness: 0.8 }
        },
        paces: {
            zen: { timeScale: 0.7 },
            normal: { timeScale: 1.0 },
            turbo: { timeScale: 1.4 }
        },
        skies: {
            clouds: { gravityMultiplier: 0.9 },
            stars: { gravityMultiplier: 1.0 },
            dragons: { gravityMultiplier: 0.7 }
        }
    },

    // --- Item System ---
    ITEM_TYPES: {
        ABILITY: 'ability',
        LIFE: 'life',
        PHYSICS: 'physics',
        INVINCIBILITY: 'invincibility',
        WORLD: 'world' // Affects the entire world/time
    },
    ITEM_SPAWN_INTERVAL: 8.0, 
    ITEMS: [
        {
            id: 'extra_life',
            type: 'life',
            name: 'Sparkle Heart',
            icon: '💖',
            color: '#ff3366',
            value: 1,
            weight: 10
        },
        {
            id: 'invincibility_star',
            type: 'invincibility',
            name: 'Magic Star',
            icon: '⭐',
            color: '#fffb00',
            duration: 5,
            weight: 5
        },
        {
            id: 'gravity_feather',
            type: 'physics',
            name: 'Light Feather',
            icon: '🪶',
            color: '#7afcff',
            duration: 8,
            modifier: { gravityMultiplier: 0.5 },
            weight: 15
        },
        {
            id: 'heavy_stone',
            type: 'physics',
            name: 'Heavy Stone',
            icon: '🪨',
            color: '#808080',
            duration: 8,
            modifier: { gravityMultiplier: 1.5, jumpMultiplier: 0.8 },
            weight: 5
        },
        {
            id: 'chronos_clock',
            type: 'world',
            name: 'Time Clock',
            icon: '⏳',
            color: '#a29bfe',
            duration: 5,
            modifier: { timeScale: 0.5 }, // Slow motion!
            weight: 8
        },
        {
            id: 'ability_lasers',
            type: 'ability',
            abilityId: 'lasers',
            weight: 30
        },
        {
            id: 'ability_roar',
            type: 'ability',
            abilityId: 'roar',
            weight: 30
        }
    ],

    // --- Power Ups (Abilities) ---
    ABILITIES: [
        {
            id: 'lasers',
            name: 'Ruby Eye Lasers',
            icon: '👁️',
            color: '#ff0000',
            duration: 60,
            uses: null,
            cooldown: 0.1, 
            effectConfig: {
                type: 'beam',
                color: '#ff0000',
                thickness: 4
            }
        },
        {
            id: 'roar',
            name: 'Sonic Roar',
            icon: '🦁',
            color: '#ffa500',
            duration: 120,
            uses: 10,
            cooldown: 0.8, 
            effectConfig: {
                radius: 300,
                color: '#ffa500'
            }
        }
    ],

    // --- Spawning Logic ---
    SPAWN_INTERVAL_MIN: 1.0,   
    SPAWN_INTERVAL_START: 2.0, 

    // Platforms
    PLATFORM_PLACEMENT_MODE: 'probabilistic', 
    PLATFORM_PROBABILITY: 0.3,               
    PLATFORM_MIN_WIDTH: 100,
    PLATFORM_MAX_WIDTH: 300,
    PLATFORM_HEIGHT: 20,
    PLATFORM_VERTICAL_RANGE: [200, 450],     

    // --- System & Debug ---
    DEBUG: true,
    SHOW_COLLIDERS: false,
    LOG_LEVEL: 'DEBUG', // NONE, INFO, DEBUG

    // --- Particle System ---
    PARTICLE_SYSTEM: {
        MAX_PARTICLES: 512,
        TIER2_MAX_ACTIVE: 64,
        TIER2_MAX_CHECKS_PER_FRAME: 256,
        DESPAWN_MARGIN: 200,
        
        EFFECTS: {
            TRAIL: { count: 1, life: [0.5, 0.8], size: [2, 6], speed: [20, 50], gravity: 0, tier: 0, color: '#ffffff' },
            LAND_DUST: { count: 12, life: [0.4, 0.7], size: [2, 5], speed: [50, 150], gravity: 200, tier: 1, color: '#e0e0e0' },
            IMPACT_SPARK: { count: 8, life: [0.3, 0.6], size: [1, 3], speed: [100, 300], gravity: 400, tier: 2, color: '#ffd700' },
            PICKUP_BURST: { count: 20, life: [0.6, 1.2], size: [3, 8], speed: [80, 200], gravity: -50, tier: 0, color: '#7afcff' },
            ROAR: { count: 30, life: [0.3, 0.6], size: [5, 12], speed: [200, 400], gravity: 0, tier: 0, color: '#ffa500' },
            LASER: { count: 5, life: [0.1, 0.3], size: [2, 4], speed: [50, 100], gravity: 0, tier: 0, color: '#ffffff' }
        }
    }
};
    

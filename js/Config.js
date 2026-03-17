import { logger } from './utils/Logger.js';
import { eventManager } from './systems/EventManager.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

/**
 * CONFIG.js
 * Centralized data-driven configuration with external JSON loading.
 * 
 * Responsibilities:
 * - Define primitive constants (GRAVITY, JUMP_FORCE, etc.)
 * - Load external content from JSON files (STAGES, ITEMS, ABILITIES)
 * - Validate loaded configuration data
 * - Provide fallback configuration if external load fails
 * - Expose unified API to game systems
 * 
 * External Dependencies:
 * - ./utils/Logger.js (for logging)
 * - ./utils/ErrorHandler.js (for error handling)
 * - ./systems/EventManager.js (for event emission)
 * 
 * External Files:
 * - ./config/stages.json (stage definitions)
 * - ./config/items.json (item definitions)
 * - ./config/abilities.json (ability definitions)
 * 
 * @module Config
 * @see config_externalization_implementation_plan.md
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

    // --- External Config Paths ---
    CONFIG_PATHS: {
        STAGES: './js/config/stages.json',
        ITEMS: './js/config/items.json',
        ABILITIES: './js/config/abilities.json',
        EFFECTS: './js/config/effects.json'
    },

    // --- Fallbacks (minimal safe defaults) ---
    FALLBACK: {
        STAGES: [
            {
                levelStart: 1,
                name: 'Safe Mode',
                theme: {
                    primary: '#8ce68c',
                    secondary: '#76c476',
                    background: 'skyblue',
                    elements: ['🌸']
                },
                modifiers: {
                    gravityMultiplier: 1.0,
                    timeScale: 1.0,
                    friction: 1.0,
                    bounciness: 0
                }
            }
        ],
        ITEMS: [
            {
                id: 'extra_life',
                type: 'life',
                name: 'Heart',
                icon: '💖',
                color: '#ff3366',
                value: 1,
                weight: 10
            }
        ],
        ABILITIES: [],
        EFFECTS: {
            "TRAIL": { "count": 1, "life": [0.5, 0.8], "size": [2, 6], "speed": [20, 50], "gravity": 0, "tier": 0, "color": "#ffffff" },
            "LAND_DUST": { "count": 12, "life": [0.4, 0.7], "size": [2, 5], "speed": [50, 150], "gravity": 200, "tier": 1, "color": "#e0e0e0" },
            "IMPACT_SPARK": { "count": 8, "life": [0.3, 0.6], "size": [1, 3], "speed": [100, 300], "gravity": 400, "tier": 2, "color": "#ffd700" }
        }
    },

    // NOTE: STAGES, ITEMS, ABILITIES now loaded from external JSON
    // Keeping commented for reference during transition
    /* STAGES: [
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
    ], */

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
    
    /* ITEMS: [
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
    ], */

    // --- Power Ups (Abilities) ---
    /* ABILITIES: [
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
    ], */

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
        DESPAWN_MARGIN: 200
    },

    // --- Loader Methods ---
    /**
     * Loads external configuration files with fallback support.
     * @returns {Promise<void>}
     */
    async loadExternalConfig() {
        logger.info('Config', 'Loading external configuration...');
        
        try {
            const loaded = {
                STAGES: await this._fetchConfig('STAGES'),
                ITEMS: await this._fetchConfig('ITEMS'),
                ABILITIES: await this._fetchConfig('ABILITIES'),
                EFFECTS: await this._fetchConfig('EFFECTS', false) // not an array
            };
            
            // Merge loaded data into Config object
            Object.assign(this, loaded);
            
            // Emit event for systems
            eventManager.emit('CONFIG_LOADED', {
                stageCount: this.STAGES.length,
                itemCount: this.ITEMS.length,
                abilityCount: this.ABILITIES.length,
                effectsLoaded: Object.keys(this.EFFECTS).length > 0
            });
            
            logger.info('Config', `Loaded ${this.STAGES.length} stages, ${this.ITEMS.length} items, ${this.ABILITIES.length} abilities, and effects.`);
            
        } catch (error)
        {
            ErrorHandler.handle('Config', 'Failed to load external config', true);
            throw error;
        }
    },

    /**
     * Fetches and validates a configuration file.
     * @param {string} key - The config key (STAGES, ITEMS, ABILITIES, EFFECTS)
     * @param {boolean} isArray - Whether the returned data should be an array
     * @returns {Promise<any>} The loaded configuration
     * @private
     */
    async _fetchConfig(key, isArray = true) {
        try {
            const path = this.CONFIG_PATHS[key];
            logger.debug('Config', `Fetching ${key} from ${path}`);
            
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extract from wrapper object
            const jsonKey = key.toLowerCase();
            const content = data[jsonKey];
            
            if (!content || (isArray && content.length === 0) || (!isArray && Object.keys(content).length === 0)) {
                logger.warn('Config', `${key} is empty or missing, using fallback`);
                return this.FALLBACK[key];
            }
            
            logger.debug('Config', `Loaded data for ${key}`);
            return content;
            
        } catch (error)
        {
            logger.warn('Config', `Failed to load ${key}: ${error.message}. Using fallback.`);
            ErrorHandler.handle('Config', `${key} load failure: ${error.message}`, false);
            return this.FALLBACK[key];
        }
    }
};
    

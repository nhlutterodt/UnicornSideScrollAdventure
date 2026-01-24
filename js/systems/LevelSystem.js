/**
 * LEVEL_SYSTEM.js
 * Decoupled system for managing progression, difficulty, and environmental changes.
 */
import { Config } from '../Config.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';
import { Storage } from './Storage.js';

export class LevelSystem {
    constructor() {
        this.distance = 0;
        this.level = 1;
        this.difficultyMultiplier = 1.0;
        
        this.gameSpeed = Config.INITIAL_GAME_SPEED;
        this.spawnInterval = Config.SPAWN_INTERVAL_START;

        this.currentStage = null;
        this.worldModifiers = { gravityMultiplier: 1.0, timeScale: 1.0, friction: 1.0, bounciness: 0 };
        
        // Abstracted User Customization
        this.userCustomization = Storage.load('levelConfig', null);

        this.init();
    }

    init() {
        this.updateStage();
        logger.info('LevelSystem', 'Initialized with Abstractions');
        if (this.userCustomization) {
            logger.info('LevelSystem', 'User Customization Detected', this.userCustomization);
        }
    }

    /**
     * Updates the level progression based on time/distance.
     * @param {number} dt 
     */
    update(dt) {
        const speed = this.gameSpeed;
        const deltaDist = speed * dt;
        this.distance += deltaDist;

        // progression logic using Config.LEVEL_PROGRESSION
        const { DISTANCE_PER_LEVEL, SPEED_INCREMENT_PER_LEVEL, SPAWN_INTERVAL_DECREMENT } = Config.LEVEL_PROGRESSION;

        const newLevel = Math.floor(this.distance / DISTANCE_PER_LEVEL) + 1;
        if (newLevel > this.level) {
            this.levelUp(newLevel);
        }

        // Gradual speed increase
        this.gameSpeed = Math.min(
            Config.MAX_GAME_SPEED, 
            Config.INITIAL_GAME_SPEED + (this.level - 1) * SPEED_INCREMENT_PER_LEVEL
        );

        this.spawnInterval = Math.max(
            Config.SPAWN_INTERVAL_MIN,
            Config.SPAWN_INTERVAL_START - (this.level - 1) * SPAWN_INTERVAL_DECREMENT
        );
    }

    levelUp(newLevel) {
        this.level = newLevel;
        this.difficultyMultiplier = Math.min(Config.LEVEL_PROGRESSION.MAX_DIFFICULTY_MULTIPLIER, 1.0 + (this.level - 1) * 0.1);
        
        logger.info('LevelSystem', `Level Up! Now at Level ${this.level}`);
        logger.game(VerbosityLevel.LOW, 'LevelSystem', `📈 LEVEL UP → ${this.level}`, {
            difficulty: this.difficultyMultiplier.toFixed(2),
            gameSpeed: Math.round(this.gameSpeed),
            spawnInterval: this.spawnInterval.toFixed(2)
        });
        
        this.updateStage();

        eventManager.emit('LEVEL_UP', { 
            level: this.level, 
            speed: this.gameSpeed,
            difficulty: this.difficultyMultiplier,
            stage: this.currentStage
        });
    }

    updateStage() {
        // Find the stage that matches current level
        let stage = [...Config.STAGES].reverse().find(s => this.level >= s.levelStart);
        
        if (stage && stage !== this.currentStage) {
            // Apply User Customization as overrides if we are in the "Start Stage" (Level 1)
            if (this.level === 1 && this.userCustomization) {
                stage = this._applyUserAbstractions(stage);
            }

            this.currentStage = stage;
            this.worldModifiers = { 
                gravityMultiplier: 1.0, 
                timeScale: 1.0, 
                friction: 1.0, 
                bounciness: 0,
                ...stage.modifiers 
            };
            
            logger.info('LevelSystem', `Stage Changed: ${stage.name}`);
            eventManager.emit('STAGE_CHANGED', stage);
        }
    }

    /**
     * Blends user abstraction settings from Level Studio into a stage config.
     * @param {Object} stage 
     * @returns {Object}
     */
    _applyUserAbstractions(stage) {
        const user = this.userCustomization;
        const mapping = Config.ENVIRONMENT_MAPPING;

        const customizedStage = JSON.parse(JSON.stringify(stage)); // Deep copy
        customizedStage.name = `Custom ${stage.name}`;

        // Blend Theme
        if (user.bg === 'night') customizedStage.theme.background = '#1a1a2e';
        if (user.bg === 'sunset') customizedStage.theme.background = '#e94560';
        
        if (user.flora === 'flowers') customizedStage.theme.elements.push('🌸', '🌹');
        if (user.flora === 'mushrooms') customizedStage.theme.elements.push('🍄', '🍄');

        // Blend Modifiers from Mapping
        if (mapping.surfaces[user.surface]) {
            Object.assign(customizedStage.modifiers, mapping.surfaces[user.surface]);
        }
        if (mapping.paces[user.pace]) {
            Object.assign(customizedStage.modifiers, mapping.paces[user.pace]);
        }
        if (mapping.skies[user.sky]) {
            Object.assign(customizedStage.modifiers, mapping.skies[user.sky]);
        }

        return customizedStage;
    }

    reset() {
        this.distance = 0;
        this.level = 1;
        this.difficultyMultiplier = 1.0;
        this.gameSpeed = Config.INITIAL_GAME_SPEED;
        this.spawnInterval = Config.SPAWN_INTERVAL_START;
        // Reload user config case they changed it in the lab
        this.userCustomization = Storage.load('levelConfig', null);
    }
}

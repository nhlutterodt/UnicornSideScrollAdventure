/**
 * LEVEL_SYSTEM.js
 * Decoupled system for managing progression, difficulty, and environmental changes.
 */
import { Config } from '../Config.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';
import { Storage } from './Storage.js';

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export class LevelSystem {
    constructor() {
        this.distance = 0;
        this.level = 1;
        this.difficultyMultiplier = 1.0;
        
        this.gameSpeed = Config.INITIAL_GAME_SPEED;
        this.spawnInterval = Config.SPAWN_INTERVAL_START;

        // Eases gameSpeed/spawnInterval toward their new level-derived targets over
        // Config.LEVEL_PROGRESSION.RAMP_DURATION_MS instead of snapping instantly.
        this.rampFrom = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampTo = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampElapsed = 0;
        this.rampDuration = 0;

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

        const { DISTANCE_PER_LEVEL } = Config.LEVEL_PROGRESSION;

        const newLevel = Math.floor(this.distance / DISTANCE_PER_LEVEL) + 1;
        if (newLevel > this.level) {
            this.levelUp(newLevel);
        }

        this._updateRamp(dt);
    }

    /**
     * Target gameSpeed for a given level (the value a ramp eases toward).
     */
    _targetSpeedFor(level) {
        const { SPEED_INCREMENT_PER_LEVEL } = Config.LEVEL_PROGRESSION;
        return Math.min(
            Config.MAX_GAME_SPEED,
            Config.INITIAL_GAME_SPEED + (level - 1) * SPEED_INCREMENT_PER_LEVEL
        );
    }

    /**
     * Target spawnInterval for a given level (the value a ramp eases toward).
     */
    _targetSpawnIntervalFor(level) {
        const { SPAWN_INTERVAL_DECREMENT } = Config.LEVEL_PROGRESSION;
        return Math.max(
            Config.SPAWN_INTERVAL_MIN,
            Config.SPAWN_INTERVAL_START - (level - 1) * SPAWN_INTERVAL_DECREMENT
        );
    }

    /**
     * Eases gameSpeed/spawnInterval from rampFrom toward rampTo over rampDuration
     * seconds. A no-op once the ramp completes (rampDuration reset to 0).
     */
    _updateRamp(dt) {
        if (this.rampDuration <= 0) return;

        this.rampElapsed += dt;
        const t = Math.min(1, this.rampElapsed / this.rampDuration);

        this.gameSpeed = lerp(this.rampFrom.speed, this.rampTo.speed, t);
        this.spawnInterval = lerp(this.rampFrom.spawnInterval, this.rampTo.spawnInterval, t);

        if (t >= 1) {
            this.rampDuration = 0;
        }
    }

    levelUp(newLevel) {
        this.level = newLevel;
        this.difficultyMultiplier = Math.min(Config.LEVEL_PROGRESSION.MAX_DIFFICULTY_MULTIPLIER, 1.0 + (this.level - 1) * Config.LEVEL_PROGRESSION.DIFFICULTY_INCREMENT_PER_LEVEL);

        // Ease into the new speed/spawn-interval targets instead of snapping instantly.
        this.rampFrom = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampTo = {
            speed: this._targetSpeedFor(this.level),
            spawnInterval: this._targetSpawnIntervalFor(this.level)
        };
        this.rampElapsed = 0;
        this.rampDuration = Config.LEVEL_PROGRESSION.RAMP_DURATION_MS / 1000;

        logger.info('LevelSystem', `Level Up! Now at Level ${this.level}`);
        logger.game(VerbosityLevel.LOW, 'LevelSystem', `📈 LEVEL UP → ${this.level}`, {
            difficulty: this.difficultyMultiplier.toFixed(2),
            gameSpeed: Math.round(this.rampTo.speed),
            spawnInterval: this.rampTo.spawnInterval.toFixed(2)
        });

        this.updateStage();

        eventManager.emit('LEVEL_UP', {
            level: this.level,
            speed: this.rampTo.speed,
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

        // Clear any in-progress ramp so a new run doesn't inherit the previous one's easing
        this.rampFrom = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampTo = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampElapsed = 0;
        this.rampDuration = 0;

        // Reload user config case they changed it in the lab
        this.userCustomization = Storage.load('levelConfig', null);
    }
}

/**
 * LEVEL_SYSTEM.js
 * Decoupled system for managing progression, difficulty, and environmental changes.
 */
import { Config } from '../Config.js';
import { logger, VerbosityLevel } from '../utils/Logger.js';
import { eventManager } from './EventManager.js';
import { Storage } from './Storage.js';
import {
    LEVEL_DEFAULTS,
    validateLevelData,
    unwrapProfileData
} from '../ProfileSchemas.js';

function lerp(a, b, t) {
    return a + (b - a) * t;
}

export class LevelSystem {
    constructor() {
        this.distance = 0;
        this.level = 1;
        this.difficultyMultiplier = 1.0;

        const settings = Storage.load('game_settings', {});
        this.difficultyPresetName = this._resolveDifficultyName(settings?.difficulty);
        this.difficultyPreset = Config.DIFFICULTY_PRESETS[this.difficultyPresetName] || Config.DIFFICULTY_PRESETS.normal;
        
        this.gameSpeed = Config.INITIAL_GAME_SPEED * this.difficultyPreset.speedMultiplier;
        this.spawnInterval = Config.SPAWN_INTERVAL_START * this.difficultyPreset.spawnIntervalMultiplier;

        // Eases gameSpeed/spawnInterval toward their new level-derived targets over
        // Config.LEVEL_PROGRESSION.RAMP_DURATION_MS instead of snapping instantly.
        this.rampFrom = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampTo = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampElapsed = 0;
        this.rampDuration = 0;

        this.currentStage = null;
        this.worldModifiers = { gravityMultiplier: 1.0, timeScale: 1.0, friction: 1.0, bounciness: 0 };
        this.entityBudget = Config.COLLISION_SYSTEM.MAX_ENTITIES;
        this.stageSpawnRates = null;
        
        // Abstracted User Customization — load from active level profile
        this.userCustomization = this._loadActiveLevelConfig();

        this.init();
    }

    init() {
        this.updateStage();
        logger.info('LevelSystem', `Initialized with difficulty preset: ${this.difficultyPresetName}`);
        if (this.userCustomization) {
            logger.info('LevelSystem', 'User Customization Detected', this.userCustomization);
        }
    }

    _resolveDifficultyName(name) {
        if (!name || typeof name !== 'string') return 'normal';
        if (Config.DIFFICULTY_PRESETS[name]) return name;
        return 'normal';
    }

    /**
     * Load the active level config from the profile system, with fallback chain:
     * 1. Active level profile (new system)
     * 2. Old single levelConfig key (migration path)
     * 3. Hardcoded defaults
     * @returns {Object|null} Level config or null if none
     * @private
     */
    _loadActiveLevelConfig() {
        // Try new profile system first
        const profiles = Storage.load('levelProfiles', null);
        if (profiles) {
            const activeId = Storage.load('activeLevelProfile', 'default');
            if (profiles[activeId]) {
                logger.debug('LevelSystem', `Loaded active level profile: ${activeId}`);
                return unwrapProfileData(profiles[activeId], validateLevelData, LEVEL_DEFAULTS);
            }
            // Active profile missing, try first available
            const firstKey = Object.keys(profiles)[0];
            if (firstKey && profiles[firstKey]) {
                logger.warn('LevelSystem', `Active level profile "${activeId}" not found, using "${firstKey}"`);
                return unwrapProfileData(profiles[firstKey], validateLevelData, LEVEL_DEFAULTS);
            }
        }

        // Fall back to old single levelConfig key
        const oldConfig = Storage.load('levelConfig', null);
        if (oldConfig) {
            logger.debug('LevelSystem', 'Using legacy levelConfig');
            const result = validateLevelData(oldConfig);
            return result.data;
        }

        return null;
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
            Config.MAX_GAME_SPEED * this.difficultyPreset.speedMultiplier,
            (Config.INITIAL_GAME_SPEED + (level - 1) * SPEED_INCREMENT_PER_LEVEL) * this.difficultyPreset.speedMultiplier
        );
    }

    /**
     * Target spawnInterval for a given level (the value a ramp eases toward).
     */
    _targetSpawnIntervalFor(level) {
        const { SPAWN_INTERVAL_DECREMENT } = Config.LEVEL_PROGRESSION;
        return Math.max(
            Config.SPAWN_INTERVAL_MIN,
            (Config.SPAWN_INTERVAL_START - (level - 1) * SPAWN_INTERVAL_DECREMENT) * this.difficultyPreset.spawnIntervalMultiplier
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
        this.difficultyMultiplier = Math.min(
            Config.LEVEL_PROGRESSION.MAX_DIFFICULTY_MULTIPLIER,
            (1.0 + (this.level - 1) * Config.LEVEL_PROGRESSION.DIFFICULTY_INCREMENT_PER_LEVEL) * this.difficultyPreset.difficultyMultiplier
        );

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
            this.entityBudget = Number.isFinite(stage.entityBudget)
                ? stage.entityBudget
                : Config.COLLISION_SYSTEM.MAX_ENTITIES;
            this.stageSpawnRates = stage.spawnRates || null;
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

    getSpawnSettings() {
        const spawnRates = this.stageSpawnRates || {};

        const obstacleMultiplier = Number.isFinite(spawnRates.obstacleIntervalMultiplier)
            ? spawnRates.obstacleIntervalMultiplier
            : 1.0;
        const platformMultiplier = Number.isFinite(spawnRates.platformIntervalMultiplier)
            ? spawnRates.platformIntervalMultiplier
            : 1.5;
        const itemMultiplier = Number.isFinite(spawnRates.itemIntervalMultiplier)
            ? spawnRates.itemIntervalMultiplier
            : 1.0;
        const cloudMultiplier = Number.isFinite(spawnRates.cloudIntervalMultiplier)
            ? spawnRates.cloudIntervalMultiplier
            : 1.0;

        return {
            obstacleInterval: this.spawnInterval * obstacleMultiplier,
            platformInterval: this.spawnInterval * platformMultiplier,
            itemInterval: Config.ITEM_SPAWN_INTERVAL * itemMultiplier,
            cloudInterval: Config.CLOUD_SPAWN_INTERVAL * cloudMultiplier,
            patternProbability: Number.isFinite(spawnRates.patternProbability)
                ? spawnRates.patternProbability
                : Config.PATTERN_PROBABILITY,
            patternCooldownFallback: Number.isFinite(spawnRates.patternCooldownFallback)
                ? spawnRates.patternCooldownFallback
                : Config.PATTERN_COOLDOWN_FALLBACK,
            entityBudget: this.entityBudget
        };
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
        const settings = Storage.load('game_settings', {});
        this.difficultyPresetName = this._resolveDifficultyName(settings?.difficulty);
        this.difficultyPreset = Config.DIFFICULTY_PRESETS[this.difficultyPresetName] || Config.DIFFICULTY_PRESETS.normal;
        this.gameSpeed = Config.INITIAL_GAME_SPEED * this.difficultyPreset.speedMultiplier;
        this.spawnInterval = Config.SPAWN_INTERVAL_START * this.difficultyPreset.spawnIntervalMultiplier;

        // Clear any in-progress ramp so a new run doesn't inherit the previous one's easing
        this.rampFrom = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampTo = { speed: this.gameSpeed, spawnInterval: this.spawnInterval };
        this.rampElapsed = 0;
        this.rampDuration = 0;

        // Reload user config in case they changed it in the lab
        this.userCustomization = this._loadActiveLevelConfig();
        this.updateStage();
    }
}

import { LevelSystem } from './LevelSystem.js';
import { Config } from '../Config.js';

// LevelSystem.updateStage() reads Config.STAGES directly, which is normally populated by
// Config.loadExternalConfig() at app startup. Tests construct LevelSystem in isolation, so
// seed it from the same FALLBACK data the real loader falls back to on a failed fetch.
Config.STAGES = Config.FALLBACK.STAGES;

describe('LevelSystem difficulty ramp', () => {
    let system;

    beforeEach(() => {
        system = new LevelSystem();
    });

    describe('_targetSpeedFor() / _targetSpawnIntervalFor()', () => {
        test('increases speed per level and decreases spawn interval per level', () => {
            const { SPEED_INCREMENT_PER_LEVEL, SPAWN_INTERVAL_DECREMENT } = Config.LEVEL_PROGRESSION;

            expect(system._targetSpeedFor(1)).toBe(Config.INITIAL_GAME_SPEED);
            expect(system._targetSpeedFor(3)).toBe(Config.INITIAL_GAME_SPEED + 2 * SPEED_INCREMENT_PER_LEVEL);

            expect(system._targetSpawnIntervalFor(1)).toBe(Config.SPAWN_INTERVAL_START);
            expect(system._targetSpawnIntervalFor(3)).toBeCloseTo(
                Config.SPAWN_INTERVAL_START - 2 * SPAWN_INTERVAL_DECREMENT
            );
        });

        test('caps speed at MAX_GAME_SPEED and floors spawn interval at SPAWN_INTERVAL_MIN', () => {
            expect(system._targetSpeedFor(1000)).toBe(Config.MAX_GAME_SPEED);
            expect(system._targetSpawnIntervalFor(1000)).toBe(Config.SPAWN_INTERVAL_MIN);
        });
    });

    describe('levelUp()', () => {
        test('does not snap gameSpeed/spawnInterval immediately - arms a ramp instead', () => {
            const speedBefore = system.gameSpeed;
            const intervalBefore = system.spawnInterval;

            system.levelUp(2);

            expect(system.gameSpeed).toBe(speedBefore);
            expect(system.spawnInterval).toBe(intervalBefore);
            expect(system.rampDuration).toBeGreaterThan(0);
            expect(system.rampTo.speed).toBe(system._targetSpeedFor(2));
            expect(system.rampTo.spawnInterval).toBeCloseTo(system._targetSpawnIntervalFor(2));
        });
    });

    describe('_updateRamp()', () => {
        test('eases gameSpeed toward the target over the configured duration', () => {
            system.levelUp(2);
            const target = system.rampTo.speed;
            const start = system.rampFrom.speed;
            const durationSeconds = system.rampDuration;

            system._updateRamp(durationSeconds / 2);
            const midway = system.gameSpeed;

            // Halfway through the ramp, speed should be strictly between start and target
            expect(midway).toBeGreaterThan(Math.min(start, target));
            expect(midway).toBeLessThan(Math.max(start, target));

            system._updateRamp(durationSeconds / 2);
            expect(system.gameSpeed).toBeCloseTo(target);
        });

        test('completes and stops mutating gameSpeed once the ramp is done', () => {
            system.levelUp(2);
            system._updateRamp(system.rampDuration);
            expect(system.rampDuration).toBe(0);

            const settledSpeed = system.gameSpeed;
            system._updateRamp(5); // large dt after completion should be a no-op
            expect(system.gameSpeed).toBe(settledSpeed);
        });

        test('is a no-op when no ramp is active', () => {
            const speedBefore = system.gameSpeed;
            system._updateRamp(1);
            expect(system.gameSpeed).toBe(speedBefore);
        });
    });

    describe('reset()', () => {
        test('clears an in-progress ramp', () => {
            system.levelUp(2);
            expect(system.rampDuration).toBeGreaterThan(0);

            system.reset();

            expect(system.rampDuration).toBe(0);
            expect(system.gameSpeed).toBe(Config.INITIAL_GAME_SPEED);
            expect(system.spawnInterval).toBe(Config.SPAWN_INTERVAL_START);
        });
    });
});

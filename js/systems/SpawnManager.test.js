import { jest } from '@jest/globals';
import { SpawnManager } from './SpawnManager.js';
import { Config } from '../Config.js';
import { entityFactory } from '../factories/EntityFactory.js';
import { engineRegistry } from '../core/Registry.js';
import { entityPool } from '../core/EntityPool.js';

describe('SpawnManager', () => {
    let spawnManager;
    let mockViewport;
    let mockLevel;
    let mockPlayer;
    let mockParticles;

    beforeEach(() => {
        engineRegistry.clear();
        entityPool.reset();
        
        spawnManager = new SpawnManager();
        
        mockViewport = {
            logicalWidth: 800,
            logicalHeight: 600
        };

        mockLevel = {
            level: 1,
            distance: 0,
            gameSpeed: 300,
            spawnInterval: 2.0,
            currentStage: {
                name: 'Morning Meadow',
                hazards: [
                    { id: 'obstacle', weight: 10 }
                ],
                eligiblePatterns: ['staircase']
            },
            getSpawnSettings: () => ({
                obstacleInterval: 2.0,
                platformInterval: 3.0,
                itemInterval: 8.0,
                cloudInterval: 2.5,
                patternProbability: 0.5,
                patternCooldownFallback: 1000,
                entityBudget: 150
            })
        };

        mockPlayer = {
            x: 80,
            y: 500,
            width: 50,
            height: 50,
            appearance: {
                trail: {
                    colors: ['#fff']
                }
            }
        };

        mockParticles = {
            play: jest.fn()
        };
    });

    test('should initialize with decomposed spawner subsystems', () => {
        expect(spawnManager.spawners.has('hazard')).toBe(true);
        expect(spawnManager.spawners.has('platform')).toBe(true);
        expect(spawnManager.spawners.has('cloud')).toBe(true);
        expect(spawnManager.spawners.has('item')).toBe(true);
    });

    test('update() ticks all spawners and increments sessionTime', () => {
        const hazardSpawner = spawnManager.spawners.get('hazard');
        const platformSpawner = spawnManager.spawners.get('platform');
        const cloudSpawner = spawnManager.spawners.get('cloud');
        const itemSpawner = spawnManager.spawners.get('item');

        const spyHazard = jest.spyOn(hazardSpawner, 'update');
        const spyPlatform = jest.spyOn(platformSpawner, 'update');
        const spyCloud = jest.spyOn(cloudSpawner, 'update');
        const spyItem = jest.spyOn(itemSpawner, 'update');

        spawnManager.update(0.1, mockViewport, mockLevel, mockPlayer, mockParticles, false);

        expect(spawnManager.sessionTime).toBeCloseTo(0.1);
        expect(spyHazard).toHaveBeenCalled();
        expect(spyPlatform).toHaveBeenCalled();
        expect(spyCloud).toHaveBeenCalled();
        expect(spyItem).toHaveBeenCalled();
    });

    test('reset() resets timers on all spawners', () => {
        const hazardSpawner = spawnManager.spawners.get('hazard');
        hazardSpawner.timer = 15;
        spawnManager.particleTimer = 5;

        spawnManager.reset();

        expect(spawnManager.particleTimer).toBe(0);
        expect(hazardSpawner.timer).toBe(0);
    });
});

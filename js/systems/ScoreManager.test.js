'use strict';

import { ScoreManager } from './ScoreManager.js';
import { Storage } from './Storage.js';
import { eventManager } from './EventManager.js';

/**
 * ScoreManager Test Suite
 * 
 * Tests score tracking, persistence, and event emissions
 */

// Mock Storage
const originalLoad = Storage.load;
const originalSave = Storage.save;
let storageData = {};

function mockStorage() {
    Storage.load = (key, defaultValue) => {
        return storageData[key] !== undefined ? storageData[key] : defaultValue;
    };
    Storage.save = (key, value) => {
        storageData[key] = value;
    };
}

function restoreStorage() {
    Storage.load = originalLoad;
    Storage.save = originalSave;
    storageData = {};
}

// Event capture helper
let capturedEvents = {};
function captureEvents() {
    const originalEmit = eventManager.emit;
    eventManager.emit = (eventName, payload) => {
        if (!capturedEvents[eventName]) {
            capturedEvents[eventName] = [];
        }
        capturedEvents[eventName].push(payload);
        originalEmit.call(eventManager, eventName, payload);
    };
}

function restoreEvents() {
    capturedEvents = {};
}

// Test Suite
describe('ScoreManager', () => {
    beforeEach(() => {
        mockStorage();
        captureEvents();
    });

    afterEach(() => {
        restoreStorage();
        restoreEvents();
    });

    describe('Constructor', () => {
        test('initializes with score 0', () => {
            const manager = new ScoreManager();
            expect(manager.getScore()).toBe(0);
        });

        test('loads high score from Storage', () => {
            storageData['highScore'] = 1234;
            const manager = new ScoreManager();
            expect(manager.getHighScore()).toBe(1234);
        });

        test('uses default 0 when no high score in Storage', () => {
            const manager = new ScoreManager();
            expect(manager.getHighScore()).toBe(0);
        });
    });

    describe('addPoints()', () => {
        test('increments score by specified amount', () => {
            const manager = new ScoreManager();
            manager.addPoints(5);
            expect(manager.getScore()).toBe(5);
            manager.addPoints(3);
            expect(manager.getScore()).toBe(8);
        });

        test('emits SCORE_CHANGED event with correct payload', () => {
            const manager = new ScoreManager();
            manager.addPoints(10);
            
            expect(capturedEvents['SCORE_CHANGED']).toBeDefined();
            expect(capturedEvents['SCORE_CHANGED'].length).toBe(1);
            expect(capturedEvents['SCORE_CHANGED'][0]).toEqual({
                score: 10,
                delta: 10
            });
        });

        test('handles multiple increments correctly', () => {
            const manager = new ScoreManager();
            manager.addPoints(1);
            manager.addPoints(1);
            manager.addPoints(1);
            
            expect(manager.getScore()).toBe(3);
            expect(capturedEvents['SCORE_CHANGED'].length).toBe(3);
        });

        test('ignores zero points', () => {
            const manager = new ScoreManager();
            manager.addPoints(0);
            
            expect(manager.getScore()).toBe(0);
            expect(capturedEvents['SCORE_CHANGED']).toBeUndefined();
        });

        test('ignores negative points', () => {
            const manager = new ScoreManager();
            manager.addPoints(5);
            manager.addPoints(-3);
            
            expect(manager.getScore()).toBe(5);
            expect(capturedEvents['SCORE_CHANGED'].length).toBe(1);
        });

        test('ignores null/undefined points', () => {
            const manager = new ScoreManager();
            manager.addPoints(null);
            manager.addPoints(undefined);
            
            expect(manager.getScore()).toBe(0);
            expect(capturedEvents['SCORE_CHANGED']).toBeUndefined();
        });
    });

    describe('reset()', () => {
        test('sets score to 0', () => {
            const manager = new ScoreManager();
            manager.addPoints(100);
            manager.reset();
            
            expect(manager.getScore()).toBe(0);
        });

        test('emits SCORE_CHANGED event', () => {
            const manager = new ScoreManager();
            manager.addPoints(50);
            capturedEvents = {}; // Clear previous events
            
            manager.reset();
            
            expect(capturedEvents['SCORE_CHANGED']).toBeDefined();
            expect(capturedEvents['SCORE_CHANGED'][0]).toEqual({
                score: 0,
                delta: 0
            });
        });

        test('does not affect high score', () => {
            storageData['highScore'] = 500;
            const manager = new ScoreManager();
            manager.reset();
            
            expect(manager.getHighScore()).toBe(500);
        });
    });

    describe('finalize()', () => {
        test('returns correct data structure', () => {
            const manager = new ScoreManager();
            manager.addPoints(100);
            
            const result = manager.finalize();
            
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('highScore');
            expect(result).toHaveProperty('isHighScore');
        });

        test('detects new high score', () => {
            const manager = new ScoreManager();
            manager.addPoints(100);
            
            const result = manager.finalize();
            
            expect(result.score).toBe(100);
            expect(result.highScore).toBe(100);
            expect(result.isHighScore).toBe(true);
        });

        test('saves new high score to Storage', () => {
            const manager = new ScoreManager();
            manager.addPoints(250);
            manager.finalize();
            
            expect(storageData['highScore']).toBe(250);
        });

        test('emits HIGH_SCORE_CHANGED on new record', () => {
            const manager = new ScoreManager();
            manager.addPoints(150);
            manager.finalize();
            
            expect(capturedEvents['HIGH_SCORE_CHANGED']).toBeDefined();
            expect(capturedEvents['HIGH_SCORE_CHANGED'][0]).toEqual({
                highScore: 150,
                previousHighScore: 0
            });
        });

        test('does not save when score below high score', () => {
            storageData['highScore'] = 1000;
            const manager = new ScoreManager();
            manager.addPoints(500);
            
            const result = manager.finalize();
            
            expect(result.isHighScore).toBe(false);
            expect(storageData['highScore']).toBe(1000);
        });

        test('does not emit HIGH_SCORE_CHANGED when not beaten', () => {
            storageData['highScore'] = 1000;
            const manager = new ScoreManager();
            manager.addPoints(500);
            manager.finalize();
            
            expect(capturedEvents['HIGH_SCORE_CHANGED']).toBeUndefined();
        });

        test('handles equal score (not a new high score)', () => {
            storageData['highScore'] = 100;
            const manager = new ScoreManager();
            manager.addPoints(100);
            
            const result = manager.finalize();
            
            expect(result.isHighScore).toBe(false);
        });

        test('updates high score property after finalize', () => {
            const manager = new ScoreManager();
            manager.addPoints(300);
            manager.finalize();
            
            expect(manager.getHighScore()).toBe(300);
        });
    });

    describe('getScore()', () => {
        test('returns current score', () => {
            const manager = new ScoreManager();
            expect(manager.getScore()).toBe(0);
            
            manager.addPoints(42);
            expect(manager.getScore()).toBe(42);
        });
    });

    describe('getHighScore()', () => {
        test('returns high score', () => {
            storageData['highScore'] = 999;
            const manager = new ScoreManager();
            expect(manager.getHighScore()).toBe(999);
        });

        test('returns updated high score after finalize', () => {
            const manager = new ScoreManager();
            manager.addPoints(555);
            manager.finalize();
            
            expect(manager.getHighScore()).toBe(555);
        });
    });

    describe('Integration Scenarios', () => {
        test('full game session: start → score → game over', () => {
            const manager = new ScoreManager();
            
            // Game starts
            expect(manager.getScore()).toBe(0);
            
            // Player scores points
            manager.addPoints(1);
            manager.addPoints(1);
            manager.addPoints(1);
            expect(manager.getScore()).toBe(3);
            
            // Game over
            const result = manager.finalize();
            expect(result.score).toBe(3);
            expect(result.isHighScore).toBe(true);
        });

        test('multiple game sessions with high score persistence', () => {
            // First game
            const manager1 = new ScoreManager();
            manager1.addPoints(100);
            manager1.finalize();
            
            // Second game (simulating new instance)
            const manager2 = new ScoreManager();
            expect(manager2.getHighScore()).toBe(100);
            manager2.addPoints(50);
            const result2 = manager2.finalize();
            expect(result2.isHighScore).toBe(false);
            
            // Third game with new high score
            const manager3 = new ScoreManager();
            manager3.addPoints(200);
            const result3 = manager3.finalize();
            expect(result3.isHighScore).toBe(true);
            expect(storageData['highScore']).toBe(200);
        });

        test('reset between games preserves high score', () => {
            const manager = new ScoreManager();
            manager.addPoints(75);
            manager.finalize();
            
            manager.reset();
            expect(manager.getScore()).toBe(0);
            expect(manager.getHighScore()).toBe(75);
        });
    });
});

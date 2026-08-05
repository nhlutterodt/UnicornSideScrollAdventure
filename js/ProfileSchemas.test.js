'use strict';

import {
    CHARACTER_DEFAULTS,
    CHARACTER_SCHEMA_VERSION,
    LEVEL_DEFAULTS,
    LEVEL_SCHEMA_VERSION,
    validateCharacterData,
    validateLevelData,
    createProfile,
    unwrapProfileData,
    migrateCharacterProfile
} from './ProfileSchemas.js';

// ============================================================
// Character Profile Schema Tests
// ============================================================

describe('Character Schema Defaults', () => {
    test('CHARACTER_DEFAULTS has all required fields', () => {
        expect(CHARACTER_DEFAULTS).toHaveProperty('body');
        expect(CHARACTER_DEFAULTS).toHaveProperty('mane');
        expect(CHARACTER_DEFAULTS).toHaveProperty('accessory');
        expect(CHARACTER_DEFAULTS).toHaveProperty('trail');
    });

    test('CHARACTER_DEFAULTS body is pink', () => {
        expect(CHARACTER_DEFAULTS.body).toBe('pink');
    });

    test('CHARACTER_DEFAULTS mane is gold', () => {
        expect(CHARACTER_DEFAULTS.mane).toBe('gold');
    });

    test('CHARACTER_DEFAULTS accessory is none', () => {
        expect(CHARACTER_DEFAULTS.accessory).toBe('none');
    });

    test('CHARACTER_DEFAULTS trail is rainbow', () => {
        expect(CHARACTER_DEFAULTS.trail).toBe('rainbow');
    });
});

describe('validateCharacterData', () => {
    test('accepts valid outfit data', () => {
        const result = validateCharacterData({
            body: 'white',
            mane: 'purple',
            accessory: 'crown',
            trail: 'glitter'
        });
        expect(result.valid).toBe(true);
        expect(result.data.body).toBe('white');
        expect(result.data.mane).toBe('purple');
        expect(result.data.accessory).toBe('crown');
        expect(result.data.trail).toBe('glitter');
        expect(result.errors).toHaveLength(0);
    });

    test('rejects null and returns defaults', () => {
        const result = validateCharacterData(null);
        expect(result.valid).toBe(false);
        expect(result.data).toEqual(CHARACTER_DEFAULTS);
        expect(result.errors).toContain('Invalid data: expected object');
    });

    test('rejects undefined and returns defaults', () => {
        const result = validateCharacterData(undefined);
        expect(result.valid).toBe(false);
        expect(result.data).toEqual(CHARACTER_DEFAULTS);
    });

    test('rejects array and returns defaults', () => {
        const result = validateCharacterData([]);
        expect(result.valid).toBe(false);
        expect(result.data).toEqual(CHARACTER_DEFAULTS);
    });

    test('fills missing fields with defaults', () => {
        const result = validateCharacterData({ body: 'blue' });
        expect(result.valid).toBe(false);
        expect(result.data.body).toBe('blue');
        expect(result.data.mane).toBe('gold'); // default
        expect(result.data.accessory).toBe('none'); // default
        expect(result.data.trail).toBe('rainbow'); // default
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('replaces invalid enum values with defaults', () => {
        const result = validateCharacterData({
            body: 'invisible',
            mane: 'gold',
            accessory: 'none',
            trail: 'rainbow'
        });
        expect(result.valid).toBe(false);
        expect(result.data.body).toBe('pink'); // default
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('replaces wrong type values with defaults', () => {
        const result = validateCharacterData({
            body: 42,
            mane: 'gold',
            accessory: 'none',
            trail: 'rainbow'
        });
        expect(result.valid).toBe(false);
        expect(result.data.body).toBe('pink'); // default
    });

    test('handles empty object', () => {
        const result = validateCharacterData({});
        expect(result.valid).toBe(false);
        expect(result.data).toEqual(CHARACTER_DEFAULTS);
    });

    test('strips unknown fields', () => {
        const result = validateCharacterData({
            body: 'pink',
            mane: 'gold',
            accessory: 'none',
            trail: 'rainbow',
            unknownField: 'should be ignored'
        });
        expect(result.valid).toBe(true);
        expect(result.data).not.toHaveProperty('unknownField');
    });
});

// ============================================================
// Level Profile Schema Tests
// ============================================================

describe('Level Schema Defaults', () => {
    test('LEVEL_DEFAULTS has all required fields', () => {
        expect(LEVEL_DEFAULTS).toHaveProperty('bg');
        expect(LEVEL_DEFAULTS).toHaveProperty('terrain');
        expect(LEVEL_DEFAULTS).toHaveProperty('obstacle');
        expect(LEVEL_DEFAULTS).toHaveProperty('collectible');
        expect(LEVEL_DEFAULTS).toHaveProperty('surface');
        expect(LEVEL_DEFAULTS).toHaveProperty('effect');
        expect(LEVEL_DEFAULTS).toHaveProperty('flora');
        expect(LEVEL_DEFAULTS).toHaveProperty('sky');
        expect(LEVEL_DEFAULTS).toHaveProperty('pace');
    });

    test('LEVEL_DEFAULTS bg is day', () => {
        expect(LEVEL_DEFAULTS.bg).toBe('day');
    });

    test('LEVEL_DEFAULTS pace is normal', () => {
        expect(LEVEL_DEFAULTS.pace).toBe('normal');
    });
});

describe('validateLevelData', () => {
    test('accepts valid level data', () => {
        const result = validateLevelData({
            bg: 'night',
            terrain: 'stone',
            obstacle: 'crystal',
            collectible: 'gem',
            surface: 'bouncy',
            effect: 'sparkles',
            flora: 'flowers',
            sky: 'stars',
            pace: 'turbo'
        });
        expect(result.valid).toBe(true);
        expect(result.data.bg).toBe('night');
        expect(result.data.pace).toBe('turbo');
        expect(result.errors).toHaveLength(0);
    });

    test('rejects null and returns defaults', () => {
        const result = validateLevelData(null);
        expect(result.valid).toBe(false);
        expect(result.data).toEqual(LEVEL_DEFAULTS);
    });

    test('replaces invalid enum values with defaults', () => {
        const result = validateLevelData({
            bg: 'invalid_sky',
            terrain: 'grass',
            obstacle: 'rock',
            collectible: 'star',
            surface: 'normal',
            effect: 'none',
            flora: 'none',
            sky: 'clouds',
            pace: 'normal'
        });
        expect(result.valid).toBe(false);
        expect(result.data.bg).toBe('day'); // default
    });

    test('fills missing fields with defaults', () => {
        const result = validateLevelData({ bg: 'sunset' });
        expect(result.valid).toBe(false);
        expect(result.data.bg).toBe('sunset');
        expect(result.data.terrain).toBe('grass'); // default
        expect(result.data.pace).toBe('normal'); // default
    });
});

// ============================================================
// Profile Wrapper Tests
// ============================================================

describe('createProfile', () => {
    test('creates a versioned profile with metadata', () => {
        const profile = createProfile('my-profile', 'My Profile', CHARACTER_DEFAULTS, CHARACTER_SCHEMA_VERSION);
        expect(profile.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        expect(profile.id).toBe('my-profile');
        expect(profile.name).toBe('My Profile');
        expect(profile.updatedAt).toBeDefined();
        expect(profile.data).toEqual(CHARACTER_DEFAULTS);
    });

    test('clones data to prevent mutation', () => {
        const data = { body: 'blue', mane: 'cyan', accessory: 'glasses', trail: 'aura' };
        const profile = createProfile('test', 'Test', data, CHARACTER_SCHEMA_VERSION);
        data.body = 'pink'; // Mutate original
        expect(profile.data.body).toBe('blue'); // Should not be affected
    });

    test('creates profile with level data', () => {
        const profile = createProfile('level-1', 'My Level', LEVEL_DEFAULTS, LEVEL_SCHEMA_VERSION);
        expect(profile.schemaVersion).toBe(LEVEL_SCHEMA_VERSION);
        expect(profile.id).toBe('level-1');
        expect(profile.data).toEqual(LEVEL_DEFAULTS);
    });
});

describe('unwrapProfileData', () => {
    test('unwraps valid profile data', () => {
        const profile = createProfile('test', 'Test', CHARACTER_DEFAULTS, CHARACTER_SCHEMA_VERSION);
        const data = unwrapProfileData(profile, validateCharacterData, CHARACTER_DEFAULTS);
        expect(data).toEqual(CHARACTER_DEFAULTS);
    });

    test('returns defaults for null profile', () => {
        const data = unwrapProfileData(null, validateCharacterData, CHARACTER_DEFAULTS);
        expect(data).toEqual(CHARACTER_DEFAULTS);
    });

    test('returns defaults for undefined profile', () => {
        const data = unwrapProfileData(undefined, validateCharacterData, CHARACTER_DEFAULTS);
        expect(data).toEqual(CHARACTER_DEFAULTS);
    });

    test('returns defaults for non-object profile', () => {
        const data = unwrapProfileData('string', validateCharacterData, CHARACTER_DEFAULTS);
        expect(data).toEqual(CHARACTER_DEFAULTS);
    });

    test('sanitizes invalid data in profile', () => {
        const profile = createProfile('test', 'Test', { body: 'invalid' }, CHARACTER_SCHEMA_VERSION);
        const data = unwrapProfileData(profile, validateCharacterData, CHARACTER_DEFAULTS);
        expect(data.body).toBe('pink'); // default
    });
});

describe('migrateCharacterProfile', () => {
    test('migrates old-format outfit to versioned profile', () => {
        const oldOutfit = { body: 'blue', mane: 'cyan', accessory: 'glasses', trail: 'aura' };
        const profile = migrateCharacterProfile('default', oldOutfit);
        expect(profile.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        expect(profile.id).toBe('default');
        expect(profile.data.body).toBe('blue');
        expect(profile.data.mane).toBe('cyan');
    });

    test('migrates partial outfit with defaults for missing fields', () => {
        const oldOutfit = { body: 'white' };
        const profile = migrateCharacterProfile('default', oldOutfit);
        expect(profile.data.body).toBe('white');
        expect(profile.data.mane).toBe('gold'); // default
        expect(profile.data.accessory).toBe('none'); // default
        expect(profile.data.trail).toBe('rainbow'); // default
    });

    test('migrates invalid outfit with defaults for bad values', () => {
        const oldOutfit = { body: 'invalid_color', mane: 'gold', accessory: 'none', trail: 'rainbow' };
        const profile = migrateCharacterProfile('default', oldOutfit);
        expect(profile.data.body).toBe('pink'); // default
    });
});

// ============================================================
// Schema Version Constants
// ============================================================

describe('Schema Versions', () => {
    test('CHARACTER_SCHEMA_VERSION is 1', () => {
        expect(CHARACTER_SCHEMA_VERSION).toBe(1);
    });

    test('LEVEL_SCHEMA_VERSION is 1', () => {
        expect(LEVEL_SCHEMA_VERSION).toBe(1);
    });
});

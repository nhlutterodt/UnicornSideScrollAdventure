'use strict';

import { logger } from './utils/Logger.js';

/**
 * PROFILE_SCHEMAS.js
 * Canonical schema definitions, defaults, and validation for character and level profiles.
 *
 * Profile format:
 * {
 *     schemaVersion: 1,
 *     id: "profile-id",
 *     name: "My Profile",
 *     updatedAt: "2026-08-05T00:00:00.000Z",
 *     data: { ... validated authoring data ... }
 * }
 *
 * Storage keys:
 * - characterProfiles: { [id]: Profile }
 * - activeCharacterProfile: string (profile id)
 * - levelProfiles: { [id]: Profile }
 * - activeLevelProfile: string (profile id)
 */

// --- Character Profile Schema ---

export const CHARACTER_SCHEMA_VERSION = 1;

export const CHARACTER_DEFAULTS = {
    body: 'pink',
    mane: 'gold',
    accessory: 'none',
    trail: 'rainbow'
};

export const CHARACTER_FIELDS = {
    body: {
        type: 'string',
        allowed: ['white', 'pink', 'blue', 'peach'],
        default: 'pink'
    },
    mane: {
        type: 'string',
        allowed: ['pink', 'gold', 'cyan', 'purple'],
        default: 'gold'
    },
    accessory: {
        type: 'string',
        allowed: ['none', 'crown', 'glasses'],
        default: 'none'
    },
    trail: {
        type: 'string',
        allowed: ['rainbow', 'glitter', 'aura'],
        default: 'rainbow'
    }
};

// --- Level Profile Schema ---

export const LEVEL_SCHEMA_VERSION = 1;

export const LEVEL_DEFAULTS = {
    bg: 'day',
    surface: 'normal',
    flora: 'none',
    sky: 'clouds'
};

export const LEVEL_FIELDS = {
    bg: { type: 'string', allowed: ['day', 'night', 'sunset'], default: 'day' },
    surface: { type: 'string', allowed: ['normal', 'slippery', 'bouncy'], default: 'normal' },
    flora: { type: 'string', allowed: ['none', 'flowers', 'mushrooms'], default: 'none' },
    sky: { type: 'string', allowed: ['clouds', 'stars', 'dragons'], default: 'clouds' }
};

// --- Validation ---

/**
 * Validate a character outfit data object.
 * Returns { valid: boolean, data: object (sanitized), errors: string[] }
 */
export function validateCharacterData(data) {
    const errors = [];
    const sanitized = {};

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { valid: false, data: { ...CHARACTER_DEFAULTS }, errors: ['Invalid data: expected object'] };
    }

    for (const [field, schema] of Object.entries(CHARACTER_FIELDS)) {
        const value = data[field];

        if (value === undefined || value === null) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" missing, using default: "${schema.default}"`);
        } else if (typeof value !== schema.type) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" wrong type (expected ${schema.type}), using default: "${schema.default}"`);
        } else if (schema.allowed && !schema.allowed.includes(value)) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" invalid value "${value}", using default: "${schema.default}"`);
        } else {
            sanitized[field] = value;
        }
    }

    return { valid: errors.length === 0, data: sanitized, errors };
}

/**
 * Validate a level config data object.
 * Returns { valid: boolean, data: object (sanitized), errors: string[] }
 */
export function validateLevelData(data) {
    const errors = [];
    const sanitized = {};

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { valid: false, data: { ...LEVEL_DEFAULTS }, errors: ['Invalid data: expected object'] };
    }

    for (const [field, schema] of Object.entries(LEVEL_FIELDS)) {
        const value = data[field];

        if (value === undefined || value === null) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" missing, using default: "${schema.default}"`);
        } else if (typeof value !== schema.type) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" wrong type (expected ${schema.type}), using default: "${schema.default}"`);
        } else if (schema.allowed && !schema.allowed.includes(value)) {
            sanitized[field] = schema.default;
            errors.push(`Field "${field}" invalid value "${value}", using default: "${schema.default}"`);
        } else {
            sanitized[field] = value;
        }
    }

    return { valid: errors.length === 0, data: sanitized, errors };
}

// --- Profile Wrapper ---

/**
 * Wrap raw data into a versioned profile object.
 * @param {string} id - Profile identifier
 * @param {string} name - Display name
 * @param {object} data - Validated profile data
 * @param {number} schemaVersion - Schema version constant
 * @returns {object} Versioned profile
 */
export function createProfile(id, name, data, schemaVersion) {
    return {
        schemaVersion,
        id,
        name,
        updatedAt: new Date().toISOString(),
        data: { ...data }
    };
}

/**
 * Unwrap and validate profile data from a stored profile object.
 * Falls back to defaults if the profile is missing or invalid.
 * @param {object|null} profile - Stored profile object
 * @param {function} validateFn - Validation function (validateCharacterData or validateLevelData)
 * @param {object} defaults - Default data object
 * @returns {object} Validated data
 */
export function unwrapProfileData(profile, validateFn, defaults) {
    if (!profile || typeof profile !== 'object') {
        logger.warn('ProfileSchemas', 'Invalid profile, using defaults');
        return { ...defaults };
    }

    const rawData = profile.data;
    const result = validateFn(rawData);

    if (!result.valid && result.errors.length > 0) {
        logger.warn('ProfileSchemas', `Profile validation had issues: ${result.errors.join('; ')}`);
    }

    return result.data;
}

/**
 * Migrate a raw outfit object (old format) to a versioned character profile.
 * @param {string} id - Profile id
 * @param {object} rawOutfit - Old-format outfit data
 * @returns {object} Versioned profile
 */
export function migrateCharacterProfile(id, rawOutfit) {
    const result = validateCharacterData(rawOutfit);
    return createProfile(id, id, result.data, CHARACTER_SCHEMA_VERSION);
}

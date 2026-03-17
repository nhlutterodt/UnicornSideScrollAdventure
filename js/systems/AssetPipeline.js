'use strict';

import { Config } from '../Config.js';
import { assetManager } from './AssetManager.js';

/**
 * ASSET_PIPELINE.js
 * Translates customization data into visual properties for the game engine.
 * This serves as the bridge between saved 'state' and rendering 'assets'.
 */
export const AssetPipeline = {
    /**
     * Maps human-readable customization keys to engine-ready values.
     */
    Mappings: {
        body: {
            white: '#ffffff',
            pink: '#fbc2eb',
            blue: '#a1c4fd',
            peach: '#ffecd2'
        },
        mane: {
            pink: '#ff7eb9',
            gold: '#ffd700',
            cyan: '#7afcff',
            purple: '#b19cd9'
        },
        trail: {
            rainbow: {
                colors: ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'],
                density: 5,
                particleType: 'glitter'
            },
            glitter: {
                colors: ['#ffffff', '#fffafa', '#f0f8ff'],
                density: 3,
                particleType: 'glitter'
            },
            aura: {
                colors: ['#ffd700', '#ff8c00'],
                density: 8,
                particleType: 'flame'
            }
        },
        accessory: {
            none: null,
            crown: '👑',
            glasses: '🕶️'
        }
    },

    /**
     * Resolves an outfit object into a detailed visual configuration.
     * @param {Object} outfit 
     * @returns {Object}
     */
    resolveUnicornColors(outfit) {
        return {
            body: this.Mappings.body[outfit.body] || this.Mappings.body.pink,
            mane: this.Mappings.mane[outfit.mane] || this.Mappings.mane.gold,
            accessory: this.Mappings.accessory[outfit.accessory] || null,
            trail: this.Mappings.trail[outfit.trail] || this.Mappings.trail.rainbow
        };
    },

    /**
     * Gets a random outfit configuration.
     * @returns {Object}
     */
    getRandomOutfit() {
        const getRandomKey = (obj) => {
            const keys = Object.keys(obj);
            return keys[Math.floor(Math.random() * keys.length)];
        };

        return {
            body: getRandomKey(this.Mappings.body),
            mane: getRandomKey(this.Mappings.mane),
            accessory: getRandomKey(this.Mappings.accessory),
            trail: getRandomKey(this.Mappings.trail)
        };
    }
};

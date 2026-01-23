import { Config } from '../Config.js';

/**
 * ABILITY_MANAGER.js
 * Centralized logic for applying items and managing temporary buffs.
 * Decouples item logic from the Player entity.
 */
export class AbilityManager {
    /**
     * Applies an item's effects to a target entity.
     * @param {Entity} target - Usually the Player
     * @param {Object} itemData - The raw item data from Config.js
     * @param {Object} context - Game context for triggers (particles, sounds)
     */
    static apply(target, itemData, context = {}) {
        if (!target || !itemData) return;

        const handlers = {
            [Config.ITEM_TYPES.ABILITY]: this._handleAbility,
            [Config.ITEM_TYPES.LIFE]: this._handleLife,
            [Config.ITEM_TYPES.INVINCIBILITY]: this._handleInvincibility,
            [Config.ITEM_TYPES.PHYSICS]: this._handlePhysics
        };

        const handler = handlers[itemData.type];
        if (handler) {
            handler.call(this, target, itemData, context);
        } else {
            console.warn(`[AbilityManager] No handler for item type: ${itemData.type}`);
        }
    }

    static _handleAbility(target, itemData) {
        if (target.addAbility) {
            const ability = Config.ABILITIES.find(a => a.id === itemData.abilityId);
            if (ability) target.addAbility({ ...ability });
        }
    }

    static _handleLife(target, itemData) {
        if (typeof target.lives === 'number') {
            target.lives += (itemData.value || 1);
        }
    }

    static _handleInvincibility(target, itemData) {
        if (typeof target.invincibleTimer === 'number') {
            target.invincibleTimer = Math.max(target.invincibleTimer, itemData.duration || 5);
        }
    }

    static _handlePhysics(target, itemData) {
        if (target.applyPhysicsModifier) {
            target.applyPhysicsModifier(itemData.modifier, itemData.duration || 5);
        }
    }
}

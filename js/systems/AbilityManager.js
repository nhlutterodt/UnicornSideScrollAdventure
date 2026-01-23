import { Config } from '../Config.js';
import { eventManager } from './EventManager.js';
import { logger } from '../utils/Logger.js';

/**
 * ABILITY_MANAGER.js
 * Centralized logic for applying items and managing temporary buffs.
 * Decouples item logic from the Player entity.
 */
export class AbilityManager {
    constructor(game) {
        this.game = game;
        this.target = null;
        
        // Active global/systemic modifiers
        this.globalModifiers = new Set();
        
        this.init();
    }

    init() {
        // Listen for item pickups via event system
        eventManager.on('ITEM_PICKED_UP', ({ player, itemData, context }) => {
            this.apply(player, itemData, context);
        });

        logger.info('AbilityManager', 'System initialized');
    }

    /**
     * Applies an item's effects to a target entity.
     * @param {Entity} target - Usually the Player
     * @param {Object} itemData - The raw item data from Config.js
     * @param {Object} context - Game context for triggers (particles, sounds)
     */
    apply(target, itemData, context = {}) {
        if (!target || !itemData) return;

        this.target = target;

        const handlers = {
            [Config.ITEM_TYPES.ABILITY]: this._handleAbility,
            [Config.ITEM_TYPES.LIFE]: this._handleLife,
            [Config.ITEM_TYPES.INVINCIBILITY]: this._handleInvincibility,
            [Config.ITEM_TYPES.PHYSICS]: this._handlePhysics,
            [Config.ITEM_TYPES.WORLD]: this._handleWorldEffect
        };

        const handler = handlers[itemData.type];
        if (handler) {
            logger.debug('AbilityManager', `Applying ${itemData.type}: ${itemData.id}`);
            handler.call(this, target, itemData, context);
            
            // Emit event so other systems can react (e.g., UI, Sound)
            eventManager.emit('ABILITY_APPLIED', { target, itemData });
        } else {
            logger.warn('AbilityManager', `No handler for item type: ${itemData.type}`);
        }
    }

    update(dt) {
        // Handle global time-based effects or systemic updates here
    }

    setTimeScale(scale, duration = 0) {
        if (!this.game || !this.game.loop) return;
        
        this.game.loop.setTimeScale(scale);
        logger.info('AbilityManager', `Global Time Scale set to ${scale}`);

        if (duration > 0) {
            setTimeout(() => {
                this.game.loop.setTimeScale(1.0);
                logger.info('AbilityManager', 'Global Time Scale reset to 1.0');
            }, duration * 1000);
        }
    }

    _handleAbility(target, itemData) {
        if (target.addAbility) {
            const ability = Config.ABILITIES.find(a => a.id === itemData.abilityId);
            if (ability) target.addAbility({ ...ability });
        }
    }

    _handleLife(target, itemData) {
        if (typeof target.lives === 'number') {
            target.lives += (itemData.value || 1);
        }
    }

    _handleInvincibility(target, itemData) {
        if (typeof target.invincibleTimer === 'number') {
            target.invincibleTimer = Math.max(target.invincibleTimer, itemData.duration || 5);
        }
    }

    _handlePhysics(target, itemData) {
        if (target.applyPhysicsModifier) {
            target.applyPhysicsModifier(itemData.modifier, itemData.duration || 5);
        }
    }

    _handleWorldEffect(target, itemData) {
        if (itemData.modifier.timeScale) {
            this.setTimeScale(itemData.modifier.timeScale, itemData.duration || 5);
        }
        // Could also handle global gravity shifts here
    }
}

import { Config } from '../Config.js';
import { Item } from '../entities/Item.js';

/**
 * LEVEL_UTILS.js
 * Specialized logic for level generation and item management.
 */
export class LevelUtils {
    /**
     * Spawns a random item based on configuration weights.
     * @param {number} x - logical X position
     * @param {number} y - logical Y position
     * @returns {Item|null}
     */
    static spawnRandomItem(x, y) {
        if (!Config.ITEMS || Config.ITEMS.length === 0) return null;

        // Simple weighted random if added later, for now just random uniform
        const itemData = Config.ITEMS[Math.floor(Math.random() * Config.ITEMS.length)];
        
        // If it's an ability type, we might want to enrich it with ability details
        const enrichedData = { ...itemData };
        if (itemData.type === 'ability') {
            const ability = Config.ABILITIES.find(a => a.id === itemData.abilityId);
            if (ability) {
                enrichedData.icon = ability.icon;
                enrichedData.color = ability.color;
                // We keep abilityId so the player knows which one to add
            }
        }
        
        return new Item(x, y, enrichedData);
    }

    /**
     * Calculates a safe spawning Y coordinate for an item.
     * @param {number} logicalHeight 
     * @param {number} groundHeight 
     * @returns {number}
     */
    static getRandomSpawnY(logicalHeight, groundHeight) {
        // Between 100 and ground - 100
        const min = 100;
        const max = logicalHeight - groundHeight - 150;
        return min + Math.random() * (max - min);
    }
}

/**
 * REGISTRY.js
 * Centralized entity management and identification system.
 * Follows Strict Encapsulation (Enforcement Guide 1).
 */
export class Registry {
    constructor() {
        this.entities = new Map();
        this.counters = new Map();
        
        // Expose to window for debugging purposes as per project tradition
        window.gameEntities = this.entities;
    }

    /**
     * Registers an entity with a unique ID.
     * @param {Object} entity - The object to register.
     * @param {string} type - The entity type (e.g., 'player', 'obstacle').
     */
    register(entity, type) {
        if (!this.counters.has(type)) {
            this.counters.set(type, 0);
        }
        
        const count = this.counters.get(type) + 1;
        this.counters.set(type, count);
        
        const id = `${type}_${count}`;
        entity.id = id;
        this.entities.set(id, entity);
        return id;
    }

    /**
     * Removes an entity from the registry.
     * @param {Object} entity 
     */
    unregister(entity) {
        if (entity && entity.id) {
            this.entities.delete(entity.id);
        }
    }

    /**
     * Clears all entities of a specific type or all entities.
     * @param {string|null} type - If null, clears everything.
     */
    clear(type = null) {
        if (!type) {
            this.entities.clear();
            this.counters.clear();
        } else {
            // Filter and remove by type prefix
            for (let [id, entity] of this.entities) {
                if (id.startsWith(type)) {
                    this.entities.delete(id);
                }
            }
        }
    }

    /**
     * Utility to get entity by ID (Debug helper)
     */
    get(id) {
        return this.entities.get(id);
    }
}

// Export singleton instance
export const engineRegistry = new Registry();

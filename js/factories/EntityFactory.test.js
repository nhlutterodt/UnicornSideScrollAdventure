import { entityFactory } from './EntityFactory.js';
import { entityPool } from '../core/EntityPool.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Platform } from '../entities/Platform.js';
import { engineRegistry } from '../core/Registry.js';

describe('EntityFactory', () => {
    beforeEach(() => {
        engineRegistry.clear();
        entityPool.reset();
    });

    test('should resolve registered entity types and spawn instances', () => {
        const platform = entityFactory.create('platform', 100, 200, 150, 20);
        expect(platform).toBeInstanceOf(Platform);
        expect(platform.x).toBe(100);
        expect(platform.y).toBe(200);
        expect(platform.width).toBe(150);
        expect(platform.height).toBe(20);
    });

    test('should support dynamic registration of new custom entities', () => {
        class CustomTestEntity {
            constructor(x, y, extraParam) {
                this.x = x;
                this.y = y;
                this.extraParam = extraParam;
            }
            revive(x, y, extraParam) {
                this.x = x;
                this.y = y;
                this.extraParam = extraParam;
            }
        }
        CustomTestEntity.poolable = true;

        entityFactory.register('custom_entity', CustomTestEntity);

        const custom = entityFactory.create('custom_entity', 50, 60, 'hello');
        expect(custom).toBeInstanceOf(CustomTestEntity);
        expect(custom.x).toBe(50);
        expect(custom.y).toBe(60);
        expect(custom.extraParam).toBe('hello');

        entityFactory.unregister('custom_entity');
    });

    test('should throw error for unregistered types', () => {
        expect(() => {
            entityFactory.create('unregistered_type_key', 0, 0);
        }).toThrow('EntityFactory: Unregistered entity type: "unregistered_type_key"');
    });
});

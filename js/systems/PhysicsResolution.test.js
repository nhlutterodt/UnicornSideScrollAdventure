import { jest } from '@jest/globals';
import { JumpPad } from '../entities/JumpPad.js';
import { CrumblingPlatform } from '../entities/CrumblingPlatform.js';
import { Player } from '../entities/Player.js';
import { Item } from '../entities/Item.js';
import { CollisionSystem } from './CollisionSystem.js';
import { engineRegistry } from '../core/Registry.js';
import { Config } from '../Config.js';

describe('Decoupled Physics & Collision Resolution', () => {
    let player;
    let particlesMock;
    let context;

    beforeEach(() => {
        engineRegistry.clear();
        player = new Player();
        player.x = 80;
        player.y = 100;
        player.vy = 0;
        player.isGrounded = false;

        particlesMock = {
            play: jest.fn()
        };

        context = {
            config: Config,
            logicalHeight: 600,
            platforms: []
        };
    });

    afterEach(() => {
        engineRegistry.clear();
    });

    describe('JumpPad Resolution', () => {
        test('launches a falling player upward', () => {
            const jumpPad = new JumpPad(80, 150); // Underneath the player
            player.vy = 10; // Falling

            // Register both
            engineRegistry.register(player, 'player');
            engineRegistry.register(jumpPad, 'jump_pad');

            // Force deep bounding box overlap to bypass player padding (10px)
            player.y = jumpPad.y - player.height + 12;

            CollisionSystem.resolve(engineRegistry, particlesMock, context);

            // Player vy should be boosted (negative JUMP_FORCE * boostMultiplier)
            const expectedVy = Config.JUMP_FORCE * jumpPad.boostMultiplier;
            expect(player.vy).toBe(expectedVy);
            expect(player.isGrounded).toBe(false);
            expect(jumpPad.isActivated).toBe(true);
            expect(particlesMock.play).toHaveBeenCalled();
        });

        test('does not launch a rising player (under-platform guard)', () => {
            const jumpPad = new JumpPad(80, 150);
            player.vy = -10; // Rising

            engineRegistry.register(player, 'player');
            engineRegistry.register(jumpPad, 'jump_pad');

            player.y = jumpPad.y - player.height + 12;

            CollisionSystem.resolve(engineRegistry, particlesMock, context);

            expect(player.vy).toBe(-10); // Unchanged
            expect(jumpPad.isActivated).toBe(false);
        });
    });

    describe('CrumblingPlatform Resolution', () => {
        test('activates when player lands on it', () => {
            const crumbling = new CrumblingPlatform(80, 150, 100, 20);
            player.vy = 5;

            engineRegistry.register(player, 'player');
            engineRegistry.register(crumbling, 'platform');

            player.y = crumbling.y - player.height + 12;

            CollisionSystem.resolve(engineRegistry, particlesMock, context);

            expect(crumbling.isCrumbling).toBe(true);
        });

        test('does not activate if player passes from below', () => {
            const crumbling = new CrumblingPlatform(80, 150, 100, 20);
            player.vy = -5; // Rising

            engineRegistry.register(player, 'player');
            engineRegistry.register(crumbling, 'platform');

            player.y = crumbling.y - player.height + 12;

            CollisionSystem.resolve(engineRegistry, particlesMock, context);

            expect(crumbling.isCrumbling).toBe(false);
        });
    });

    describe('Item Platform Ungrounding', () => {
        test('falls when scrolling off platform bounds', () => {
            const item = new Item(150, 100, { id: 'extra_life', type: 'life' });
            const platform = new CrumblingPlatform(100, 130, 100, 20);

            context.platforms = [platform];
            item.isGrounded = true;
            item.y = platform.y - item.height;

            // Move item off platform horizontally
            item.x = 250; // Platform ends at 200 (x:100 + width:100)

            item.update(0.1, context);

            expect(item.isGrounded).toBe(false);
        });

        test('stays grounded when on platform bounds', () => {
            const item = new Item(150, 100, { id: 'extra_life', type: 'life' });
            const platform = new CrumblingPlatform(100, 130, 100, 20);

            context.platforms = [platform];
            item.isGrounded = true;
            item.y = platform.y - item.height;

            // Keep item inside platform horizontal bounds
            item.x = 150;

            item.update(0.1, context);

            expect(item.isGrounded).toBe(true);
        });
    });
});

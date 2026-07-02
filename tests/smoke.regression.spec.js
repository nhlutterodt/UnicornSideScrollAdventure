import { test, expect } from '@playwright/test';

test.describe('hybrid controls regression', () => {
    test('state packs render expected controls across START, PLAYING, GAMEOVER', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));

        await page.goto('/index.html', { waitUntil: 'load' });

        const controlsHost = page.locator('#gameControlsHost');
        await expect(controlsHost).toBeVisible();

        // START pack
        await expect(page.locator('[data-action-id="startGame"]')).toBeVisible();

        // PLAYING pack
        await page.click('[data-action-id="startGame"]');
        await expect(page.locator('#gameContainer')).toHaveAttribute('data-state', 'PLAYING');
        const jumpButton = page.locator('[data-action-id="jump"]');
        await expect(jumpButton).toBeVisible();

        // Ensure jump can execute immediately (player has landed after start).
        await page.waitForFunction(() => window.game?.player?.isGrounded === true);

        const beforeJumpY = await page.evaluate(() => window.game.player.y);
        await jumpButton.click();

        await expect
            .poll(async () => page.evaluate(() => window.game.player.vy), { timeout: 1000 })
            .toBeLessThan(0);

        await expect
            .poll(async () => page.evaluate(() => window.game.player.y), { timeout: 1000 })
            .toBeLessThan(beforeJumpY);

        const useAbilityButton = page.locator('[data-action-id="useAbility"]');
        await expect(useAbilityButton).toBeVisible();
        await expect(useAbilityButton).toBeDisabled();

        // GAMEOVER pack
        await page.evaluate(() => window.game.gameOver());
        await expect(page.locator('#gameContainer')).toHaveAttribute('data-state', 'GAMEOVER');
        await expect(page.locator('[data-action-id="retryGame"]')).toBeVisible();

        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
});

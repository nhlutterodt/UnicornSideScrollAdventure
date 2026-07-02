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
        await expect(page.locator('[data-action-id="jump"]')).toBeVisible();
        await expect(page.locator('[data-action-id="useAbility"]')).toHaveCount(0);

        // GAMEOVER pack
        await page.evaluate(() => window.game.gameOver());
        await expect(page.locator('#gameContainer')).toHaveAttribute('data-state', 'GAMEOVER');
        await expect(page.locator('[data-action-id="retryGame"]')).toBeVisible();

        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
});

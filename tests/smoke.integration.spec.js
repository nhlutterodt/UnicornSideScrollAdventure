import { test, expect } from '@playwright/test';

/**
 * Smoke test closing the "no tests found" CI gap documented in
 * docs/testing_and_ci.md - `npm run test:integration` previously failed
 * outright (exit 1, "No tests found") because no tests/ directory existed.
 * This is deliberately minimal: page loads, canvas actually renders pixels
 * (not just "exists in the DOM"), starting a run works, and nothing throws.
 */
test.describe('game boots and renders', () => {
    test('loads the page with no console or page errors', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));

        await page.goto('/index.html', { waitUntil: 'load' });

        const canvas = page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();

        const box = await canvas.boundingBox();
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);

        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });

    test('canvas actually paints pixels, not just an empty element', async ({ page }) => {
        await page.goto('/index.html', { waitUntil: 'load' });

        // The first paint happens inside GameLoop's requestAnimationFrame loop,
        // which only starts once Game.init() finishes (after the async
        // Config.loadExternalConfig() resolves) - poll rather than assume it's
        // already painted by the time `load` fires.
        const hasPaintedPixels = await page.waitForFunction(() => {
            const canvas = document.querySelector('#gameCanvas');
            const ctx = canvas.getContext('2d');
            const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Background fill means at least one pixel should be non-transparent.
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) return true;
            }
            return false;
        }, { timeout: 5000 });

        expect(await hasPaintedPixels.jsonValue()).toBe(true);
    });

    test('starting a run transitions off the start screen with no errors', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(String(err)));

        await page.goto('/index.html', { waitUntil: 'load' });

        const startScreen = page.locator('#startScreen');
        await expect(startScreen).toBeVisible();

        await page.click('.js-start-btn');

        const gameContainer = page.locator('#gameContainer');
        await expect(gameContainer).toHaveAttribute('data-state', 'PLAYING');
        await expect(startScreen).toBeHidden();

        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
});

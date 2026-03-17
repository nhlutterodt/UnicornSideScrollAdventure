import { Game } from './Game.js';
import { Config } from './Config.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { assetManager } from './systems/AssetManager.js';

/**
 * MAIN.js
 * The entry point for the Unicorn Magic Run adventure.
 */

async function init() {
    // Show a basic loading indicator
    document.body.insertAdjacentHTML('beforeend', '<div id="loadingOverlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: #000; color: white; display: flex; align-items: center; justify-content: center; z-index: 1000; font-family: sans-serif; font-size: 24px;">Loading Game Assets...</div>');

    try {
        // Load external configuration before game initialization
        await Config.loadExternalConfig();
        
        // Initialize asset manager and wait for all assets
        await assetManager.initialize();

        // Remove loading indicator
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.remove();
        
        // Instantiate and start the game
        window.game = new Game();
    } catch (error) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `Failed to load game: ${error.message}. Please refresh the page.`;
            loadingOverlay.style.color = "red";
        }
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        ErrorHandler.handle('main', `Initialization failed: ${error.message}`, true);
        // Show error overlay to user
        document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Failed to load game. Please refresh the page.</div>';
    });
});

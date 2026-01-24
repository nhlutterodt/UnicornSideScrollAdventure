import { Game } from './Game.js';
import { Config } from './Config.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

/**
 * MAIN.js
 * The entry point for the Unicorn Magic Run adventure.
 */

async function init() {
    // Load external configuration before game initialization
    await Config.loadExternalConfig();
    
    // Instantiate and start the game
    window.game = new Game();
}

document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        ErrorHandler.handle('main', `Initialization failed: ${error.message}`, true);
        // Show error overlay to user
        document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center;">Failed to load game. Please refresh the page.</div>';
    });
});

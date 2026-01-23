import { Game } from './Game.js';

/**
 * MAIN.js
 * The entry point for the Unicorn Magic Run adventure.
 */
document.addEventListener('DOMContentLoaded', () => {
    // We instantiate the game here. 
    // This allows us to pass runtime environmental config if needed in the future.
    window.game = new Game();
});

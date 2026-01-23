import { AmbientEffects } from './systems/AmbientEffects.js';
import { Customizer } from './Customizer.js';

/**
 * CUSTOMIZE-MAIN.js
 * The entry point for the Customization Studio.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Ambient Background
    const ambient = new AmbientEffects('ambientBg');
    ambient.init({ starCount: 60, cloudCount: 6 });

    // 2. Initialize Customizer Studio
    window.studio = new Customizer();
});

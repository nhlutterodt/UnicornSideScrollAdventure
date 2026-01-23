import { Dom } from '../utils/Dom.js';

/**
 * AMBIENT_EFFECTS.js
 * Manages background stars and clouds via CSS variables.
 * Decoupled logic from the customization studio.
 */
export class AmbientEffects {
    /**
     * @param {string} containerId - The background element ID.
     */
    constructor(containerId = 'ambientBg') {
        this.container = Dom.get(containerId);
    }

    /**
     * Initializes stars and clouds with data-driven counts.
     * @param {Object} config - { starCount: number, cloudCount: number }
     */
    init(config = { starCount: 50, cloudCount: 5 }) {
        if (!this.container) return;

        this.clear();
        this.spawnStars(config.starCount);
        this.spawnClouds(config.cloudCount);
    }

    spawnStars(count) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            star.style.setProperty('--star-x', (Math.random() * 100) + '%');
            star.style.setProperty('--star-y', (Math.random() * 100) + '%');
            
            const size = (Math.random() * 3 + 1) + 'px';
            star.style.setProperty('--star-size', size);
            star.style.setProperty('--star-delay', (Math.random() * 2) + 's');
            
            this.container.appendChild(star);
        }
    }

    spawnClouds(count) {
        for (let i = 0; i < count; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'cloud-ambient'; // Renamed to avoid collision with game Cloud class
            
            cloud.style.setProperty('--cloud-y', (Math.random() * 60) + '%');
            cloud.style.setProperty('--cloud-width', (Math.random() * 100 + 100) + 'px');
            cloud.style.setProperty('--cloud-height', (Math.random() * 40 + 20) + 'px');
            cloud.style.setProperty('--duration', (Math.random() * 20 + 20) + 's');
            cloud.style.setProperty('--cloud-delay', (Math.random() * 20) + 's');
            
            this.container.appendChild(cloud);
        }
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }
}

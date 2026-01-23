import { Dom } from './utils/Dom.js';
import { Storage } from './systems/Storage.js';
import { AssetPipeline } from './systems/AssetPipeline.js';

/**
 * CUSTOMIZER.js
 * Logic for the Unicorn Customization Studio.
 * Follows encapsulation and data-driven configuration.
 */
export class Customizer {
    constructor() {
        // Selectors
        this.preview = Dom.get('unicornPreview');
        this.bodyOptions = Dom.get('bodyColors');
        this.maneOptions = Dom.get('maneColors');
        this.randomBtn = Dom.get('randomizeBtn');
        this.saveBtn = Dom.get('saveBtn');
        
        this.init();
    }

    init() {
        if (!this.preview) return;

        // Load existing outfit - Default if none exists
        const defaultOutfit = { 
            body: 'pink', 
            mane: 'gold', 
            accessory: 'none', 
            trail: 'rainbow' 
        };
        const savedOutfit = Storage.load('current_outfit', defaultOutfit);
        this.applyOutfit(savedOutfit);

        // Event Listeners
        this.attachListeners('.color-dot', (el) => {
            const container = el.parentElement;
            container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            el.classList.add('active');
            
            const type = el.closest('#bodyColors') ? 'body' : 'mane';
            this.updateState(type, el.dataset.name);
        });

        this.attachListeners('.acc-item', (el) => {
            const container = el.parentElement;
            container.querySelectorAll('.acc-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');

            const accessory = el.dataset.acc;
            const trail = el.dataset.trail;
            
            if (accessory) {
                this.updateState('accessory', accessory);
                const overlay = Dom.get('accessoryOverlay');
                if (overlay) {
                    overlay.classList.add('is-animating');
                    setTimeout(() => overlay.classList.remove('is-animating'), 200);
                }
            }
            if (trail) this.updateState('trail', trail);
        });

        if (this.randomBtn) this.randomBtn.addEventListener('click', () => this.randomize());
        if (this.saveBtn) this.saveBtn.addEventListener('click', (e) => this.save(e));
    }

    attachListeners(selector, callback) {
        Dom.all(selector).forEach(el => {
            el.addEventListener('click', () => callback(el));
        });
    }

    updateState(key, value) {
        if (!this.preview) return;
        this.preview.dataset[key] = value;
    }

    applyOutfit(outfit) {
        Object.entries(outfit).forEach(([key, val]) => {
            this.updateState(key, val);
            
            // Sync UI state
            const selector = `[data-${key}="${val}"], [data-name="${val}"]`;
            const el = document.querySelector(selector);
            if (el && (el.classList.contains('color-dot') || el.classList.contains('acc-item'))) {
                const container = el.parentElement;
                if (container) {
                    container.querySelectorAll('.color-dot, .acc-item').forEach(i => i.classList.remove('active'));
                }
                el.classList.add('active');
            }
        });
    }

    randomize() {
        const outfit = AssetPipeline.getRandomOutfit();
        this.applyOutfit(outfit);

        // Add visual feedback
        if (this.preview) {
            this.preview.classList.add('is-animating');
            setTimeout(() => this.preview.classList.remove('is-animating'), 300);
        }
    }

    save(event) {
        if (!this.preview) return;
        
        // Extract data from the preview's dataset
        const outfit = {
            body: this.preview.dataset.body,
            mane: this.preview.dataset.mane,
            accessory: this.preview.dataset.accessory,
            trail: this.preview.dataset.trail
        };
        
        Storage.save('current_outfit', outfit);

        // Button feedback
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = '✨ Magic Saved! ✨';
        btn.classList.add('is-saved');
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('is-saved');
        }, 2000);
    }
}

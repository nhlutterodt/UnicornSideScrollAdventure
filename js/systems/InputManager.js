/**
 * INPUT_MANAGER.js
 * Unifies Keyboard, Touch, and Mouse events into a clean API.
 * Follows 'JS Enforcement Guide' Rule 3 (cleanup).
 */
export class InputManager {
    /**
     * @param {HTMLElement} target - The element to listen on (usually canvas or window).
     */
    constructor(target = window) {
        this.target = target;
        this.actions = new Set();
        this.listeners = [];
        
        this.init();
    }

    init() {
        // Keyboard listeners
        const keyHandler = (e) => {
            if (e.code === 'Space') this.triggerAction('jump');
            if (e.code === 'KeyE') this.triggerAction('useAbility');
            if (e.code === 'KeyQ') this.triggerAction('cycleLeft');
            if (e.code === 'KeyR') this.triggerAction('cycleRight');
        };
        
        // Touch/Mouse listener
        const interactionHandler = (e) => {
            // Only trigger if it's not a button click (to let UI buttons work independently)
            if (e.target.tagName !== 'BUTTON') {
                if (e.type === 'touchstart') e.preventDefault();
                this.triggerAction('jump');
            }
        };

        this.attach(window, 'keydown', keyHandler);
        this.attach(this.target, 'mousedown', interactionHandler);
        this.attach(this.target, 'touchstart', interactionHandler, { passive: false });
    }

    /**
     * Subscribe to specific actions.
     * @param {string} actionName 
     * @param {Function} callback 
     */
    on(actionName, callback) {
        if (!this.actions[actionName]) this.actions[actionName] = [];
        this.actions[actionName].push(callback);
    }

    triggerAction(name) {
        if (this.actions[name]) {
            this.actions[name].forEach(cb => cb());
        }
    }

    /**
     * Internal: Track listeners for disposal.
     */
    attach(el, type, fn, options = {}) {
        el.addEventListener(type, fn, options);
        this.listeners.push({ el, type, fn });
    }

    /**
     * Mandatory Cleanup (Enforcement Guide 3).
     */
    dispose() {
        this.listeners.forEach(({ el, type, fn }) => {
            el.removeEventListener(type, fn);
        });
        this.listeners = [];
        this.actions = new Set();
    }
}

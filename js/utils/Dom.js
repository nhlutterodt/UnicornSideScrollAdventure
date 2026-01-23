/**
 * DOM.js
 * Safety utilities for DOM manipulation.
 * Enforcement Guide 2: Every DOM query MUST be checked for null.
 */
export const Dom = {
    /**
     * Gets an element or throws/warns if missing.
     * @param {string} id 
     * @param {boolean} silent 
     */
    get(id, silent = false) {
        const el = document.getElementById(id);
        if (!el && !silent) {
            console.warn(`DOM: Element #${id} not found in document.`);
        }
        return el;
    },

    /**
     * Helper for querySelectorAll
     */
    all(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Toggles a class based on a condition cleanly.
     * @param {HTMLElement} el 
     * @param {string} className 
     * @param {boolean} force 
     */
    toggleClass(el, className, force) {
        if (!el) return;
        el.classList.toggle(className, force);
    }
};

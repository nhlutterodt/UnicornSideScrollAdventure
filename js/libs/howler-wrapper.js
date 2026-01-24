/**
 * howler-wrapper.js
 * ESM wrapper for Howler.js UMD library
 * 
 * Howler.js is a UMD library that attaches to window.Howl and window.Howler.
 * This wrapper dynamically loads it and provides ESM exports.
 */

let howlerLoaded = false;
let howlerLoadPromise = null;

/**
 * Dynamically load Howler.js if not already loaded
 * @returns {Promise<void>}
 */
function loadHowler() {
    if (howlerLoaded) {
        return Promise.resolve();
    }
    
    if (howlerLoadPromise) {
        return howlerLoadPromise;
    }
    
    howlerLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/libs/howler.min.js';
        script.onload = () => {
            howlerLoaded = true;
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load Howler.js'));
        };
        document.head.appendChild(script);
    });
    
    return howlerLoadPromise;
}

/**
 * Get Howl constructor (lazy load if needed)
 * @returns {Promise<Function>}
 */
export async function getHowl() {
    await loadHowler();
    return window.Howl;
}

/**
 * Get Howler global object (lazy load if needed)
 * @returns {Promise<Object>}
 */
export async function getHowler() {
    await loadHowler();
    return window.Howler;
}

/**
 * Initialize Howler.js immediately
 * Call this early in app initialization for better UX
 */
export function initHowler() {
    return loadHowler();
}

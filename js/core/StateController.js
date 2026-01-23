/**
 * STATE_CONTROLLER.js
 * Manages UI transitions using the 'data-state' pattern.
 * Supports events and strong focus on data-driven configuration.
 */
export class StateController {
    /**
     * @param {HTMLElement} container - The main container holding states.
     * @param {string} initialState - The starting state name.
     */
    constructor(container, initialState = 'START') {
        if (!container) {
            throw new Error('StateController: Container element is required.');
        }
        this.container = container;
        this.state = initialState;
        this.observers = [];
        
        this.applyState(initialState);
    }

    /**
     * Transitions the container to a new state.
     * @param {string} newState 
     */
    setState(newState) {
        if (this.state === newState) return;
        
        const oldState = this.state;
        this.state = newState;
        this.applyState(newState);
        
        // Notify observers
        this.notify(newState, oldState);
    }

    /**
     * Internal: Applies the data attribute to the DOM.
     */
    applyState(state) {
        this.container.dataset.state = state;
    }

    /**
     * Subscribe to state changes.
     * @param {Function} callback - function(newState, oldState).
     */
    subscribe(callback) {
        this.observers.push(callback);
    }

    notify(newState, oldState) {
        this.observers.forEach(callback => callback(newState, oldState));
    }

    /**
     * Current state getter.
     */
    get current() {
        return this.state;
    }
}

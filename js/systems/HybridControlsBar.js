'use strict';

import { Dom } from '../utils/Dom.js';
import { logger } from '../utils/Logger.js';

/**
 * Resolve a capability profile used by hybrid controls.
 * @param {Window} win
 * @param {Object} rules
 * @returns {{touchPrimary: boolean, keyboardPresent: boolean, compactViewport: boolean}}
 */
export function resolveCapabilityProfile(win = window, rules = {}) {
    const compactViewportPx = rules.compactViewportPx || 900;
    const matchMediaFn = typeof win.matchMedia === 'function' ? win.matchMedia.bind(win) : null;
    const touchPrimary = !!(matchMediaFn && matchMediaFn('(hover: none) and (pointer: coarse)').matches);

    return {
        touchPrimary,
        // Keyboard controls remain available on desktop-first play surfaces.
        keyboardPresent: true,
        compactViewport: (win.innerWidth || 0) <= compactViewportPx
    };
}

/**
 * Resolve renderable controls for a state and capability profile.
 * @param {Object} controlsConfig
 * @param {string} state
 * @param {Object} capabilities
 * @param {{hasAbility?: boolean}} context
 * @returns {Array<Object>}
 */
export function resolveControlActions(controlsConfig, state, capabilities, context = {}) {
    if (!controlsConfig || !controlsConfig.actions || !controlsConfig.packs) return [];

    const pack = controlsConfig.packs[state] || [];
    const hasAbility = !!context.hasAbility;
    const canDispatch = typeof context.canDispatch === 'function'
        ? context.canDispatch
        : () => true;

    return pack
        .map((actionId) => controlsConfig.actions[actionId])
        .filter(Boolean)
        .filter((action) => {
            if (action.requiresAbility && !hasAbility) return false;
            if (action.touchOnly && !capabilities.touchPrimary) return false;
            if (action.keyboardOnly && !capabilities.keyboardPresent) return false;
            if (action.compactOnly && !capabilities.compactViewport) return false;
            if (action.hideOnCompact && capabilities.compactViewport) return false;
            if (action.hideOnTouch && capabilities.touchPrimary) return false;
            if (!canDispatch(action)) return false;
            return true;
        });
}

/**
 * HybridControlsBar renders state-aware controls under the canvas and routes actions
 * through canonical game input paths.
 */
export class HybridControlsBar {
    constructor({
        host,
        inputManager,
        stateController,
        controlsConfig,
        onStart,
        onRetry,
        getHasAbility
    }) {
        this.host = host;
        this.input = inputManager;
        this.state = stateController;
        this.controls = controlsConfig;
        this.onStart = onStart;
        this.onRetry = onRetry;
        this.getHasAbility = typeof getHasAbility === 'function' ? getHasAbility : () => false;

        this._signature = '';
        this._boundClick = this._onClick.bind(this);
        this._boundResize = () => this.sync();

        if (!this.host) {
            logger.warn('HybridControlsBar', 'Controls host not found. Controls bar disabled.');
            return;
        }

        this.host.addEventListener('click', this._boundClick);
        window.addEventListener('resize', this._boundResize);

        this._unsubscribeState = this.state && this.state.subscribe
            ? this.state.subscribe(() => this.sync())
            : null;

        this.sync();
        logger.info('HybridControlsBar', 'Initialized');
    }

    sync() {
        if (!this.host || !this.state) return;

        const capabilities = resolveCapabilityProfile(window, this.controls.rules);
        const context = {
            hasAbility: this.getHasAbility(),
            canDispatch: (action) => this._canDispatch(action)
        };
        const state = this.state.current;
        const actions = resolveControlActions(this.controls, state, capabilities, context);

        const signature = JSON.stringify({
            state,
            touchPrimary: capabilities.touchPrimary,
            compactViewport: capabilities.compactViewport,
            hasAbility: context.hasAbility,
            actions: actions.map((action) => action.id)
        });

        if (signature === this._signature) return;
        this._signature = signature;

        this._render(actions, state);
    }

    _render(actions, state) {
        this.host.innerHTML = '';
        this.host.dataset.state = state;

        actions.forEach((action) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `game-control-btn ${action.variant === 'primary' ? 'game-control-btn-primary' : 'game-control-btn-secondary'}`;
            button.dataset.actionId = action.id;
            button.setAttribute('aria-label', action.ariaLabel || action.label || action.id);

            const icon = document.createElement('span');
            icon.className = 'game-control-icon';
            icon.textContent = action.icon || '';

            const text = document.createElement('span');
            text.className = 'game-control-label';
            text.textContent = action.label || action.id;

            button.appendChild(icon);
            button.appendChild(text);
            this.host.appendChild(button);
        });

        Dom.toggleClass(this.host, 'hidden', actions.length === 0);
    }

    _onClick(event) {
        const target = event.target;
        if (!target) return;

        const button = target.closest('button[data-action-id]');
        if (!button) return;

        const actionId = button.dataset.actionId;
        this._dispatch(actionId);
    }

    _dispatch(actionId) {
        const action = this.controls.actions[actionId];
        if (!action) return;

        if (!this._canDispatch(action)) return;

        if (actionId === 'startGame' && this.onStart) {
            this.onStart();
            return;
        }

        if (actionId === 'retryGame' && this.onRetry) {
            this.onRetry();
            return;
        }

        const inputAction = action.inputAction || actionId;
        if (this.input && this.input.triggerAction) {
            this.input.triggerAction(inputAction);
        }
    }

    _canDispatch(action) {
        if (!action || !action.id) return false;

        if (action.id === 'startGame') {
            return typeof this.onStart === 'function';
        }

        if (action.id === 'retryGame') {
            return typeof this.onRetry === 'function';
        }

        const inputAction = action.inputAction || action.id;
        if (!this.input || typeof this.input.triggerAction !== 'function') return false;

        if (typeof this.input.hasAction === 'function') {
            return this.input.hasAction(inputAction);
        }

        // Backward-compatible fallback when no action introspection API exists.
        return true;
    }

    dispose() {
        if (this.host) {
            this.host.removeEventListener('click', this._boundClick);
            this.host.innerHTML = '';
        }
        window.removeEventListener('resize', this._boundResize);
        if (typeof this._unsubscribeState === 'function') {
            this._unsubscribeState();
        }
    }
}

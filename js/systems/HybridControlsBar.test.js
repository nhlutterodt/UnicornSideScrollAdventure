import { jest } from '@jest/globals';
import { Config } from '../Config.js';
import {
    HybridControlsBar,
    resolveCapabilityProfile,
    resolveControlActions
} from './HybridControlsBar.js';

describe('HybridControls helpers', () => {
    test('resolveCapabilityProfile returns stable shape', () => {
        const fakeWindow = {
            innerWidth: 800,
            matchMedia: () => ({ matches: true })
        };

        const profile = resolveCapabilityProfile(fakeWindow, { compactViewportPx: 900 });

        expect(profile).toEqual({
            touchPrimary: true,
            keyboardPresent: true,
            compactViewport: true
        });
    });

    test('resolveControlActions filters ability actions when no ability is available', () => {
        const capabilities = { touchPrimary: false, keyboardPresent: true, compactViewport: false };

        const actions = resolveControlActions(Config.CONTROLS, 'PLAYING', capabilities, { hasAbility: false });

        expect(actions.map(action => action.id)).toEqual(['jump']);
    });

    test('resolveControlActions includes full PLAYING pack when ability exists', () => {
        const capabilities = { touchPrimary: false, keyboardPresent: true, compactViewport: false };

        const actions = resolveControlActions(Config.CONTROLS, 'PLAYING', capabilities, { hasAbility: true });

        expect(actions.map(action => action.id)).toEqual(['jump', 'cycleLeft', 'useAbility', 'cycleRight']);
    });
});

describe('HybridControlsBar', () => {
    class FakeState {
        constructor() {
            this.current = 'START';
            this._observers = [];
        }

        subscribe(callback) {
            this._observers.push(callback);
            return () => {
                this._observers = this._observers.filter(observer => observer !== callback);
            };
        }

        setState(state) {
            const old = this.current;
            this.current = state;
            this._observers.forEach(callback => callback(state, old));
        }
    }

    beforeEach(() => {
        document.body.innerHTML = '<section id="host"></section>';
    });

    test('dispatches start and input actions through canonical handlers', () => {
        const host = document.getElementById('host');
        const state = new FakeState();

        const inputManager = {
            triggerAction: jest.fn()
        };
        const onStart = jest.fn();

        const controls = new HybridControlsBar({
            host,
            inputManager,
            stateController: state,
            controlsConfig: Config.CONTROLS,
            onStart,
            onRetry: jest.fn(),
            getHasAbility: () => false
        });

        const startButton = host.querySelector('button[data-action-id="startGame"]');
        startButton.click();

        expect(onStart).toHaveBeenCalledTimes(1);
        expect(inputManager.triggerAction).toHaveBeenCalledTimes(0);

        state.setState('PLAYING');
        controls.sync();

        const jumpButton = host.querySelector('button[data-action-id="jump"]');
        jumpButton.click();

        expect(inputManager.triggerAction).toHaveBeenCalledWith('jump');

        controls.dispose();
    });

    test('renders ability controls only when player has ability', () => {
        const host = document.getElementById('host');
        const state = new FakeState();

        let hasAbility = false;

        const controls = new HybridControlsBar({
            host,
            inputManager: { triggerAction: jest.fn() },
            stateController: state,
            controlsConfig: Config.CONTROLS,
            onStart: jest.fn(),
            onRetry: jest.fn(),
            getHasAbility: () => hasAbility
        });

        state.setState('PLAYING');
        controls.sync();

        expect(host.querySelector('button[data-action-id="useAbility"]')).toBeNull();

        hasAbility = true;
        controls.sync();

        expect(host.querySelector('button[data-action-id="useAbility"]')).not.toBeNull();

        controls.dispose();
    });
});

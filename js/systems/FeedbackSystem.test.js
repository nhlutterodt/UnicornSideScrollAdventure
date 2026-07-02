import { FeedbackSystem } from './FeedbackSystem.js';

const PRESETS = {
    medium: { hitStopMs: 60, shakeMagnitude: 4, shakeDurationMs: 150 },
    heavy: { hitStopMs: 100, shakeMagnitude: 8, shakeDurationMs: 250 }
};

function makeSystem(overrides = {}) {
    return new FeedbackSystem({
        intensity: 1.0,
        screenShakeEnabled: true,
        hitStopEnabled: true,
        presets: PRESETS,
        ...overrides
    });
}

describe('FeedbackSystem', () => {
    describe('triggerImpact()', () => {
        test('ignores unknown impact levels', () => {
            const fx = makeSystem();
            expect(() => fx.triggerImpact('nonexistent')).not.toThrow();
            expect(fx.getGameplayDt(0.016)).toBe(0.016);
        });

        test('arms hit-stop for the preset duration', () => {
            const fx = makeSystem();
            fx.triggerImpact('medium');
            expect(fx.hitStopRemaining).toBeCloseTo(0.06);
        });

        test('arms shake magnitude and duration for the preset', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy');
            expect(fx.shakeMagnitude).toBeCloseTo(8);
            expect(fx.shakeRemaining).toBeCloseTo(0.25);
        });

        test('re-triggering never shortens hit-stop below whichever duration is larger', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy'); // 100ms
            fx.update(0.09); // 90ms elapsed, 10ms remaining
            fx.triggerImpact('medium'); // 60ms - longer than the 10ms currently remaining, so it wins
            expect(fx.hitStopRemaining).toBeCloseTo(0.06);
        });
    });

    describe('getGameplayDt()', () => {
        test('returns dt unchanged when no hit-stop is active', () => {
            const fx = makeSystem();
            expect(fx.getGameplayDt(0.016)).toBe(0.016);
        });

        test('returns 0 while hit-stop is active', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy');
            expect(fx.getGameplayDt(0.016)).toBe(0);
        });

        test('returns dt again once hit-stop elapses', () => {
            const fx = makeSystem();
            fx.triggerImpact('medium'); // 60ms
            fx.update(0.06);
            expect(fx.getGameplayDt(0.016)).toBe(0.016);
        });
    });

    describe('getShakeOffset()', () => {
        test('returns zero offset when no shake is active', () => {
            const fx = makeSystem();
            expect(fx.getShakeOffset()).toEqual({ x: 0, y: 0 });
        });

        test('returns a bounded, decaying offset while shaking', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy'); // magnitude 8
            const { x, y } = fx.getShakeOffset();
            expect(Math.abs(x)).toBeLessThanOrEqual(8);
            expect(Math.abs(y)).toBeLessThanOrEqual(8);
        });

        test('offset magnitude falls off as the shake progresses', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy');
            fx.update(0.2); // 200ms of a 250ms shake elapsed - little left
            const { x, y } = fx.getShakeOffset();
            expect(Math.abs(x)).toBeLessThanOrEqual(8 * 0.2);
            expect(Math.abs(y)).toBeLessThanOrEqual(8 * 0.2);
        });

        test('returns zero offset once shake duration elapses', () => {
            const fx = makeSystem();
            fx.triggerImpact('heavy');
            fx.update(1); // well past the 250ms shake
            expect(fx.getShakeOffset()).toEqual({ x: 0, y: 0 });
        });
    });

    describe('intensity scaling', () => {
        test('scales shake magnitude by the configured intensity', () => {
            const fx = makeSystem({ intensity: 0.5 });
            fx.triggerImpact('heavy'); // base magnitude 8
            expect(fx.shakeMagnitude).toBeCloseTo(4);
        });
    });

    describe('enable/disable flags', () => {
        test('screenShakeEnabled: false suppresses shake but not hit-stop', () => {
            const fx = makeSystem({ screenShakeEnabled: false });
            fx.triggerImpact('heavy');
            expect(fx.getShakeOffset()).toEqual({ x: 0, y: 0 });
            expect(fx.hitStopRemaining).toBeGreaterThan(0);
        });

        test('hitStopEnabled: false suppresses hit-stop but not shake', () => {
            const fx = makeSystem({ hitStopEnabled: false });
            fx.triggerImpact('heavy');
            expect(fx.getGameplayDt(0.016)).toBe(0.016);
            expect(fx.shakeRemaining).toBeGreaterThan(0);
        });
    });

    describe('update()', () => {
        test('is safe to call with no active effects', () => {
            const fx = makeSystem();
            expect(() => fx.update(0.016)).not.toThrow();
        });
    });
});

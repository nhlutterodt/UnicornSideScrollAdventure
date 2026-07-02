import { InputBuffer } from './InputBuffer.js';

describe('InputBuffer', () => {
    let buffer;

    beforeEach(() => {
        buffer = new InputBuffer();
    });

    describe('buffer() / isBuffered()', () => {
        test('is not buffered before being armed', () => {
            expect(buffer.isBuffered('jump')).toBe(false);
        });

        test('is buffered immediately after arming', () => {
            buffer.buffer('jump', 0.12);
            expect(buffer.isBuffered('jump')).toBe(true);
        });

        test('ignores non-positive windows', () => {
            buffer.buffer('jump', 0);
            expect(buffer.isBuffered('jump')).toBe(false);

            buffer.buffer('jump', -1);
            expect(buffer.isBuffered('jump')).toBe(false);
        });

        test('re-arming refreshes the window instead of stacking', () => {
            buffer.buffer('jump', 0.05);
            buffer.buffer('jump', 0.2);
            buffer.update(0.1);
            expect(buffer.isBuffered('jump')).toBe(true);
        });
    });

    describe('update()', () => {
        test('remains buffered while time remains', () => {
            buffer.buffer('jump', 0.12);
            buffer.update(0.05);
            expect(buffer.isBuffered('jump')).toBe(true);
        });

        test('expires once elapsed time meets the window', () => {
            buffer.buffer('jump', 0.12);
            buffer.update(0.06);
            buffer.update(0.06);
            expect(buffer.isBuffered('jump')).toBe(false);
        });

        test('expires in a single large step past the window', () => {
            buffer.buffer('jump', 0.12);
            buffer.update(0.5);
            expect(buffer.isBuffered('jump')).toBe(false);
        });

        test('tracks multiple independent keys', () => {
            buffer.buffer('jump', 0.1);
            buffer.buffer('coyote', 0.3);
            buffer.update(0.15);

            expect(buffer.isBuffered('jump')).toBe(false);
            expect(buffer.isBuffered('coyote')).toBe(true);
        });
    });

    describe('consume()', () => {
        test('clears a buffered key immediately', () => {
            buffer.buffer('jump', 0.12);
            buffer.consume('jump');
            expect(buffer.isBuffered('jump')).toBe(false);
        });

        test('consuming an unbuffered key is a no-op', () => {
            expect(() => buffer.consume('jump')).not.toThrow();
        });

        test('prevents a second action from the same buffered input', () => {
            buffer.buffer('jump', 0.12);
            expect(buffer.isBuffered('jump')).toBe(true);
            buffer.consume('jump');
            expect(buffer.isBuffered('jump')).toBe(false);
        });
    });
});

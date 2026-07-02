import { PhysicsUtils } from './PhysicsUtils.js';

describe('PhysicsUtils.testSegmentVsAABB', () => {
    const box = { x: 0, y: 0, width: 10, height: 10 };

    test('returns true for a segment that crosses the box', () => {
        const hit = PhysicsUtils.testSegmentVsAABB(-5, 5, 15, 5, box);
        expect(hit).toBe(true);
    });

    test('returns false for a segment fully outside box bounds', () => {
        const hit = PhysicsUtils.testSegmentVsAABB(-5, -5, -1, -1, box);
        expect(hit).toBe(false);
    });

    test('returns true when an endpoint is inside the box', () => {
        const hit = PhysicsUtils.testSegmentVsAABB(5, 5, 20, 20, box);
        expect(hit).toBe(true);
    });

    test('returns false when segment AABB overlaps but segment does not intersect the box', () => {
        // Regression: old implementation returned true after broad-phase overlap
        // without doing a real segment-vs-AABB intersection test.
        const hit = PhysicsUtils.testSegmentVsAABB(-1, 9.91, 11, 11.11, box);
        expect(hit).toBe(false);
    });
});

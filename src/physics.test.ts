import { it, expect } from 'vitest';
import { stepBodies, type Body } from './physics';
import { foldPolygon } from './foldGeometry';
it('keeps 24 colliding tags finite and bounded over ten minutes, with bounded throw speed', () => {
    const bodies: Body[] = Array.from({ length: 24 }, (_, i) => ({ label: String(i), x: i * 3, y: 0, vx: 999, vy: 999, w: 60, h: 34 }));
    for (let i = 0; i < 36000; i++)
        stepBodies(bodies, 500, 280, .5, .92, .5, true);
    for (const b of bodies) {
        expect(Number.isFinite(b.x + b.y + b.vx + b.vy + (b.angle ?? 0))).toBe(true);
        expect(Math.abs(b.angle ?? 0)).toBeLessThanOrEqual(.12);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(500);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.y + b.h).toBeLessThanOrEqual(280);
        expect(Math.abs(b.vx)).toBeLessThanOrEqual(18);
        expect(Math.abs(b.vy)).toBeLessThanOrEqual(18);
    }
});
it('does not move a held body during integration or collision resolution', () => {
    const a = { label: 'a', x: 10, y: 20, vx: 0, vy: 0, w: 50, h: 30 }, b = { ...a, label: 'b' };
    stepBodies([a, b], 300, 280, .5, .92, .5, true, 0);
    expect(a.x).toBe(10);
    expect(a.y).toBe(20);
});
it('fold geometry respects all corners and produces only controlled polygons', () => {
    for (const left of [true, false])
        for (const bottom of [true, false]) {
            expect(foldPolygon(0, left, bottom)).toContain('polygon(');
            expect(foldPolygon(.5, left, bottom)).not.toBe(foldPolygon(.25, left, bottom));
            expect(foldPolygon(1, left, bottom)).toMatch(/polygon|inset/);
            expect(foldPolygon(.45, left, bottom, true)).not.toMatch(/NaN|Infinity|undefined/);
        }
});

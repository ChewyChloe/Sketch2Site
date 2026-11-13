// Original bounded AABB solver. One unit step is 1/60 second; no external physics code.
export type Body = {
    label: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    w: number;
    h: number;
    angle?: number;
    omega?: number;
};
export function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(Math.max(min, max), value)); }
export function stepBodies(bodies: Body[], width: number, height: number, gravity: number, friction: number, restitution: number, collision: boolean, held = -1) {
    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        b.angle ??= 0;
        b.omega ??= 0;
        if (i !== held) {
            b.omega = clamp(b.omega * .95, -.01, .01);
            b.angle = clamp(b.angle + b.omega, -.12, .12);
            b.vy = clamp(b.vy + gravity, -18, 18);
            b.vx = clamp(b.vx * friction, -18, 18);
            b.x += b.vx;
            b.y += b.vy;
        }
        if (b.x < 0 || b.x + b.w > width) {
            b.x = clamp(b.x, 0, width - b.w);
            b.vx *= -restitution;
        }
        if (b.y < 0 || b.y + b.h > height) {
            b.y = clamp(b.y, 0, height - b.h);
            b.vy = Math.abs(b.vy) < 1 ? 0 : -b.vy * restitution;
        }
    }
    if (collision)
        for (let i = 0; i < bodies.length; i++)
            for (let j = i + 1; j < bodies.length; j++) {
                const a = bodies[i], b = bodies[j], dx = a.x + a.w / 2 - b.x - b.w / 2, dy = a.y + a.h / 2 - b.y - b.h / 2;
                const bounds = (body: Body) => { const cos = Math.abs(Math.cos(body.angle ?? 0)), sin = Math.abs(Math.sin(body.angle ?? 0)); return { w: cos * body.w + sin * body.h, h: cos * body.h + sin * body.w }; };
                const ab = bounds(a), bb = bounds(b), ox = (ab.w + bb.w) / 2 - Math.abs(dx), oy = (ab.h + bb.h) / 2 - Math.abs(dy);
                if (ox <= 0 || oy <= 0)
                    continue;
                const move = (body: Body, index: number, amount: number, axis: 'x' | 'y') => { if (index !== held) {
                    body[axis] += amount;
                    const v = axis === 'x' ? 'vx' : 'vy';
                    body[v] *= -restitution;
                    body.omega = clamp((body.omega ?? 0) + amount * .0005, -.01, .01);
                } };
                const amount = (ox < oy ? ox : oy) + .1, axis = ox < oy ? 'x' : 'y', sign = (ox < oy ? dx : dy) >= 0 ? 1 : -1;
                move(a, i, sign * amount * (j === held ? 1 : .5), axis);
                move(b, j, -sign * amount * (i === held ? 1 : .5), axis);
            }
    // Collision resolution may push a body outward: project once more into finite bounds.
    for (const b of bodies) {
        const angle = b.angle ?? 0, extraX = (Math.abs(Math.cos(angle)) * b.w + Math.abs(Math.sin(angle)) * b.h - b.w) / 2, extraY = (Math.abs(Math.cos(angle)) * b.h + Math.abs(Math.sin(angle)) * b.w - b.h) / 2;
        b.x = clamp(b.x, Math.max(0, extraX), width - b.w - Math.max(0, extraX));
        b.y = clamp(b.y, Math.max(0, extraY), height - b.h - Math.max(0, extraY));
    }
}

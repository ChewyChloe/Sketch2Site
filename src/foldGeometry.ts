type Point = {
    x: number;
    y: number;
};
/** Clip the unit square against a diagonal measured from the chosen corner. */
export function foldPolygon(progress: number, left: boolean, bottom: boolean, band = false) {
    const distance = (p: Point) => (left ? p.x : 1 - p.x) + (bottom ? 1 - p.y : p.y);
    const clip = (polygon: Point[], limit: number, keepAbove: boolean) => {
        const out: Point[] = [];
        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i], b = polygon[(i + 1) % polygon.length], da = distance(a) - limit, db = distance(b) - limit;
            const inside = (v: number) => keepAbove ? v >= 0 : v <= 0;
            if (inside(da))
                out.push(a);
            if (inside(da) !== inside(db)) {
                const t = da / (da - db);
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            }
        }
        return out;
    };
    const d = Math.max(0, Math.min(1, progress)) * 2;
    let points = clip([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], d, true);
    if (band)
        points = clip(points, d + .07, false);
    return points.length ? 'polygon(' + points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(',') + ')' : 'inset(100%)';
}

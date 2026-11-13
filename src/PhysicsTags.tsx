import { useEffect, useRef, useState } from 'react';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { clamp, stepBodies, type Body } from './physics';
export function PhysicsTags({ effect }: {
    effect: MotionInstance;
}) {
    const ref = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null), reduced = useReducedMotion();
    const [dragMode, setDragMode] = useState(false), [narrow, setNarrow] = useState(false);
    const c = effect.validatedControls, labels = c.labels as string[], bodiesRef = useRef<Body[]>([]);
    useEffect(() => { bodiesRef.current = []; }, [effect]);
    useEffect(() => {
        const el = host.current;
        if (!el)
            return;
        const observer = new ResizeObserver(entries => {
            const width = entries[0].contentRect.width, measure = document.createElement('canvas').getContext('2d');
            if (measure)
                measure.font = `14px ${getComputedStyle(el).fontFamily}`;
            const area = labels.reduce((sum, label) => sum + ((measure?.measureText(label).width ?? label.length * 14) + 24) * 42, 0);
            setNarrow(width < 240 || area > width * 280 * .6);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [labels]);
    useEffect(() => {
        const canvas = ref.current, container = host.current;
        if (!canvas || !container || reduced || narrow)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        let width = 0, height = 280, raf = 0, previous = 0, accumulator = 0, visible = false, spawnElapsed = 0;
        let held = -1, offset = { x: 0, y: 0 }, last = { x: 0, y: 0, t: 0 }, pointer: number | undefined;
        const bodies = bodiesRef.current, theme = getComputedStyle(container), font = theme.fontFamily, ink = theme.getPropertyValue('--ink').trim() || '#253d30', panel = theme.getPropertyValue('--panel').trim() || '#fff', accent = theme.getPropertyValue('--accent-soft').trim() || '#edf0eb', line = theme.getPropertyValue('--line').trim() || '#bac6bd';
        const resize = () => {
            const r = container.getBoundingClientRect(), old = width;
            width = container.clientWidth;
            height = 280;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.round(width * dpr);
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.font = `14px ${font}`;
            for (const b of bodies) {
                b.w = Math.min(width - 12, ctx.measureText(b.label).width + 24);
                b.x = clamp(old ? b.x / old * width : b.x, 0, width - b.w);
                b.y = clamp(b.y, 0, height - b.h);
            }
        };
        const draw = () => { ctx.clearRect(0, 0, width, height); ctx.font = `14px ${font}`; ctx.textBaseline = 'middle'; for (let i = 0; i < bodies.length; i++) {
            const b = bodies[i];
            ctx.save();
            ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
            ctx.rotate(b.angle ?? 0);
            ctx.fillStyle = i === held ? accent : panel;
            ctx.strokeStyle = line;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = ink;
            ctx.fillText(b.label, -b.w / 2 + 12, 0, b.w - 24);
            ctx.restore();
        } };
        const tick = (now: number) => {
            raf = 0;
            if (!visible || document.hidden || canvas.closest("[inert]"))
                return;
            accumulator += Math.min(80, previous ? now - previous : 0);
            previous = now;
            let steps = 0;
            while (accumulator >= 1000 / 60 && steps++ < 5) {
                spawnElapsed += 1000 / 60;
                if (bodies.length < labels.length && spawnElapsed >= motionNumber(effect, 'spawnIntervalMs')) {
                    const label = labels[bodies.length], w = Math.min(width - 12, ctx.measureText(label).width + 24);
                    bodies.push({ label, x: (bodies.length * 73) % Math.max(1, width - w), y: 0, vx: 0, vy: 0, w, h: 34 });
                    spawnElapsed = 0;
                }
                stepBodies(bodies, width, height, motionNumber(effect, 'gravity'), motionNumber(effect, 'friction'), motionNumber(effect, 'restitution'), Boolean(c.collisionEnabled), held);
                accumulator -= 1000 / 60;
            }
            draw();
            raf = requestAnimationFrame(tick);
        };
        const resume = () => { cancelAnimationFrame(raf); raf = 0; previous = 0; accumulator = 0; if (visible && !document.hidden && !canvas.closest("[inert]"))
            raf = requestAnimationFrame(tick); };
        const inertObserver = new MutationObserver(resume);
        inertObserver.observe(container.closest(".rendered-page") ?? container, { subtree: true, attributes: true, attributeFilter: ["inert", "hidden"] });
        const intersection = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); resume(); });
        intersection.observe(canvas);
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();
        const point = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * width / r.width, y: (e.clientY - r.top) * height / r.height }; };
        const down = (e: PointerEvent) => { if (!dragMode || !c.draggable || e.button !== 0)
            return; const p = point(e); held = -1; for (let i = bodies.length - 1; i >= 0; i--) {
            const b = bodies[i];
            if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
                held = i;
                break;
            }
        } if (held < 0)
            return; e.preventDefault(); pointer = e.pointerId; canvas.setPointerCapture(pointer); offset = { x: p.x - bodies[held].x, y: p.y - bodies[held].y }; last = { ...p, t: e.timeStamp }; };
        const move = (e: PointerEvent) => { if (held < 0 || pointer !== e.pointerId)
            return; const p = point(e), b = bodies[held], dt = Math.max(1, e.timeStamp - last.t); b.x = clamp(p.x - offset.x, 0, width - b.w); b.y = clamp(p.y - offset.y, 0, height - b.h); b.vx = clamp((p.x - last.x) / dt * 1000 / 60, -18, 18); b.vy = clamp((p.y - last.y) / dt * 1000 / 60, -18, 18); b.omega = clamp((b.vx + b.vy) * .001, -.01, .01); last = { ...p, t: e.timeStamp }; };
        const up = (e: PointerEvent) => { if (pointer !== e.pointerId)
            return; if (held >= 0 && (e.type === 'pointercancel' || e.timeStamp - last.t > 100)) {
            bodies[held].vx = 0;
            bodies[held].vy = 0;
        } held = -1; if (canvas.hasPointerCapture(e.pointerId))
            canvas.releasePointerCapture(e.pointerId); pointer = undefined; };
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointermove', move);
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        canvas.addEventListener('lostpointercapture', up);
        document.addEventListener('visibilitychange', resume);
        return () => { cancelAnimationFrame(raf); inertObserver.disconnect(); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', resume); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up); };
    }, [effect, c, labels, reduced, narrow, dragMode]);
    return <div ref={host} className="motion-physics">{!reduced && !narrow && <><canvas ref={ref} aria-hidden="true" style={{ width: '100%', height: 280, touchAction: dragMode && c.draggable ? 'none' : 'pan-y', cursor: dragMode ? 'grab' : 'default' }}/>{Boolean(c.draggable) && <button type="button" className="motion-toggle" aria-pressed={dragMode} onClick={() => setDragMode(v => !v)}>{dragMode ? '退出標籤拖曳' : '拖曳標籤'}</button>}</>}<ul className={reduced || narrow ? 'motion-tag-list' : 'motion-sr'} aria-label="標籤內容">{labels.map(label => <li key={label}>{label}</li>)}</ul></div>;
}

import { foldPolygon } from './foldGeometry';
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
export function FoldReveal({ effect, children }: {
    effect: MotionInstance;
    children: ReactNode;
}) {
    const [progress, setProgress] = useState(0), [opened, setOpened] = useState(false), reduced = useReducedMotion(), host = useRef<HTMLDivElement>(null), position = useRef(0), frame = useRef(0);
    const drag = useRef<{
        id: number;
        start: number;
        progress: number;
        last: number;
        time: number;
        velocity: number;
        moved: boolean;
    } | null>(null), suppressClick = useRef(false), c = effect.validatedControls;
    const left = String(c.foldCorner).endsWith('left'), bottom = String(c.foldCorner).startsWith('bottom');
    const update = (value: number) => { position.current = value; setProgress(value); };
    const settle = (target: number) => {
        cancelAnimationFrame(frame.current);
        setOpened(target === 1);
        if (reduced) {
            update(target);
            return;
        }
        const from = position.current, start = performance.now(), duration = motionNumber(effect, 'springResponse') * 1000;
        const step = (now: number) => { const p = Math.min(1, (now - start) / duration); update(from + (target - from) * (1 - Math.pow(1 - p, 3))); if (p < 1)
            frame.current = requestAnimationFrame(step); };
        frame.current = requestAnimationFrame(step);
    };
    useEffect(() => () => cancelAnimationFrame(frame.current), []);
    useEffect(() => { if (reduced) {
        cancelAnimationFrame(frame.current);
        update(opened ? 1 : 0);
    } }, [reduced, opened]);
    const front = progress < 1, style = { '--fold-progress': progress, '--fold-origin': `${left ? 'left' : 'right'} ${bottom ? 'bottom' : 'top'}`, '--fold-shadow': c.foldShadow === 'none' ? 'none' : '0 3px 10px rgb(0 0 0 / .12)' } as CSSProperties;
    return <div ref={host} className="motion-fold" data-left={left} data-bottom={bottom} style={style}>
  <div className="motion-fold-layers"><div className="motion-fold-under" inert={!opened} aria-hidden={!opened}>{String(c.underText)}</div><div className="motion-fold-front" inert={!front || opened} aria-hidden={!front || opened} style={{ clipPath: reduced ? (opened ? 'inset(100%)' : 'none') : foldPolygon(progress, left, bottom) }}>{children}</div>{!reduced && progress > 0 && progress < 1 && <div className="motion-fold-edge" aria-hidden="true" style={{ clipPath: foldPolygon(progress, left, bottom, true) }}/>}</div>
  <button type="button" className="motion-toggle motion-fold-handle" aria-pressed={opened} aria-label="折頁切換" style={{ touchAction: 'none' }} onPointerDown={e => { if (e.button !== 0)
        return; cancelAnimationFrame(frame.current); suppressClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { id: e.pointerId, start: e.clientX, progress: position.current, last: e.clientX, time: e.timeStamp, velocity: 0, moved: false }; }} onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId || reduced)
        return; const sign = left ? 1 : -1, w = host.current!.getBoundingClientRect().width; const delta = sign * (e.clientX - d.start) / Math.max(1, w); d.moved ||= Math.abs(e.clientX - d.start) > 4; d.velocity = sign * (e.clientX - d.last) / Math.max(1, e.timeStamp - d.time); d.last = e.clientX; d.time = e.timeStamp; update(Math.max(0, Math.min(1, d.progress + delta))); }} onPointerUp={e => { const d = drag.current; if (!d || d.id !== e.pointerId)
        return; drag.current = null; suppressClick.current = d.moved; if (d.moved) {
        const velocity = e.timeStamp - d.time < 100 ? d.velocity : 0;
        settle(velocity > .5 ? 1 : velocity < -.5 ? 0 : position.current >= motionNumber(effect, 'revealThreshold') ? 1 : 0);
    } if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; suppressClick.current = true; settle(opened ? 1 : 0); }} onLostPointerCapture={() => { if (drag.current) {
        drag.current = null;
        settle(opened ? 1 : 0);
    } }} onClick={e => { if (suppressClick.current) {
        suppressClick.current = false;
        return;
    } if (c.clickToToggle || e.detail === 0)
        settle(opened ? 0 : 1); }}>{opened ? '收起內容' : '揭開內容'}</button>
 </div>;
}

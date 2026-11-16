import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { motionNumber, motionDuration, type MotionInstance } from './motion';
export function useReducedMotion() {
    const [reduced, setReduced] = useState(() => typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => { if(typeof matchMedia !== 'function')return; const q = matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(q.matches); q.addEventListener('change', update); return () => q.removeEventListener('change', update); }, []);
    return reduced;
}
export function CountUp({ effect, original }: {
    effect: MotionInstance;
    original: string;
}) {
    const c = effect.validatedControls, reduced = useReducedMotion(), ref = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState(Number(c.endValue));
    useEffect(() => {
        let frame = 0, observer: IntersectionObserver | undefined, started = false;
        const end = Number(c.endValue), start = Number(c.startValue), duration = motionDuration(effect);
        setValue(end);
        const begin = () => {
            if (started || reduced)
                return;
            started = true;
            let first: number | undefined;
            const step = (now: number) => { first ??= now; const p = Math.min(1, (now - first) / duration); setValue(p === 1 ? end : start + (end - start) * (1 - Math.pow(1 - p, 3))); if (p < 1)
                frame = requestAnimationFrame(step); };
            frame = requestAnimationFrame(step);
        };
        if (!reduced && ref.current) {
            observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) {
                begin();
                observer?.disconnect();
            } });
            observer.observe(ref.current);
        }
        return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
    }, [effect, c, reduced]);
    const formatted = new Intl.NumberFormat(String(c.locale), { minimumFractionDigits: Number(c.decimals), maximumFractionDigits: Number(c.decimals) }).format(value);
    return <span ref={ref} className="motion-number"><span className="motion-sr">{original}</span><span aria-hidden="true">{String(c.prefix)}{formatted}{String(c.suffix)}</span></span>;
}
export function CurvedText({ effect, text }: {
    effect: MotionInstance;
    text: string;
}) {
    const id = 'curve-' + useId().replaceAll(':', ''), ref = useRef<SVGSVGElement>(null), host = useRef<HTMLSpanElement>(null), reduced = useReducedMotion();
    const [width, setWidth] = useState(600), [fontSize, setFontSize] = useState(16);
    useEffect(() => { if (!host.current)
        return; const o = new ResizeObserver(entries => { setWidth(entries[0].contentRect.width); setFontSize(Math.max(16, parseFloat(getComputedStyle(host.current!).fontSize) || 16)); }); o.observe(host.current); return () => o.disconnect(); }, []);
    useEffect(() => { const svg = ref.current; if (!svg || reduced || !svg.animate)
        return; let animation: Animation | undefined; const o = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) {
        animation = svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: motionDuration(effect), easing: 'ease-out' });
        o.disconnect();
    } }); o.observe(svg); return () => { o.disconnect(); animation?.cancel(); }; }, [effect, reduced, width]);
    const fallback = text.length > 80 || text.length * fontSize > width - 40 || width < 180, c = effect.validatedControls;
    const bend = ({ gentle: 40, medium: 80, strong: 120 } as Record<string, number>)[String(c.curvature)] * (c.direction === 'downward' ? -1 : 1);
    const height = Math.max(fontSize * 3, Math.abs(bend) + fontSize * 2);
    const offset = ({ start: '0%', center: '50%', end: '100%' } as Record<string, string>)[String(c.textAlign)];
    return <span className="motion-curve" ref={host}>{fallback ? text : <><span className="motion-sr">{text}</span><svg aria-hidden="true" ref={ref} viewBox={`0 0 ${width} ${height}`}><defs><path id={id} d={`M 20 ${height / 2} Q ${width / 2} ${height / 2 - bend * .6} ${width - 20} ${height / 2}`}/></defs><text style={{ fontSize }} textAnchor={c.textAlign === 'center' ? 'middle' : c.textAlign === 'end' ? 'end' : 'start'}><textPath href={'#' + id} startOffset={offset}>{text}</textPath></text></svg></>}</span>;
}
export function FlipCard({ effect, children }: {
    effect: MotionInstance;
    children: ReactNode;
}) {
    const [back, setBack] = useState(false), reduced = useReducedMotion(), c = effect.validatedControls;
    const style = { '--flip-duration': motionDuration(effect) + 'ms', '--flip-perspective': String(c.perspectivePx) + 'px', '--flip-rotation': c.axis === 'x' ? 'rotateX(180deg)' : 'rotateY(180deg)' } as CSSProperties;
    return <div className="motion-flip" style={style} data-back={back} data-reduced={reduced} onMouseEnter={() => { if (c.trigger === 'hover')
        setBack(true); }} onMouseLeave={() => { if (c.trigger === 'hover')
        setBack(false); }}>
  <div className="motion-flip-inner"><div className="motion-flip-front" inert={back} aria-hidden={back}>{children}</div><div className="motion-flip-back" inert={!back} aria-hidden={!back}>{String(c.backText)}</div></div>
  <button type="button" className="motion-toggle" aria-pressed={back} onClick={() => setBack(v => !v)}>{back ? '查看正面' : '查看背面'}</button>
 </div>;
}

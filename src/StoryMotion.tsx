import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { resources } from './AdvancedMotion';
export const storyGroupIds = ['horizontal-scroll-gallery', 'sticky-section-morph', 'pinned-story-panels'];
function useSmall(ref:React.RefObject<HTMLElement|null>,demo:boolean) {
 const [small,setSmall]=useState(()=>typeof matchMedia==='function'&&matchMedia('(max-width:600px)').matches);
 useEffect(()=>{const host=ref.current,root=host?.closest('.rendered-page');const update=()=>setSmall((demo?window.innerWidth:(root?.clientWidth??window.innerWidth))<=600);const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);if(root)observer?.observe(root);window.addEventListener('resize',update);update();return()=>{observer?.disconnect();window.removeEventListener('resize',update);};},[ref,demo]);return small;
}
export function StoryGroup({ effect, children, demo=false, media }: {
    effect: MotionInstance;
    children: ReactNode;
    demo?:boolean;
    media?: { id: string; image: ReactNode; copy: ReactNode }[];
}) {
    const ref = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), reduced = useReducedMotion(), small = useSmall(ref,demo), [progress, setProgress] = useState(0), [scene, setScene] = useState(0);
    const currentScene = useRef(0);
    const parts = Children.toArray(children), height = motionNumber(effect, 'viewportHeightPx', 240), simple = reduced || small;
    useEffect(() => { const host = ref.current; if (!host)
        return; let frame = 0; const update = () => { frame = 0; const p = Math.max(0, Math.min(1, host.scrollTop / Math.max(1, host.scrollHeight - host.clientHeight))); setProgress(p); const mediaCards = media && !simple ? Array.from(host.querySelectorAll<HTMLElement>('.story-media-copy > div')) : [];
        const viewMiddle = host.getBoundingClientRect().top + host.clientHeight / 2;
        const visibleScene = mediaCards.reduce((last, card, index) => card.getBoundingClientRect().top <= viewMiddle ? index : last, 0);
        const next = mediaCards.length ? Math.max(0, visibleScene) : Math.min(parts.length - 1, Math.floor(p * parts.length)); if (next !== currentScene.current) {
        const previous = track.current?.children[currentScene.current];
        if (previous?.contains(document.activeElement))
            host.focus({ preventScroll: true });
        currentScene.current = next;
        setScene(next);
    } const el = track.current; if (!el)
        return; el.style.setProperty('--story-progress', String(p)); if (effect.presetId === 'horizontal-scroll-gallery')
        el.style.transform = `translateX(-${p * Math.max(0, el.scrollWidth - host.clientWidth)}px)`;
    else if (effect.presetId === 'sticky-section-morph') {
        el.style.transform = `translateX(${p * 8}%) scale(${1 - (1 - motionNumber(effect, 'minScale', .76)) * p})`;
        el.style.borderRadius = `${p * motionNumber(effect, 'radiusPx', 28)}px`;
    } }; const schedule = () => { if (!frame && !document.hidden)
        frame = requestAnimationFrame(update); }; host.addEventListener('scroll', schedule, { passive: true }); const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule); resize?.observe(host); update(); return () => { cancelAnimationFrame(frame); resize?.disconnect(); host.removeEventListener('scroll', schedule); }; }, [effect, simple, parts.length, media]);
    const seek = (value: number) => { const host = ref.current; if (!host)
        return; host.scrollTop = value * (host.scrollHeight - host.clientHeight); };
    return <div className={'story-group ' + (simple ? 'story-simple' : '')} data-story={effect.presetId}>
  {!simple && <label className="story-progress-label">區塊進度<input aria-label="敘事捲動進度" type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={e => seek(Number(e.target.value) / 100)}/></label>}
  <div ref={ref} className="story-viewport" tabIndex={0} aria-label="敘事捲動區域" style={simple ? undefined : { height }}>
   {simple ? <div className={effect.presetId === 'horizontal-scroll-gallery' ? 'story-native-gallery' : 'story-vertical'}>{parts}</div> : media ? <div className="story-media" style={{ '--story-media-height': height + 'px', '--story-transition': motionNumber(effect, 'transitionMs', 220) + 'ms' } as React.CSSProperties}>
      <div className="story-media-pin" ref={track}>{media.map((panel, i) => <div key={panel.id} aria-hidden={scene !== i} inert={scene !== i} data-active={scene === i}>{panel.image}</div>)}</div>
      <div className="story-media-copy">{media.map(panel => <div key={panel.id}>{panel.copy}</div>)}</div>
    </div> : <div className="story-range" style={{ height: height * Math.max(2, parts.length) * motionNumber(effect, 'travel', 1) }}><div className="story-pin" style={{ height }}><div ref={track} className={'story-track ' + (effect.presetId === 'pinned-story-panels' ? 'story-panels' : '')} style={{ '--story-transition': `${motionNumber(effect, 'transitionMs', 220)}ms` } as React.CSSProperties}>{parts.map((child, i) => <div className="story-panel" key={i} aria-hidden={effect.presetId === 'pinned-story-panels' && scene !== i ? true : undefined} inert={effect.presetId === 'pinned-story-panels' && scene !== i} data-active={scene === i}>{child}</div>)}</div></div></div>}
  </div>
  {!simple && <small className="story-step">{effect.presetId === 'pinned-story-panels' ? `分鏡 ${scene + 1} / ${parts.length}` : '在這個區塊裡捲動'}</small>}
 </div>;
}
export function CardShuffle({ effect, children }: {
    effect: MotionInstance;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null), [index, setIndex] = useState(0), [busy, setBusy] = useState(false), reduced = useReducedMotion(), parts = Children.toArray(children), controller = useRef<ReturnType<typeof resources> | null>(null), alive = useRef(false);
    useEffect(() => { if (!ref.current)
        return; alive.current = true; controller.current = resources(ref.current, reduced); return () => { alive.current = false; controller.current?.dispose(); controller.current = null; }; }, [effect, reduced]);
    const shuffle = () => { if (busy || reduced)
        return; setBusy(true); const cards = Array.from(ref.current?.querySelectorAll<HTMLElement>(':scope>.shuffle-cards>.shuffle-item') ?? []); cards.forEach((el, i) => { const rank = (i - index + parts.length) % parts.length; const sign = i % 2 ? -1 : 1; controller.current?.animate(el, [{ transform: `translate(0,${rank * 4}px) rotate(${rank * 1.5}deg)` }, { transform: `translate(${sign * motionNumber(effect, 'distancePx', 40)}px,-18px) rotate(${sign * 12}deg)`, offset: .45 }, { transform: `translate(0,${((i - index - 1 + parts.length) % parts.length) * 4}px) rotate(${((i - index - 1 + parts.length) % parts.length) * 1.5}deg)` }], { duration: motionNumber(effect, 'durationMs', 700), easing: 'cubic-bezier(.2,.7,.3,1)' }); }); const final = cards[0]?.getAnimations()[0]; if (final) {
        const finish = () => { if (!alive.current)
            return; setIndex(v => (v + 1) % parts.length); setBusy(false); };
        final.addEventListener('finish', finish, { once: true });
        final.addEventListener('cancel', () => { if (alive.current)
            setBusy(false); }, { once: true });
    }
    else
        setBusy(false); };
    return <div ref={ref} className={'cin-shuffle ' + (reduced ? 'shuffle-static' : '')}><div className="shuffle-cards">{parts.map((child, i) => <div key={i} className="shuffle-item" data-front={index === i} inert={!reduced && index !== i} aria-hidden={!reduced && index !== i ? true : undefined} style={reduced ? undefined : { gridArea: '1 / 1', zIndex: parts.length - (i - index + parts.length) % parts.length, transform: `translateY(${((i - index + parts.length) % parts.length) * 4}px) rotate(${((i - index + parts.length) % parts.length) * 1.5}deg)` }}>{child}</div>)}</div>{!reduced && <button type="button" className="motion-toggle" onClick={shuffle} disabled={busy}>洗牌 · 第{index + 1}/{parts.length}張</button>}</div>;
}
export function FrameSequence({ effect, original, alt, urls }: {
    effect: MotionInstance;
    original: string;
    alt: string;
    urls: Readonly<Record<string, string | null>>;
}) {
    const ref = useRef<HTMLDivElement>(null), [p, setP] = useState(0), [failed, setFailed] = useState<Set<number>>(() => new Set()), reduced = useReducedMotion(), frames = effect.validatedControls.frames as string[], height = motionNumber(effect, 'viewportHeightPx', 240);
    const index = reduced ? 0 : Math.min(frames.length - 1, Math.floor(p * frames.length));
    const frameSignature = frames.map(ref => urls[ref] ?? ref).join('|');
    useEffect(() => setFailed(new Set()), [frameSignature]);
    const resolve = (value: string) => value in urls ? urls[value] || null : import.meta.env.BASE_URL + value.slice(1);
    const selected = resolve(frames[index]), fallback = resolve(original), src = failed.has(index) || !selected ? fallback : selected;
    useEffect(() => { let frame = 0; const host = ref.current; if (!host)
        return; const update = () => { frame = 0; setP(Math.min(1, host.scrollTop / Math.max(1, host.scrollHeight - host.clientHeight))); }; const scroll = () => { if (!frame)
        frame = requestAnimationFrame(update); }; host.addEventListener('scroll', scroll, { passive: true }); return () => { cancelAnimationFrame(frame); host.removeEventListener('scroll', scroll); }; }, [effect]);
    useEffect(() => { const images: HTMLImageElement[] = []; for (const i of [index, index + 1].filter(i => i < frames.length)) {
        const path = resolve(frames[i]);
        if (!path)
            continue;
        const image = new Image();
        image.onload = () => { };
        image.onerror = () => setFailed(old => new Set([...old, i]));
        image.src = path;
        images.push(image);
    } return () => images.forEach(img => { img.onload = null; img.onerror = null; img.removeAttribute('src'); }); }, [index, effect, urls]);
    return <div className="cin-sequence"><label>影格 {index + 1} / {frames.length}<input aria-label="序列影格進度" type="range" min="0" max="100" value={Math.round((reduced?0:p) * 100)} disabled={reduced} onChange={e => { const value = Number(e.target.value) / 100; setP(value); if (ref.current)
        ref.current.scrollTop = value * (ref.current.scrollHeight - ref.current.clientHeight); }}/></label><div ref={ref} className="sequence-scroll" style={{ height }} tabIndex={0} aria-label="圖片序列捲動區域"><div style={{ height: reduced ? height : height * 3 }}><div className="sequence-pin" style={{ height }}>{src ? <img src={src} alt={alt} onError={() => setFailed(old => new Set([...old, index]))}/> : <span role="status">圖片尚未就緒，請重新選擇素材，</span>}</div></div></div>{(failed.has(index) || !selected) && src && <small role="status">此影格無法載入，顯示原始圖片</small>}</div>;
}

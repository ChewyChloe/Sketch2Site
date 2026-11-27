import { useEffect, useRef, useState, useId } from 'react';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { resources } from './AdvancedMotion';
const segments = (text: string, words = false) => typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter(undefined, { granularity: words ? 'word' : 'grapheme' }).segment(text), s => s.segment) : [text];
/** An accessible real-text layer and short-lived, measured presentation layer. */
export function CinematicText({ text, effect }: {
    text: string;
    effect: MotionInstance;
}) {
    const [second, setSecond] = useState(false), ref = useRef<HTMLSpanElement>(null), id = useId(), reduced = useReducedMotion();
    const morph = effect.presetId === 'text-morph-transition', target = morph && second ? String(effect.validatedControls.toText) : text;
    const previous = useRef(text), autoPlayed = useRef(false);
    useEffect(() => { previous.current = text; autoPlayed.current = false; setSecond(false); }, [text, effect.presetId]);
    useEffect(() => {
        const host = ref.current;
        if (!host)
            return;
        const source = host.querySelector<HTMLElement>('.cin-text-source')!, r = resources(host, reduced);
        let overlay: HTMLElement | null = null, frame = 0;
        const stop = () => { cancelAnimationFrame(frame); overlay?.getAnimations({ subtree: true }).forEach(a => a.cancel()); overlay?.remove(); overlay = null; source.style.removeProperty('opacity'); source.style.removeProperty('mask-image'); };
        const values = segments(target, effect.presetId === 'elastic-word-bounce'), from = previous.current;
        previous.current = target;
        const measure = (value: string, wordMode: boolean) => { const spans = segments(value, wordMode), range = document.createRange(), parent = host.getBoundingClientRect(); let offset = 0; return spans.map(letter => { range.setStart(source.firstChild!, offset); offset += letter.length; range.setEnd(source.firstChild!, offset); const box = range.getBoundingClientRect(); return { letter, x: box.left - parent.left, y: box.top - parent.top, w: box.width, h: box.height }; }); };
        const makeLayer = () => { overlay = document.createElement('span'); overlay.className = 'cin-text-overlay'; overlay.setAttribute('aria-hidden', 'true'); host.append(overlay); source.style.opacity = '0'; };
        const glyph = (text: string, box: {
            x: number;
            y: number;
            w: number;
            h: number;
        }) => { const el = document.createElement('span'); el.className = 'cin-glyph'; el.textContent = text; Object.assign(el.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 1 + 'px', height: box.h + 2 + 'px' }); overlay!.append(el); return el; };
        const run = () => {
            stop();
            if (reduced || typeof Intl.Segmenter!=='function' || values.length > 80 || segments(from).length > 120 || !host.animate)
                return;
            const duration = motionNumber(effect, 'durationMs', 800), start = performance.now();
            if (effect.presetId === 'text-spotlight-reveal') {
                source.style.maskImage = `radial-gradient(circle ${motionNumber(effect, 'radiusPx', 65)}px at 0% 50%,#000 15%,transparent 100%)`;
                const tick = (now: number) => { if (document.hidden) {
                    stop();
                    return;
                } const p = Math.min(1, (now - start) / duration); source.style.maskImage = `radial-gradient(circle ${motionNumber(effect, 'radiusPx', 65)}px at ${p * 120}% 50%,#000 35%,transparent 100%)`; if (p < 1)
                    frame = requestAnimationFrame(tick);
                else
                    stop(); };
                frame = requestAnimationFrame(tick);
                return;
            }
            if (morph && from === target)
                return;
            const mode = effect.validatedControls.style;
            if (morph && (mode === 'portal' || mode === 'squash' || mode === 'orbit')) {
                const sizeOf = () => {
                    const box = source.getBoundingClientRect(), origin = host.getBoundingClientRect();
                    return { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
                };
                const nextBox = sizeOf();
                source.textContent = from;
                const prevBox = sizeOf();
                source.textContent = target;
                makeLayer();
                const next = glyph(target, nextBox), old = glyph(from, prevBox);
                next.classList.add('cin-word-stage'); old.classList.add('cin-word-stage');
                const moves = mode === 'portal' ? {
                    out: [{ scale: '1', opacity: 1 }, { scale: '2.2', opacity: 0, filter: 'blur(4px)' }],
                    in: [{ scale: '.58', opacity: 0, filter: 'blur(4px)' }, { scale: '1', opacity: 1, filter: 'blur(0)' }],
                } : mode === 'squash' ? {
                    out: [{ scale: '1 1', opacity: 1 }, { scale: '1.24 .12', opacity: .27 }, { scale: '1.38 0', opacity: 0 }],
                    in: [{ scale: '1.38 0', opacity: 0 }, { scale: '.94 1.1', opacity: 1, offset: .78 }, { scale: '1 1', opacity: 1 }],
                } : {
                    out: [{ opacity: 1, rotate: '0deg', translate: '0px 0px' }, { opacity: 0, rotate: '-24deg', translate: '-24px -13px' }],
                    in: [{ opacity: 0, rotate: '24deg', translate: '24px 13px' }, { opacity: 1, rotate: '0deg', translate: '0px 0px' }],
                };
                if (mode === 'orbit') {
                    const ring = document.createElement('span');
                    ring.className = 'cin-word-ring';
                    ring.style.left = (nextBox.x + nextBox.w / 2) + 'px';
                    ring.style.top = (nextBox.y + nextBox.h / 2) + 'px';
                    host.querySelector('.cin-text-overlay')?.append(ring);
                    r.animate(ring, [{ rotate: '-45deg', opacity: 0 }, { opacity: .72, offset: .26 }, { rotate: '220deg', opacity: 0 }], { duration });
                }
                const exit = r.animate(old, moves.out, { duration: duration * .55, easing: 'ease-in' });
                exit?.addEventListener('finish', () => old.remove(), { once: true });
                const enter = r.animate(next, moves.in, { duration: duration * .62, delay: duration * .38, fill: 'backwards', easing: 'ease-out' });
                enter?.addEventListener('finish', stop, { once: true });
                return;
            }
            const end = measure(target, effect.presetId === 'elastic-word-bounce');
            let old: ReturnType<typeof measure> = [];
            if (morph) {
                source.textContent = from;
                old = measure(from, false);
                source.textContent = target;
            }
            makeLayer();
            if (morph) {
                const used = new Set<number>();
                end.forEach((c, i) => { const match = old.findIndex((o, j) => o.letter === c.letter && !used.has(j)); if (match >= 0)
                    used.add(match); const origin = match >= 0 ? old[match] : { x: c.x, y: c.y + 12 }; const el = glyph(c.letter, c); el.dataset.matched = String(match >= 0); r.animate(el, [{ transform: `translate(${origin.x - c.x}px,${origin.y - c.y}px) scale(${match >= 0 ? 1 : .7})`, opacity: match >= 0 ? 1 : 0 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration, delay: i*Math.min(18,350/Math.max(1,end.length-1)), fill: 'backwards', easing: 'cubic-bezier(.2,.8,.3,1)' }); });
                old.forEach((c, i) => { if (used.has(i))
                    return; const el = glyph(c.letter, c); r.animate(el, [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(-10px) scale(.7)' }], { duration: duration * .6, fill: 'forwards' }); });
            }
            else
                end.forEach((c, i) => { const el = glyph(c.letter, c), amp = motionNumber(effect, 'amplitudePx', 18), elasticity = motionNumber(effect, 'elasticity', .6); r.animate(el, [{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(-${amp}px) scale(.94,1.12)`, offset: .28 }, { transform: `translateY(0) scale(${1 + .18 * elasticity},${1 - .2 * elasticity})`, offset: .58 }, { transform: `translateY(-${amp * .25 * elasticity}px) scale(1)`, offset: .77 }, { transform: 'translateY(0) scale(1)' }], { duration, delay: i*Math.min(motionNumber(effect,'staggerMs',70),900/Math.max(1,end.length-1)), fill: 'backwards', easing: 'cubic-bezier(.25,.6,.3,1)' }); });
            const total = duration + (morph ? 350 : Math.min(900, end.length * motionNumber(effect, 'staggerMs', 70)));
            const finish = (now: number) => { if (document.hidden || now - start >= total) {
                stop();
                return;
            } frame = requestAnimationFrame(finish); };
            frame = requestAnimationFrame(finish);
        };
        if (effect.presetId === 'typographic-stretch' && !reduced && typeof Intl.Segmenter==='function' && values.length <= 80) {
            let letters: HTMLElement[] = [];
            const start = () => { if (overlay)
                return; const cells = measure(target, false); makeLayer(); letters = cells.map(c => glyph(c.letter, c)); letters.forEach(el => el.style.transition = `transform ${motionNumber(effect, 'durationMs', 240)}ms cubic-bezier(.2,.8,.3,1)`); };
            const reset = () => { letters.forEach(el => el.style.transform = 'scaleX(1)'); stop(); letters = []; };
            r.listen(host, 'pointermove', e => { const p = e as PointerEvent; if (p.pointerType === 'touch')
                return; start(); const box = host.getBoundingClientRect(), x = p.clientX - box.left; letters.forEach(el => { const distance = Math.abs(parseFloat(el.style.left) + parseFloat(el.style.width) / 2 - x); el.style.transform = `scaleX(${1 + Math.max(0, 1 - distance / 90) * (motionNumber(effect, 'maxScale', 1.35) - 1)})`; }); });
            r.listen(host, 'focusin', () => { start(); letters.forEach((el, i) => el.style.transform = `scaleX(${i % 2 ? 1 : motionNumber(effect, 'maxScale', 1.35)})`); });
            r.listen(host, 'click', () => { start(); letters.forEach(el => r.animate(el, [{ transform: 'scaleX(1)' }, { transform: `scaleX(${motionNumber(effect, 'maxScale', 1.35)})` }, { transform: 'scaleX(1)' }], { duration: 500 })); const begin = performance.now(); const done = (now: number) => { if (now - begin >= 550) {
                reset();
                return;
            } frame = requestAnimationFrame(done); }; frame = requestAnimationFrame(done); });
            for (const ev of ['pointerleave', 'focusout'])
                r.listen(host, ev, reset);
        }
        else if (effect.presetId === 'text-spotlight-reveal' && effect.validatedControls.trigger === 'hover') {
            r.listen(host, 'pointermove', e => { if (reduced || (e as PointerEvent).pointerType === 'touch')
                return; const p = e as PointerEvent, b = host.getBoundingClientRect(); source.style.maskImage = `radial-gradient(circle ${motionNumber(effect, 'radiusPx', 65)}px at ${p.clientX - b.left}px ${p.clientY - b.top}px,#000 30%,transparent 100%)`; });
            r.listen(host, 'focusin', run);
            r.listen(host, 'click', run);
            for (const ev of ['pointerleave', 'focusout'])
                r.listen(host, ev, stop);
        }
        else if (!morph || from !== target)
            r.entrance(run);
        if (morph && effect.validatedControls.trigger === 'in-view' && !autoPlayed.current)
            r.entrance(() => { autoPlayed.current = true; setSecond(true); });
        let seen = false;
        const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (seen)
            stop(); seen = true; });
        resize?.observe(source);
        return () => { resize?.disconnect(); stop(); r.dispose(); };
    }, [target, effect, reduced, second, text, morph]);
    return <span ref={ref} className="cin-text"><span id={id} className="cin-text-source" tabIndex={['typographic-stretch', 'text-spotlight-reveal'].includes(effect.presetId) ? 0 : undefined}>{target}</span>{morph && <button type="button" className="motion-toggle cin-morph-toggle" aria-controls={id} aria-pressed={second} onClick={() => setSecond(v => !v)}>切換文字</button>}</span>;
}

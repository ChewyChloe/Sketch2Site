import { useEffect, useRef, type RefObject } from 'react';
import type { PageNode } from './pageSpec';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const palette: Record<string, string> = { lime: '#b5ec74', amber: '#ffda79', sky: '#91d5ef', theme: 'var(--accent,#237552)' };
const svgNS = 'http://www.w3.org/2000/svg';
/** All resources belong to one mounted preset. No perpetual animation loops. */
export function resources(host: HTMLElement, reduced: boolean) {
    const disposers: (() => void)[] = [], animations = new Set<Animation>(), transient = new Set<Animation>(), nodes = new Set<Element>();
    let visible = false, disposed = false;
    const listen = (target: EventTarget, name: string, fn: EventListener) => { target.addEventListener(name, fn, name === 'scroll' ? { passive: true } : undefined); disposers.push(() => target.removeEventListener(name, fn)); };
    const pause = () => { for (const a of animations)
        if (a.playState !== 'finished' && a.playState !== 'idle') {
            if (document.hidden || !visible) {
                if(transient.has(a)) a.cancel(); else a.pause();
            }
            else
                a.play();
        } };
    listen(document, 'visibilitychange', pause);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); pause(); });
    io?.observe(host);
    if (!io)
        visible = true;
    const animate = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions, ephemeral=false) => { if (reduced || !el.animate || disposed)
        return null; const a = el.animate(frames, options); animations.add(a); if(ephemeral)transient.add(a); a.addEventListener('cancel',()=>{animations.delete(a);transient.delete(a);},{once:true}); a.addEventListener('finish', () => { animations.delete(a); a.cancel(); }, { once: true }); if(!ephemeral)pause(); return a; };
    const entrance = (fn: () => void) => { if (reduced)
        return; if (typeof IntersectionObserver === 'undefined') {
        fn();
        return;
    } const once = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) {
        once.disconnect();
        fn();
    } }); once.observe(host); disposers.push(() => once.disconnect()); };
    const property = (el: HTMLElement, key: string, value: string) => { const before = el.style.getPropertyValue(key), priority = el.style.getPropertyPriority(key); el.style.setProperty(key, value); disposers.push(() => before ? el.style.setProperty(key, before, priority) : el.style.removeProperty(key)); };
    const append = (el: Element) => { host.append(el); nodes.add(el); return el; };
    const remove = (el: Element) => { nodes.delete(el); el.getAnimations?.().forEach(a=>a.cancel()); el.remove(); };
    return { listen, animate, entrance, property, append, remove, isVisible:()=>visible&&!document.hidden, dispose() { disposed = true; nodes.forEach(el => el.remove()); nodes.clear(); io?.disconnect(); animations.forEach(a => a.cancel()); disposers.reverse().forEach(f => f()); } };
}
function LayeredWordWave({ text, effect }: { text: string; effect: MotionInstance }) {
    const container = useRef<HTMLSpanElement>(null), reduced = useReducedMotion();
    const phase = effect.validatedControls.form;
    const words = text.split(/(\s+)/);
    const letters = words.map(word => typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), cell => cell.segment) : Array.from(word));
    const compact = !reduced && letters.flat().length <= 36;
    useEffect(() => {
        const host = container.current;
        if (!host || !compact) return;
        const r = resources(host, reduced), cycle = motionNumber(effect, 'durationMs', 650) * 3;
        const amplitude = motionNumber(effect, 'amplitudePx', 8);
        host.querySelectorAll('.advanced-wave-glyph').forEach((glyph, index) => {
            const frames = phase === 'flag' ? [
                { translate: '0 0', transform: 'skewY(0deg)' },
                { translate: `0 -${amplitude}px`, transform: 'skewY(12deg)' },
                { translate: '0 0', transform: 'skewY(0deg)' },
                { translate: `0 ${amplitude * .5}px`, transform: 'skewY(-12deg)' },
                { translate: '0 0', transform: 'skewY(0deg)' },
            ] : [
                { scale: '1 1' },
                { scale: `1 ${1 + amplitude / 45}`, offset: .32 },
                { scale: `1 ${1 - amplitude / 110}`, offset: .68 },
                { scale: '1 1' },
            ];
            r.animate(glyph, frames, { duration: cycle, delay: -cycle + index % 16 * cycle / 17, iterations: Infinity, easing: 'ease-in-out' });
        });
        return () => r.dispose();
    }, [effect, text, reduced, phase, compact]);
    if (!compact) return <span>{text}</span>;
    return <span ref={container} className="advanced-wave-loop">
        <span className="motion-sr">{text}</span>
        <span aria-hidden="true">{letters.map((word, index) => /^\s+$/u.test(words[index]) ? words[index] :
            <span className="advanced-wave-word" key={index}>{word.map((letter, position) =>
                <span className="advanced-wave-glyph" key={position}>{letter}</span>
            )}</span>)}
        </span>
    </span>;
}
/** Plain text remains the only accessible/selectable source. Transient overlays are aria-hidden. */
export function AdvancedText({ text, effect }: {
    text: string;
    effect: MotionInstance;
}) {
    const layered = effect.presetId === 'kinetic-text-wave' && ['flag', 'stretch-wave'].includes(String(effect.validatedControls.form));
    const ref = useRef<HTMLSpanElement>(null), reduced = useReducedMotion();
    useEffect(() => {
        const host = ref.current;
        if (!host || layered)
            return;
        const source = host.querySelector<HTMLElement>('.advanced-text-source')!;
        const r = resources(host, reduced);
        let frame = 0, overlay: HTMLSpanElement | null = null, finished = false;
        const restore = () => { cancelAnimationFrame(frame); frame = 0; overlay?.getAnimations?.({subtree:true}).forEach(a=>a.cancel()); overlay?.remove(); overlay = null; source.style.removeProperty('opacity'); finished = true; };
        const graphemes = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), s => s.segment) : [];
        const highlight = effect.presetId === 'hand-drawn-highlight';
        if (highlight && effect.validatedControls.stroke === "circle-line") {
            if (reduced) return;
            const namespace = 'http://www.w3.org/2000/svg';
            const diagram = document.createElementNS(namespace, 'svg');
            diagram.classList.add("advanced-circle-line");
            diagram.setAttribute('viewBox', '0 0 160 56');
            diagram.setAttribute('preserveAspectRatio', 'none');
            diagram.setAttribute('aria-hidden', 'true');
            const duration = motionNumber(effect, 'durationMs', 700);
            const paths = ['M15 41 C-12 19 24 3 85 6 C151 7 170 28 139 43 C114 57 53 54 20 45',
                'M12 48 C55 43 98 51 151 45'];
            paths.forEach((d, i) => {
                const path = document.createElementNS(namespace, 'path');
                path.setAttribute('d', d);
                path.setAttribute('pathLength', '100');
                path.setAttribute('vector-effect', 'non-scaling-stroke');
                path.style.strokeDasharray = '100';
                diagram.append(path);
                r.entrance(() => r.animate(path, [{ strokeDashoffset: '100' }, { strokeDashoffset: '0' }], {
                    duration: duration * (i ? .35 : .78), delay: i * duration * .72, fill: 'backwards', easing: 'ease-out',
                }));
            });
            r.append(diagram);
            return () => r.dispose();
        }
        if (highlight) {
            r.property(host, '--advanced-highlight', palette[String(effect.validatedControls.color)] ?? palette.lime);
            r.property(host, '--advanced-highlight-size', `${motionNumber(effect, 'thickness', 55)}%`);
            r.entrance(() => { r.animate(host, [{ backgroundSize: '0% var(--advanced-highlight-size)' }, { backgroundSize: '100% var(--advanced-highlight-size)' }], { duration: motionNumber(effect, 'durationMs', 700), easing: 'cubic-bezier(.2,.7,.2,1)' }); });
            return () => r.dispose();
        }
        const play = () => {
            restore();
            finished = false;
            if (reduced || !graphemes.length || graphemes.length > 100 || !host.animate)
                return;
            const textNode = source.firstChild;
            if (!textNode || textNode.nodeType !== Node.TEXT_NODE)
                return;
            const rect = host.getBoundingClientRect();
            let offset = 0;
            const cells = graphemes.map(letter => { const range = document.createRange(); range.setStart(textNode, offset); offset += letter.length; range.setEnd(textNode, offset); const box = range.getBoundingClientRect(); return { letter, left: box.left - rect.left, top: box.top - rect.top, width: box.width, height: box.height }; });
            overlay = document.createElement('span');
            overlay.className = 'advanced-text-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            host.append(overlay);
            source.style.opacity = '0';
            const make = (className: string, content: string, left: number, top: number, width: number, height: number) => { const el = document.createElement('span'); el.className = className; el.textContent = content; Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }); overlay!.append(el); return el; };
            const duration = motionNumber(effect, 'durationMs', 700), stagger = motionNumber(effect, 'staggerMs', 25);
            let total = duration;
            if (effect.presetId === 'split-line-assembly') {
                const lines: {
                    cells: typeof cells;
                    top: number;
                }[] = [];
                for (const cell of cells) {
                    const line = lines.find(l => Math.abs(l.top - cell.top) < 2);
                    if (line)
                        line.cells.push(cell);
                    else
                        lines.push({ cells: [cell], top: cell.top });
                }
                if (lines.length > 12) {
                    restore();
                    return;
                }
                lines.forEach((line, i) => {
                    const left = Math.min(...line.cells.map(c => c.left)), right = Math.max(...line.cells.map(c => c.left + c.width)), height = Math.max(...line.cells.map(c => c.height));
                    const mask = make('advanced-line-mask', '', left, line.top, right - left + 1, height + 3);
                    const inner = document.createElement('span'); inner.textContent = line.cells.map(c => c.letter).join(''); mask.append(inner);
                    const flow = effect.validatedControls.flow;
                    const begin = flow === 'clarify' ? { opacity: .15, filter: 'blur(5px)' } :
                        { opacity: 0, transform: `translateX(${(i % 2 ? -1 : 1) * motionNumber(effect, 'distancePx', 22)}px)`, filter: 'blur(3px)' };
                    r.animate(inner, [begin, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], {
                        duration, delay: Math.min(900, i * stagger), fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)'
                    });
                });
                total = duration + Math.min(900, (lines.length - 1) * stagger);
            }
            else if (effect.presetId === 'character-decode') {
                const symbols = '<>/#*+=:0123456789';
                const spans = cells.map(c => make('advanced-char', c.letter, c.left, c.top, c.width, c.height));
                const delay = motionNumber(effect, 'characterDelayMs', 35), speed = motionNumber(effect, 'decodeSpeedMs', 45), start = performance.now();
                total = Math.min(3500, cells.length * delay + speed * 4);
                const tick = (now: number) => { if (document.hidden) {
                    restore();
                    return;
                } const elapsed = now - start; cells.forEach((c, i) => { const deadline = Math.min(total, i * delay + speed * 4); const value = elapsed >= deadline ? c.letter : /\s/u.test(c.letter) ? c.letter : symbols[(Math.floor(elapsed / speed) + i * 7) % symbols.length]; if (spans[i].textContent !== value)
                    spans[i].textContent = value; }); if (elapsed < total)
                    frame = requestAnimationFrame(tick);
                else
                    restore(); };
                frame = requestAnimationFrame(tick);
            }
            else {
                cells.forEach((c, i) => { const el = make('advanced-char', c.letter, c.left, c.top, c.width + 1, c.height + 2); const wave = effect.presetId === 'kinetic-text-wave'; if (wave) {
                    r.animate(el, [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(-${motionNumber(effect, 'amplitudePx', 8)}px) rotate(-5deg)`, offset: .35 }, { transform: 'translateY(0) rotate(0)' }], { duration, delay: Math.min(700, i * 25), fill: 'backwards', easing: 'ease-in-out' });
                }
                else {
                    el.classList.add('advanced-roll-mask');
                    el.textContent = '';
                    const reel = document.createElement('span');
                    reel.className = 'advanced-roll-reel';
                    const alternatives = [/\d/.test(c.letter) ? String((Number(c.letter) + 3) % 10) : '↕', c.letter];
                    for (const value of alternatives) {
                        const row = document.createElement('span');
                        row.textContent = value;
                        row.style.height = `${c.height + 2}px`;
                        reel.append(row);
                    }
                    el.append(reel);
                    reel.style.transform = `translateY(-${c.height + 2}px)`;
                    r.animate(reel, [{ transform: `translateY(-${c.height + 2}px)` }, { transform: 'translateY(0)', offset: .15 }, { transform: `translateY(-${c.height + 2}px)` }], { duration, delay: Math.min(900, i * stagger), fill: 'backwards', easing: 'cubic-bezier(.22,.8,.3,1)' });
                } });
                total = duration + Math.min(900, cells.length * (effect.presetId === 'kinetic-text-wave' ? 25 : stagger));
            }
            // RAF lifetime is bounded; it also restores the original text on hidden tabs.
            if (effect.presetId !== 'character-decode') {
                const start = performance.now();
                const end = (now: number) => { if (document.hidden || now - start >= total) {
                    restore();
                    return;
                } frame = requestAnimationFrame(end); };
                frame = requestAnimationFrame(end);
            }
        };
        if (effect.presetId === 'kinetic-text-wave' && effect.validatedControls.trigger === 'hover') {
            const old = host.getAttribute('tabindex');
            host.tabIndex = 0;
            r.listen(host, 'pointerenter', e => { if ((e as PointerEvent).pointerType !== 'touch')
                play(); });
            r.listen(host, 'focus', play);
            r.listen(host, 'click', play);
            r.property(host, 'cursor', 'default');
            r.listen(host, 'keydown', e => { if (['Enter', ' '].includes((e as KeyboardEvent).key)) {
                e.preventDefault();
                play();
            } });
            r.listen(host, 'blur', restore);
            r.listen(host, 'pointerleave', restore);
            const dispose = r.dispose;
            r.dispose = () => { dispose(); if (old === null)
                host.removeAttribute('tabindex');
            else
                host.setAttribute('tabindex', old); };
        }
        else
            r.entrance(play);
        // Resize restores exact native wrapping rather than replaying stale measured lines.
        let initial = true;
        const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (initial) {
            initial = false;
            return;
        } if (!finished)
            restore(); });
        resize?.observe(source);
        return () => { resize?.disconnect(); restore(); r.dispose(); };
    }, [text, effect, reduced, layered]);
    if (layered) return <LayeredWordWave text={text} effect={effect}/>;
    return <span ref={ref} className={'advanced-text ' + (effect.presetId === 'hand-drawn-highlight' && effect.validatedControls.stroke !== 'circle-line' ? 'advanced-highlight' : '')}><span className="advanced-text-source">{text}</span></span>;
}
export function nearestScroller(host: HTMLElement) { let el: HTMLElement | null = host; while (el && !/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY))
    el = el.parentElement; return el; }
export function useAdvancedMotion(node: PageNode, ref: RefObject<HTMLElement | null>) {
    const reduced = useReducedMotion();
    useEffect(() => {
        const host = ref.current;
        if (!host || !node.effects.some(e => advancedHostIds.includes(e.presetId)))
            return;
        const r = resources(host, reduced);
        const find = (id: string) => node.effects.find(e => e.presetId === id), n = (e: MotionInstance, key: string, fallback: number) => motionNumber(e, key, fallback);
        const style = getComputedStyle(host);
        if (node.effects.some(e => advancedHostIds.includes(e.presetId))) {
            if (style.position === 'static')
                r.property(host, 'position', 'relative');
            r.property(host, 'isolation', 'isolate');
        }
        const deco = (cls: string) => { const el = document.createElement('span'); el.className = cls; el.setAttribute('aria-hidden', 'true'); r.append(el); return el; };
        const direct = () => Array.from(host.children).filter((e): e is HTMLElement => e instanceof HTMLElement && !!e.dataset.pageId);
        const hover = (enter: () => void, leave: () => void) => { r.listen(host, 'pointerenter', e => { if ((e as PointerEvent).pointerType !== 'touch')
            enter(); }); r.listen(host, 'pointerleave', () => { if (!host.contains(document.activeElement))
            leave(); }); r.listen(host, 'focusin', enter); r.listen(host, 'focusout', e => { if (!host.contains((e as FocusEvent).relatedTarget as Node))
            leave(); }); r.listen(host, 'pointercancel', leave); };
        const focusable = () => { if (node.type === 'button' || host.hasAttribute('tabindex'))
            return; host.tabIndex = 0; const old = r.dispose; r.dispose = () => { old(); host.removeAttribute('tabindex'); }; };
        const spotlight = find('cursor-spotlight');
        if (spotlight) {
            const el = deco('advanced-spotlight');
            el.style.width = el.style.height = `${n(spotlight, 'radiusPx', 60) * 2}px`;
            el.style.transition = `opacity ${n(spotlight, 'durationMs', 180)}ms`;
            const move = (x: number, y: number) => { el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.opacity = '1'; };
            r.listen(host, 'pointermove', e => { if (reduced || (e as PointerEvent).pointerType === 'touch')
                return; const box = host.getBoundingClientRect(); move(clamp((e as PointerEvent).clientX - box.left, 0, box.width), clamp((e as PointerEvent).clientY - box.top, 0, box.height)); });
            hover(() => { if (!reduced)
                move(host.clientWidth / 2, host.clientHeight / 2); }, () => el.style.opacity = '0');
            r.property(host, 'overflow', 'hidden');
        }
        const liquid = find('liquid-button-fill');
        if (liquid) {
            const el = deco('advanced-liquid');
            el.style.background = palette[String(liquid.validatedControls.color)] ?? palette.lime;
            el.style.transition = reduced ? 'none' : `transform ${n(liquid, 'durationMs', 420)}ms cubic-bezier(.2,.7,.3,1)`;
            hover(() => el.style.transform = 'translateY(0)', () => el.style.transform = 'translateY(105%)');
            r.property(host, 'overflow', 'hidden');
        }
        const ripple = find('radial-ink-ripple');
        if (ripple && !reduced) {
            r.property(host, 'overflow', 'hidden');
            const circles = new Set<HTMLElement>();
            const play = (x: number, y: number) => { if (host.matches(':disabled,[aria-disabled=true]'))
                return; while (circles.size >= 3) {
                const first = circles.values().next().value!;
                r.remove(first);
                circles.delete(first);
            } const el = deco('advanced-ripple'); circles.add(el); const size = 2 * Math.hypot(host.clientWidth, host.clientHeight); Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` }); const a = r.animate(el, [{ transform: 'translate(-50%,-50%) scale(0)', opacity: .22 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], { duration: n(ripple, 'durationMs', 550), easing: 'ease-out' }, true); if (!a) {
                r.remove(el);
                circles.delete(el);
            }
            else
                for(const event of ['finish','cancel'])a.addEventListener(event, () => { r.remove(el); circles.delete(el); }, { once: true }); };
            r.listen(host, 'pointerdown', e => { const p = e as PointerEvent; if (p.button !== 0)
                return; const box = host.getBoundingClientRect(); play(p.clientX - box.left, p.clientY - box.top); });
            r.listen(host, 'keydown', e => { const k = e as KeyboardEvent; if (!k.repeat && ['Enter', ' '].includes(k.key))
                play(host.clientWidth / 2, host.clientHeight / 2); });
        }
        const orbit = find('orbiting-icon');
        if (orbit) {
            const icon = deco('advanced-orbit');
            icon.textContent = '↗';
            let a: Animation | null = null;
            const reset = () => { a?.cancel(); icon.style.transform = 'translate(0,0)'; };
            hover(() => { a?.cancel(); if (reduced)
                return; const sign = orbit.validatedControls.direction === 'clockwise' ? 1 : -1; icon.style.transform = 'translateX(3px)'; a = r.animate(icon, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${sign * 7}px,-8px) rotate(${sign * 15}deg)`, offset: .45 }, { transform: 'translate(3px,0) rotate(0)' }], { duration: n(orbit, 'durationMs', 450), easing: 'cubic-bezier(.2,.7,.2,1)' }); }, reset);
        }
        const trace = find('border-light-trace');
        if (trace) {
            focusable();
            const svg = document.createElementNS(svgNS, 'svg');
            svg.classList.add('advanced-border-svg');
            svg.setAttribute('aria-hidden', 'true');
            const rect = document.createElementNS(svgNS, 'rect');
            for (const [k, v] of Object.entries({ x: '1.5', y: '1.5', width: 'calc(100% - 3px)', height: 'calc(100% - 3px)', rx: String(parseFloat(style.borderRadius) || 8), fill: 'none', stroke: 'currentColor', 'stroke-width': String(n(trace, 'thicknessPx', 2)), pathLength: '100', 'stroke-dasharray': '14 86' }))
                rect.setAttribute(k, v);
            svg.append(rect);
            r.append(svg);
            let a: Animation | null = null;
            hover(() => { a?.cancel(); svg.style.opacity = '1'; a = r.animate(rect, [{ strokeDashoffset: '100' }, { strokeDashoffset: '0' }], { duration: n(trace, 'durationMs', 900), easing: 'linear' }); }, () => { a?.cancel(); svg.style.opacity = '0'; });
        }
        const tilt = find('perspective-tilt');
        if (tilt && !reduced) {
            r.property(host, 'transition', `transform ${n(tilt, 'responseMs', 250)}ms cubic-bezier(.2,.7,.3,1)`);
            const old = host.style.transform;
            r.property(host, 'transform', old);
            const reset = () => host.style.transform = old;
            r.listen(host, 'pointermove', e => { const p = e as PointerEvent; if (p.pointerType === 'touch' || matchMedia('(pointer:coarse)').matches)
                return; const box = host.getBoundingClientRect(), x = clamp((p.clientX - box.left) / box.width) * 2 - 1, y = clamp((p.clientY - box.top) / box.height) * 2 - 1; host.style.transform = `perspective(900px) rotateX(${-y * n(tilt, 'maxAngle', 5)}deg) rotateY(${x * n(tilt, 'maxAngle', 5)}deg)`; });
            for (const ev of ['pointerleave', 'pointercancel', 'blur'])
                r.listen(host, ev, reset);
        }
        const venetian = find('venetian-reveal');
        if (venetian)
            r.entrance(() => { const count = n(venetian, 'strips', 6); const polygon = (t: number) => { const points: string[] = []; for (let i = 0; i < count; i++) {
                const order = venetian.validatedControls.direction === 'reverse' ? count - 1 - i : i, w = clamp(t * (1 + (count - 1) * .1) - order * .1) * 100, y = i * 100 / count, b = (i + 1) * 100 / count;
                points.push(`0% ${y}%`, `${w}% ${y}%`, `${w}% ${b}%`, `0% ${b}%`);
            } return `polygon(${points.join(',')})`; }; r.animate(host, Array.from({ length: 11 }, (_, i) => ({ clipPath: polygon(i / 10) })), { duration: n(venetian, 'durationMs', 850), easing: 'ease-out' }); });
        const circle = find('circular-mask-expansion');
        if (circle)
            r.entrance(() => { const origins: Record<string, string> = { center: '50% 50%', 'top-left': '0% 0%', 'top-right': '100% 0%', 'bottom-left': '0% 100%', 'bottom-right': '100% 100%' }; const at = origins[String(circle.validatedControls.origin)] ?? origins.center; r.animate(host, [{ clipPath: `circle(0% at ${at})` }, { clipPath: `circle(150% at ${at})` }], { duration: n(circle, 'durationMs', 850), easing: 'cubic-bezier(.2,.7,.2,1)' }); });
        const pan = find('cinematic-image-pan');
        if (pan) {
            r.property(host, 'overflow', 'hidden');
            let observer: MutationObserver | null = null;
            r.entrance(() => { const play = () => { const image = host.querySelector('img'); if (!image)
                return false; observer?.disconnect(); const d = pan.validatedControls.direction === 'reverse' ? -1 : 1; r.animate(image, [{ transform: 'scale(1) translate(0,0)' }, { transform: `scale(1.14) translate(${-d * 2}%, -1%)`, offset: .2 }, { transform: `scale(1.09) translate(${d * 2}%, 1%)`, offset: .8 }, { transform: 'scale(1) translate(0,0)' }], { duration: n(pan, 'durationMs', 6000), iterations: n(pan, 'iterations', 1), easing: 'ease-in-out', direction: 'alternate' }); return true; }; if (!play() && typeof MutationObserver !== 'undefined') {
                observer = new MutationObserver(play);
                observer.observe(host, { childList: true, subtree: true });
            } });
            const dispose = r.dispose;
            r.dispose = () => { observer?.disconnect(); dispose(); };
        }
        const fan = find('card-deck-fan');
        if (fan) {
            r.property(host, 'overflow', 'clip');
            focusable();
            const children = direct().slice(0, 12);
            for (const el of children) {
                r.property(el, 'transition', reduced ? 'none' : `transform ${n(fan, 'durationMs', 320)}ms cubic-bezier(.2,.8,.3,1)`);
                r.property(el, 'transform-origin', '50% 85%');
                r.property(el, 'transform', el.style.transform);
            }
            const originals = children.map(el => el.style.transform);
            hover(() => { if (reduced)
                return; children.forEach((el, i) => { const signed = (i - (children.length - 1) / 2) / Math.max(1, (children.length - 1) / 2); el.style.transform = `translateX(${signed * n(fan, 'distancePx', 8)}px) rotate(${signed * n(fan, 'angle', 4)}deg)`; }); }, () => children.forEach((el, i) => el.style.transform = originals[i]));
        }
        const diagonal = find('grid-diagonal-turn');
        if (diagonal) r.entrance(() => {
            const children = direct().slice(0, 24);
            const boxes = children.map(el => el.getBoundingClientRect());
            const xs = [...new Set(boxes.map(b => Math.round(b.left)))].sort((a, b) => a - b);
            const ys = [...new Set(boxes.map(b => Math.round(b.top)))].sort((a, b) => a - b);
            const interval = n(diagonal, 'staggerMs', 80), order = diagonal.validatedControls.order;
            children.forEach((el, i) => {
                const col = xs.indexOf(Math.round(boxes[i].left)), row = ys.indexOf(Math.round(boxes[i].top));
                const fromCenter = Math.hypot(col - (xs.length - 1) / 2, row - (ys.length - 1) / 2);
                const rank = order === 'center' ? Math.abs(col - (xs.length - 1) / 2) + Math.abs(row - (ys.length - 1) / 2) : order === 'column' ? col * ys.length + row : row * xs.length + col;
                const radial = diagonal.validatedControls.motion === 'radial';
                const delay = Math.min(1000, (radial ? fromCenter : (order === 'center' ? rank : rank * .3) + row + col) * interval);
                const frames = radial ? [
                    { scale: '.74', opacity: .32 }, { scale: '1.065', opacity: 1, offset: .66 }, { scale: '1', opacity: 1 },
                ] : [{ opacity: 0, transform: 'perspective(800px) rotateX(-35deg) translateY(8px)' }, { opacity: 1, transform: 'perspective(800px) rotateX(0) translateY(0)' }];
                r.animate(el, frames, { duration: n(diagonal, 'durationMs', 600), delay, fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)' });
            });
        });
        const path = find('svg-path-drawing'), gauge = find('numeric-gauge-sweep');
        if (path || gauge) {
            const e = (path ?? gauge)!;
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('viewBox', gauge ? '0 0 120 66' : '0 0 120 36');
            svg.setAttribute('aria-hidden', 'true');
            svg.classList.add(gauge ? 'advanced-gauge' : 'advanced-path');
            const line = document.createElementNS(svgNS, 'path');
            const paths: Record<string, string> = { curve: 'M3 28 C25 2 40 34 65 16 S100 4 117 14', arrow: 'M4 22 Q50 2 110 18 M98 6 L111 18 L96 28', check: 'M20 18 L49 30 L99 5' };
            line.setAttribute('d', gauge ? 'M6 60 A54 54 0 0 1 114 60' : paths[String(e.validatedControls.shape)] ?? paths.curve);
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke', gauge ? 'currentColor' : palette[String(e.validatedControls.color)] ?? 'currentColor');
            line.setAttribute('stroke-width', String(n(e, 'thicknessPx', gauge ? 5 : 2)));
            line.setAttribute('stroke-linecap', 'round');
            line.setAttribute('pathLength', '100');
            line.style.strokeDasharray = '100';
            const value = gauge ? clamp(Number((node.content ?? '').replace(/[%％,\s]/g, '')) / 100) : 1;
            line.style.strokeDashoffset = String(100 - value * 100);
            svg.append(line);
            r.append(svg);
            let draw: Animation | null = null, lift: Animation | null = null;
            const drawLine = () => {
                draw?.cancel();
                lift?.cancel();
                const duration = n(e, 'durationMs', 1000);
                draw = r.animate(line, [{ strokeDashoffset: '100' }, { strokeDashoffset: String(100 - value * 100) }], { duration, easing: 'cubic-bezier(.2,.7,.2,1)' });
                if (path?.validatedControls.trigger === 'redraw')
                    lift = r.animate(svg, [{ translate: '0px 0px' }, { translate: '0px -4px', offset: .4 }, { translate: '0px 0px' }], { duration });
            };
            if (path?.validatedControls.trigger === 'redraw' && !reduced) {
                focusable();
                hover(drawLine, () => {});
                r.listen(host, 'pointerup', event => { if ((event as PointerEvent).pointerType === 'touch') drawLine(); });
            } else r.entrance(drawLine);
        }
        const parallax = find('layered-parallax'), milestones = find('scroll-milestones');
        if (parallax || milestones) {
            const scroller = nearestScroller(host), target: EventTarget = scroller ?? window;
            let frame = 0;
            const layers = parallax && !reduced ? direct().slice(0, 3) : [], old = layers.map(el => el.style.translate);
            for (const el of layers)
                r.property(el, 'translate', el.style.translate);
            const ribbon = milestones ? deco('advanced-milestones') : null;
            if (ribbon) {
                ribbon.dataset.orientation = String(milestones!.validatedControls.orientation);
                ribbon.setAttribute('role', 'meter');
                ribbon.removeAttribute('aria-hidden');
                ribbon.setAttribute('aria-label', '區塊閱讀里程碑');
                ribbon.setAttribute('aria-valuemin', '0');
                ribbon.setAttribute('aria-valuemax', String(n(milestones!, 'steps', 5)));
                for (let i = 0; i < n(milestones!, 'steps', 5); i++)
                    ribbon.append(document.createElement('i'));
            }
            const update = () => {
                frame = 0;
                const box = host.getBoundingClientRect(), viewport = scroller?.getBoundingClientRect(), top = viewport ? viewport.top + scroller!.clientTop : 0, height = scroller?.clientHeight ?? innerHeight;
                const progress = clamp(scroller === host ? host.scrollTop / Math.max(1, host.scrollHeight - host.clientHeight) : (top + height - box.top) / Math.max(1, box.height + height));
                if (ribbon) {
                    const steps = n(milestones!, 'steps', 5), complete = Math.min(steps, Math.floor(progress * steps));
                    ribbon.setAttribute('aria-valuenow', String(complete));
                    Array.from(ribbon.children).forEach((el, i) => el.setAttribute('data-complete', String(i < complete)));
                    ribbon.style.translate = `0 ${scroller === host ? host.scrollTop : clamp(top - box.top - host.clientTop, 0, Math.max(0, host.clientHeight - 24))}px`;
                }
                layers.forEach((el, i) => el.style.translate = reduced ? old[i] : `0 ${clamp((progress - .5) * 2, -1, 1) * n(parallax!, 'distancePx', 12) * (i - 1)}px`);
            };
            const schedule = () => { if (!frame && !document.hidden)
                frame = requestAnimationFrame(update); };
            r.listen(target, 'scroll', schedule);
            r.listen(window, 'resize', schedule);
            r.listen(document, 'visibilitychange', () => { if (document.hidden) {
                cancelAnimationFrame(frame);
                frame = 0;
            }
            else
                schedule(); });
            const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
            resize?.observe(host);
            if (scroller)
                resize?.observe(scroller);
            update();
            const dispose = r.dispose;
            r.dispose = () => { cancelAnimationFrame(frame); resize?.disconnect(); dispose(); };
        }
        return () => r.dispose();
    }, [node, ref, reduced]);
}
const advancedHostIds = ['cursor-spotlight', 'liquid-button-fill', 'radial-ink-ripple', 'orbiting-icon', 'border-light-trace', 'perspective-tilt', 'venetian-reveal', 'circular-mask-expansion', 'cinematic-image-pan', 'card-deck-fan', 'layered-parallax', 'grid-diagonal-turn', 'svg-path-drawing', 'numeric-gauge-sweep', 'scroll-milestones'];
export const advancedTextIds = ['character-decode', 'split-line-assembly', 'rolling-characters', 'hand-drawn-highlight', 'kinetic-text-wave'];

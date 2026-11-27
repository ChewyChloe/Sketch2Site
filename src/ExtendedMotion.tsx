import { Children, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { PageNode } from './pageSpec';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';

// All observation and animation resources belong to the mounted instance.
function onceVisible(element: HTMLElement, start: () => void) {
    if (typeof IntersectionObserver === 'undefined') { start(); return () => {}; }
    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); start(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
}
function useEntrance(ref: RefObject<HTMLElement | null>, effect: MotionInstance, reduced: boolean, frames: (element: HTMLElement) => Animation[]) {
    const played = useRef(false);
    const latestFrames = useRef(frames);
    useEffect(() => { latestFrames.current = frames; });
    useEffect(() => {
        const element = ref.current;
        if (!element || reduced || played.current || !element.animate) return;
        let animations: Animation[] = [];
        const stop = onceVisible(element, () => { played.current = true; animations = latestFrames.current(element); });
        return () => { stop(); animations.forEach(animation => animation.cancel()); };
    }, [ref, effect, reduced]);
}
export function useExtendedMotion(node: PageNode, ref: RefObject<HTMLElement | null>) {
    const reduced = useReducedMotion();
    const revealed = useRef(false);
    useEffect(() => {
        const host = ref.current;
        if (!host) return;
        const cleanups: (() => void)[] = [];
        const find = (id: string) => node.effects.find(effect => effect.presetId === id);
        const property = (element: HTMLElement, name: string, value: string) => {
            const old = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name);
            element.style.setProperty(name, value);
            cleanups.push(() => { if (old) element.style.setProperty(name, old, priority); else element.style.removeProperty(name); });
        };
        const className = (name: string) => { const existed = host.classList.contains(name); host.classList.add(name); cleanups.push(() => { if (!existed) host.classList.remove(name); }); };
        const listen = (target: EventTarget, name: string, handler: EventListener) => {
            target.addEventListener(name, handler); cleanups.push(() => target.removeEventListener(name, handler));
        };
        const image = find('image-reveal');
        if (image && !reduced && !revealed.current && host.animate) {
            let animation: Animation | undefined;
            cleanups.push(onceVisible(host, () => {
                revealed.current = true;
                animation = host.animate([{ clipPath: image.validatedControls.direction === 'vertical' ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', opacity: 0 }, { clipPath: 'inset(0 0% 0 0)', opacity: 1 }], { duration: motionNumber(image, 'durationMs', 600), easing: 'ease-out' });
            }), () => animation?.cancel());
        }
        const magnet = find('magnetic-control');
        if (magnet && !reduced) {
            const strength = Math.max(0, Math.min(24, motionNumber(magnet, 'strengthPx', 6)));
            property(host, '--extended-magnet-x', '0px'); property(host, '--extended-magnet-y', '0px');
            property(host, '--extended-response', `${motionNumber(magnet, 'responseMs', 180)}ms`);
            className('extended-magnetic');
            const reset = () => { host.style.setProperty('--extended-magnet-x', '0px'); host.style.setProperty('--extended-magnet-y', '0px'); };
            listen(host, 'pointermove', event => {
                const pointer = event as PointerEvent;
                if (pointer.pointerType === 'touch' || host.matches(':disabled,[aria-disabled=true]') || host.contains(host.ownerDocument.activeElement)) { reset(); return; }
                const rect = host.getBoundingClientRect();
                host.style.setProperty('--extended-magnet-x', `${Math.max(-1, Math.min(1, (pointer.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1)) * strength}px`);
                host.style.setProperty('--extended-magnet-y', `${Math.max(-1, Math.min(1, (pointer.clientY - rect.top) / Math.max(1, rect.height) * 2 - 1)) * strength}px`);
            });
            for (const event of ['pointerleave', 'pointercancel', 'focusin', 'focusout']) listen(host, event, reset);
        }
        const press = find('press-feedback');
        if (press) {
          if(!reduced){
            className('extended-press');
            property(host, '--extended-press-scale', String(motionNumber(press, 'scale', .97)));
            property(host, '--extended-press-duration', `${motionNumber(press, 'durationMs', 140)}ms`);
          }
            const previousPressed = host.getAttribute('data-extended-pressed');
            const oldTab = host.getAttribute('tabindex');
            if (node.type === 'card' && oldTab === null) host.tabIndex = 0;
            const reset = () => host.removeAttribute('data-extended-pressed');
            listen(host, 'keydown', event => {
                const key = event as KeyboardEvent;
                if (key.target === host && (key.key === 'Enter' || key.key === ' ') && !key.altKey && !key.ctrlKey && !key.metaKey && !host.matches(':disabled,[aria-disabled=true]')) host.setAttribute('data-extended-pressed', 'true');
            });
            // Do not prevent default: links and buttons retain their native activation.
            listen(host.ownerDocument, 'keyup', event => { if (['Enter', ' '].includes((event as KeyboardEvent).key)) reset(); });
            for (const event of ['blur', 'pointercancel', 'pointerup', 'pointerleave']) listen(host, event, reset);
            listen(window, 'blur', reset);
            cleanups.push(() => {
                if (previousPressed === null) host.removeAttribute('data-extended-pressed'); else host.setAttribute('data-extended-pressed', previousPressed);
                if (node.type === 'card') { if (oldTab === null) host.removeAttribute('tabindex'); else host.setAttribute('tabindex', oldTab); }
            });
        }
        const focus = find('focus-transfer');
        if (focus) {
            const children = Array.from(host.children).filter((child): child is HTMLElement => child instanceof HTMLElement && !!child.dataset.pageId);
            const tabs = children.map(child => child.getAttribute('tabindex'));
            const animations = new Map<HTMLElement, Animation>();
            const originals = children.map(child => ({ opacity: child.style.getPropertyValue('opacity'), priority: child.style.getPropertyPriority('opacity') }));
            children.forEach(child => { if (!child.hasAttribute('tabindex')) child.tabIndex = 0; });
            const update = (active: HTMLElement | null) => children.forEach((child, index) => {
                const before = getComputedStyle(child).opacity;
                animations.get(child)?.cancel();
                const original = originals[index];
                if (reduced || !active || child === active) {
                    if (original.opacity) child.style.setProperty('opacity', original.opacity, original.priority); else child.style.removeProperty('opacity');
                } else child.style.opacity = String(motionNumber(focus, 'inactiveOpacity', .5));
                if (!reduced && child.animate) animations.set(child, child.animate([{ opacity: before }, { opacity: getComputedStyle(child).opacity }], { duration: motionNumber(focus, 'durationMs', 200) }));
            });
            const childFor = (target: EventTarget | null) => children.find(child => target instanceof Node && child.contains(target)) ?? null;
            const current = () => childFor(host.ownerDocument.activeElement);
            listen(host, 'focusin', event => update(childFor(event.target)));
            listen(host, 'focusout', event => update(childFor((event as FocusEvent).relatedTarget)));
            listen(host, 'pointerover', event => { if ((event as PointerEvent).pointerType !== 'touch') update(current() ?? childFor(event.target)); });
            listen(host, 'pointerleave', () => update(current()));
            listen(host, 'keydown', event => {
                const key = event as KeyboardEvent, active = childFor(key.target), index = active ? children.indexOf(active) : -1;
                if (key.target !== active || !children.length || key.altKey || key.ctrlKey || key.metaKey) return;
                const next = key.key === 'Home' ? 0 : key.key === 'End' ? children.length - 1 : ['ArrowRight', 'ArrowDown'].includes(key.key) ? (index + 1) % children.length : ['ArrowLeft', 'ArrowUp'].includes(key.key) ? (index - 1 + children.length) % children.length : -1;
                if (next >= 0) { key.preventDefault(); children[next].focus(); }
            });
            update(current());
            cleanups.push(() => {
                animations.forEach(animation => animation.cancel());
                children.forEach((child, index) => {
                    const tab = tabs[index], original = originals[index];
                    if (tab === null) child.removeAttribute('tabindex'); else child.setAttribute('tabindex', tab);
                    if (original.opacity) child.style.setProperty('opacity', original.opacity, original.priority); else child.style.removeProperty('opacity');
                });
            });
        }
        const progressEffect = find('scroll-progress');
        if (progressEffect && !reduced) {
            className('extended-progress-host');
            property(host, '--extended-progress-thickness', `${motionNumber(progressEffect, 'thicknessPx', 3)}px`);
            let scroller: HTMLElement | null = host;
            while (scroller && !/(auto|scroll|overlay)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
            const scrollTarget: EventTarget = scroller ?? window;
            const bar = host.ownerDocument.createElement('span');
            bar.className = 'extended-progress'; bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-label', '區段閱讀進度'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
            const fill = host.ownerDocument.createElement('span'); bar.append(fill); host.append(bar);
            const update = () => {
                const rect = host.getBoundingClientRect(), viewport = scroller?.getBoundingClientRect();
                const top = viewport ? viewport.top + scroller!.clientTop : 0, height = scroller?.clientHeight ?? window.innerHeight;
                const progress = Math.max(0, Math.min(1, scroller === host
                    ? host.scrollTop / Math.max(1, host.scrollHeight - host.clientHeight)
                    : (top + height - rect.top) / Math.max(1, rect.height + height)));
                // Position the overlay inside the visible part of this target. For a
                // self-scroller its absolute origin scrolls with content, so compensate
                // with scrollTop; ancestor scrolling uses the section's viewport offset.
                const thickness = motionNumber(progressEffect, 'thicknessPx', 3);
                const offset = scroller === host ? host.scrollTop : Math.max(0, Math.min(
                    Math.max(0, host.clientHeight - thickness), top - rect.top - host.clientTop,
                ));
                bar.style.transform = `translateY(${offset}px)`;
                bar.setAttribute('aria-valuenow', String(Math.round(progress * 100))); fill.style.transform = `scaleX(${progress})`;
            };
            listen(scrollTarget, 'scroll', update); listen(window, 'resize', update);
            let observer: ResizeObserver | undefined;
            if (typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(update); observer.observe(host); if (scroller) observer.observe(scroller); }
            update(); cleanups.push(() => { observer?.disconnect(); bar.remove(); });
        }
        return () => { cleanups.reverse().forEach(cleanup => cleanup()); };
    }, [node, ref, reduced]);
}

// Letters are grouped into phrases ending at punctuation or spaces, so lines break
// between phrases (keeping CJK words whole) instead of between any two letters.
function phrases(letters: string[]): [string, number][][] {
    const out: [string, number][][] = [[]];
    letters.forEach((letter, index) => {
        out[out.length - 1].push([letter, index]);
        if (/^[\s，。、！？；：,.!?;:]$/u.test(letter)) out.push([]);
    });
    return out.filter((p) => p.length);
}
export function LetterAssembly({ text, effect }: { text: string; effect: MotionInstance }) {
    const ref = useRef<HTMLSpanElement>(null), reduced = useReducedMotion();
    const graphemes = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), part => part.segment)
        : null;
    const fallback = !graphemes || graphemes.length > 100;
    useEntrance(ref, effect, reduced, element => fallback ? [] : Array.from(element.querySelectorAll<HTMLElement>('.extended-letter')).map((letter, index) => letter.animate([
        { opacity: 0, transform: `translateY(${motionNumber(effect, 'distancePx', 12)}px)` }, { opacity: 1, transform: 'translateY(0)' },
    ], { duration: motionNumber(effect, 'durationMs', 600), delay: Math.min(1200, index * motionNumber(effect, 'intervalMs', 35)), fill: 'backwards', easing: 'ease-out' })));
    return <span ref={ref} className="extended-letters">{fallback ? text : <><span className="motion-sr">{text}</span><span aria-hidden="true">{phrases(graphemes ?? []).map((phrase, p) => <span className="extended-phrase" aria-hidden="true" key={p}>{phrase.map(([letter, index]) => <span className="extended-letter" key={index}>{letter}</span>)}</span>)}</span></>}</span>;
}
export function AccentStroke({ text, effect }: { text: string; effect: MotionInstance }) {
    const ref = useRef<HTMLSpanElement>(null), reduced = useReducedMotion();
    useEntrance(ref, effect, reduced, element => {
        const stroke = element.querySelector<HTMLElement>('.extended-stroke-line');
        return stroke?.animate ? [stroke.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: motionNumber(effect, 'durationMs', 600), easing: 'ease-out' })] : [];
    });
    return <span ref={ref} className="extended-stroke">{text}<span aria-hidden="true" className="extended-stroke-line" style={{ height: `${motionNumber(effect, 'thicknessPx', 2)}px` }} /></span>;
}
export function DisclosurePanel({ effect, children }: { effect: MotionInstance; children: ReactNode }) {
    const [open, setOpen] = useState(false), reduced = useReducedMotion(), id = useId();
    const ref = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null), animation = useRef<Animation | null>(null);
    const parts = Children.toArray(children);
    useEffect(() => {
        const panel = ref.current;
        animation.current?.cancel(); animation.current = null;
        if (panel && open && !reduced && panel.animate) animation.current = panel.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: motionNumber(effect, 'durationMs', 240), easing: 'ease-out' });
        return () => { animation.current?.cancel(); animation.current = null; };
    }, [open, reduced, effect]);
    return <div className="extended-disclosure">{parts[0]}{parts.length > 1 && <><button ref={button} type="button" className="motion-toggle" aria-expanded={open} aria-controls={id} onClick={() => {
        if (open && ref.current?.contains(document.activeElement)) button.current?.focus();
        animation.current?.cancel(); setOpen(value => !value);
    }}>{open ? '收合內容' : '展開內容'}</button><div ref={ref} id={id} className="extended-disclosure-content" hidden={!open} inert={!open}>{parts.slice(1)}</div></>}</div>;
}

export function TabbedPanels({ effect, labels, children }: { effect: MotionInstance; labels: string[]; children: ReactNode }) {
    const id = useId(), reduced = useReducedMotion(), duration = motionNumber(effect, 'durationMs', 240);
    const parts = Children.toArray(children);
    const [selection, setSelection] = useState({ current: 0, outgoing: -1 });
    const current = Math.min(selection.current, parts.length - 1);
    const tablist = useRef<HTMLDivElement>(null), bar = useRef<HTMLSpanElement>(null);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const panels = useRef<(HTMLDivElement | null)[]>([]);
    useEffect(() => {
        const tab = tabs.current[current], marker = bar.current;
        if (!tab || !marker) return;
        const placeMarker = () => {
            marker.style.translate = tab.offsetLeft + 'px';
            marker.style.width = tab.offsetWidth + 'px';
        };
        placeMarker();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placeMarker);
        if (tablist.current) observer?.observe(tablist.current);
        observer?.observe(tab);
        return () => observer?.disconnect();
    }, [current]);
    useEffect(() => {
        const next = panels.current[current], previous = panels.current[selection.outgoing];
        if (selection.outgoing < 0) return;
        if (!next || !previous || reduced || !next.animate) {
            setSelection(value => ({ ...value, outgoing: -1 }));
            return;
        }
        const direction = selection.outgoing < current ? 1 : -1;
        const incoming = next.animate([{ translate: direction * 28 + 'px', opacity: 0 }, { translate: '0px', opacity: 1 }], { duration, easing: 'ease-out' });
        const outgoing = previous.animate([{ translate: '0px', opacity: 1 }, { translate: direction * -28 + 'px', opacity: 0 }], { duration, easing: 'ease-in' });
        outgoing.onfinish = () => setSelection(value => ({ ...value, outgoing: -1 }));
        return () => { outgoing.onfinish = null; incoming.cancel(); outgoing.cancel(); };
    }, [current, selection.outgoing, duration, reduced]);

    if (parts.length !== labels.length || !labels.every(Boolean)) return children;
    const choose = (index: number) => {
        if (index === current) return;
        setSelection({ current: index, outgoing: reduced || !panels.current[index]?.animate ? -1 : current });
    };
    return <div className="extended-tabs" style={{ '--tab-duration': duration + 'ms' } as React.CSSProperties}>
        <div className="extended-tabs-rail">
            <div className="extended-tabs-list" ref={tablist} role="tablist" aria-label="內容分頁">
                {labels.map((label, i) => <button key={i} ref={node => { tabs.current[i] = node; }} type="button"
                    id={id + '-tab-' + i} role="tab" aria-controls={id + '-panel-' + i} aria-selected={current === i}
                    tabIndex={current === i ? 0 : -1} onClick={() => choose(i)} onKeyDown={event => {
                        let index: number;
                        switch (event.key) {
                            case 'ArrowRight': index = (i + 1) % labels.length; break;
                            case 'ArrowLeft': index = (i + labels.length - 1) % labels.length; break;
                            case 'Home': index = 0; break;
                            case 'End': index = labels.length - 1; break;
                            default: return;
                        }
                        event.preventDefault();
                        tabs.current[index]?.focus();
                        choose(index);
                    }}>{label}</button>)}
                <span ref={bar} className="extended-tabs-marker" aria-hidden="true" />
            </div>
        </div>
        <div className="extended-tabs-panels">
            {parts.map((part, i) => {
                const active = i === current, outgoing = !reduced && i === selection.outgoing;
                return <div key={i} ref={node => { panels.current[i] = node; }} id={id + '-panel-' + i}
                    role="tabpanel" aria-labelledby={id + '-tab-' + i} tabIndex={active ? 0 : -1}
                    hidden={!active && !outgoing} inert={!active} aria-hidden={!active}
                    data-outgoing={outgoing ? '' : undefined}>{part}</div>;
            })}
        </div>
    </div>;
}

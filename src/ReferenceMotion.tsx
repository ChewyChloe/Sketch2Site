import { useEffect, type RefObject } from 'react';
import type { PageNode } from './pageSpec';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { resources } from './AdvancedMotion';
import { referenceMotionIds } from './motionCatalog';

// Reference batch 1 (2026-11-27). Specs: referenceMotions.ts. Same rules as every preset:
// the user's text and pictures stay real (selectable, readable by screen readers),
// decorations are aria-hidden, nothing runs off-screen, reduced motion gets a still
// version, and the cleanup restores the element exactly.

const segmentsOf = (text: string, granularity: 'word' | 'grapheme') =>
    typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter(undefined, { granularity }).segment(text), s => s.segment)
        : granularity === 'word' ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);

export function useReferenceMotion(node: PageNode, ref: RefObject<HTMLElement | null>, urls: Readonly<Record<string, string | null>> = {}) {
    const reduced = useReducedMotion();
    const assetKey = JSON.stringify(Object.entries(urls).sort(([a], [b]) => a.localeCompare(b)));
    useEffect(() => {
        const host = ref.current;
        const own = node.effects.filter(e => (referenceMotionIds as readonly string[]).includes(e.presetId));
        if (!host || !own.length) return;
        const r = resources(host, reduced);
        const find = (id: string) => own.find(e => e.presetId === id);
        const n = (e: MotionInstance, key: string, fallback: number) => motionNumber(e, key, fallback);
        const style = getComputedStyle(host);
        const cleanups: (() => void)[] = [];
        const addClass = (cls: string) => { host.classList.add(cls); cleanups.push(() => host.classList.remove(cls)); };
        if (style.position === 'static') r.property(host, 'position', 'relative');
        const deco = (cls: string) => { const el = document.createElement('span'); el.className = cls; el.setAttribute('aria-hidden', 'true'); r.append(el); return el; };
        const on = (value: boolean) => { if (value) host.setAttribute('data-ref-on', ''); else host.removeAttribute('data-ref-on'); };
        cleanups.push(() => host.removeAttribute('data-ref-on'));
        // Hover and keyboard focus turn the effect on; a tap toggles it on touch screens.
        const hoverToggle = () => {
            r.listen(host, 'pointerenter', e => { if ((e as PointerEvent).pointerType !== 'touch') on(true); });
            r.listen(host, 'pointerleave', e => { if ((e as PointerEvent).pointerType !== 'touch') on(false); });
            r.listen(host, 'focusin', () => on(true));
            r.listen(host, 'focusout', () => on(false));
            r.listen(host, 'pointerup', e => { if ((e as PointerEvent).pointerType === 'touch') on(!host.hasAttribute('data-ref-on')); });
        };
        const text = (host.textContent ?? '').trim();

        // Dolly frame: the picture moves closer inside its own frame; the alt text rises as a caption.
        const dolly = find('dolly-frame');
        if (dolly) {
            addClass('ref-dolly');
            r.property(host, 'overflow', 'hidden');
            r.property(host, '--ref-zoom', String(reduced ? 1 : n(dolly, 'zoom', 1.08)));
            r.property(host, '--ref-ms', `${n(dolly, 'durationMs', 600)}ms`);
            if (dolly.validatedControls.caption !== false && node.alt?.trim()) {
                const caption = deco('ref-caption');
                caption.textContent = node.alt.trim();
            }
            hoverToggle();
        }

        // Color wake: muted until hovered or focused; on screens without hover, when it reaches mid-screen.
        const wake = find('color-wake');
        if (wake) {
            addClass('ref-wake');
            r.property(host, '--ref-muted', String(n(wake, 'muted', 0.85)));
            r.property(host, '--ref-ms', reduced ? '0ms' : `${n(wake, 'durationMs', 500)}ms`);
            if (typeof matchMedia === 'function' && matchMedia('(hover: none)').matches && typeof IntersectionObserver !== 'undefined') {
                const io = new IntersectionObserver(es => on(es.some(e => e.isIntersecting)), { rootMargin: '-35% 0px -35% 0px' });
                io.observe(host);
                cleanups.push(() => io.disconnect());
            } else hoverToggle();
        }

        // Ink as you read: an aria-hidden copy of the words darkens with scroll progress.
        const ink = find('scroll-ink-words');
        if (ink && text && !reduced) {
            const words = segmentsOf(text, 'word');
            if (words.length <= 600) {
                const layer = deco('ref-ink');
                const spans = words.map(w => { const s = document.createElement('span'); s.textContent = w; layer.append(s); return s; });
                layer.style.color = style.color;
                r.property(host, 'color', 'transparent');
                const dim = n(ink, 'dim', 0.22), long = ink.validatedControls.range === 'long';
                let frame = 0;
                const paint = () => {
                    frame = 0;
                    const box = host.getBoundingClientRect(), vh = window.innerHeight || 800;
                    // Starts when the top reaches 85% of the screen; done when the bottom passes 55% (or 35%).
                    const start = vh * 0.85, end = vh * (long ? 0.35 : 0.55);
                    const p = Math.min(1, Math.max(0, (start - box.top) / Math.max(1, start - end + box.height)));
                    const lit = p * spans.length;
                    spans.forEach((s, i) => { s.style.opacity = String(dim + (1 - dim) * Math.min(1, Math.max(0, lit - i))); });
                };
                const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
                document.addEventListener('scroll', schedule, { capture: true, passive: true });
                window.addEventListener('resize', schedule);
                paint();
                cleanups.push(() => { cancelAnimationFrame(frame); document.removeEventListener('scroll', schedule, { capture: true }); window.removeEventListener('resize', schedule); });
            }
        }

        // Hollow to solid: outline first, then a solid fill sweeps in from the left.
        const hollow = find('hollow-fill-sweep');
        if (hollow && !reduced) {
            addClass('ref-hollow');
            r.property(host, '--ref-ink', style.color);
            r.property(host, '--ref-stroke', `${n(hollow, 'strokePx', 2)}px`);
            r.property(host, '--ref-ms', `${n(hollow, 'durationMs', 700)}ms`);
            if (hollow.validatedControls.trigger === 'in-view') r.entrance(() => { window.setTimeout(() => on(true), 150); });
            else hoverToggle();
        }

        // Letter windows: the letters are filled with a photo that drifts slowly.
        const windows = find('letter-windows');
        if (windows) {
            const src = String(windows.validatedControls.image ?? '');
            const url = urls[src] || (src.startsWith('/assets/samples/') || src.startsWith('/assets/sequence/') ? import.meta.env.BASE_URL + src.slice(1) : '');
            if (url) {
                addClass('ref-windows');
                // The solid layer under the photo keeps the words visible if the photo fails to load.
                r.property(host, 'background-image', `url("${url.replace(/["\\\n]/g, '')}"), linear-gradient(${style.color}, ${style.color})`);
                if (windows.validatedControls.outline !== false) r.property(host, '-webkit-text-stroke', `max(.5px, .012em) ${style.color}`);
                if (!reduced) r.animate(host, [{ backgroundPosition: '0% 30%, 0 0' }, { backgroundPosition: '100% 70%, 0 0' }], { duration: n(windows, 'cycleSeconds', 16) * 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
            }
        }

        // Bold relay: weight passes from letter to letter on an aria-hidden copy.
        const relay = find('bold-relay');
        if (relay && text && !reduced) {
            const letters = segmentsOf(text, 'grapheme');
            if (letters.length <= 80) {
                const layer = deco('ref-relay');
                layer.style.color = style.color;
                r.property(host, 'color', 'transparent');
                const base = Number(style.fontWeight) || 400, peak = n(relay, 'peakWeight', 800);
                const low = base >= peak ? 300 : base, high = base >= peak ? base : peak;
                const cycle = n(relay, 'cycleMs', 2400), step = n(relay, 'stepMs', 90);
                letters.forEach((ch, i) => {
                    const s = document.createElement('span');
                    s.textContent = ch;
                    s.style.fontWeight = String(base);
                    layer.append(s);
                    if (/\S/.test(ch)) r.animate(s, [{ fontWeight: low }, { fontWeight: high, offset: 0.25 }, { fontWeight: low, offset: 0.5 }, { fontWeight: low }], { duration: cycle, delay: i * step, iterations: Infinity, easing: 'ease-in-out' });
                });
            }
        }

        // Chart build-up: bars grow from the baseline, the line draws, slices fill in.
        const chart = find('chart-build');
        if (chart && !reduced) {
            r.entrance(() => {
                const svg = host.querySelector<SVGSVGElement>('.media-chart svg');
                if (!svg) return;
                const ms = n(chart, 'durationMs', 900), step = n(chart, 'stepMs', 90);
                const ease = 'cubic-bezier(.2,.75,.25,1)';
                const after = (el: Element, delay: number) => r.animate(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay, easing: 'ease-out', fill: 'backwards' });
                const axis = svg.querySelector<SVGLineElement>('.chart-axis');
                const baseY = axis ? Number(axis.getAttribute('y1')) : NaN;
                svg.querySelectorAll<SVGRectElement>('rect.chart-bar').forEach((bar, i) => {
                    const below = Number(bar.getAttribute('y')) >= baseY - 0.5 && Number.isFinite(baseY);
                    bar.style.transformBox = 'fill-box';
                    bar.style.transformOrigin = below ? '50% 0%' : '50% 100%';
                    cleanups.push(() => { bar.style.removeProperty('transform-box'); bar.style.removeProperty('transform-origin'); });
                    r.animate(bar, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.04)', offset: 0.8 }, { transform: 'scaleY(1)' }], { duration: ms, delay: i * step, easing: ease, fill: 'backwards' });
                    const value = bar.parentElement?.querySelector('.chart-value');
                    if (value) after(value, i * step + ms * 0.7);
                });
                const line = svg.querySelector<SVGPolylineElement>('polyline.chart-line');
                if (line) {
                    const length = typeof line.getTotalLength === 'function' ? line.getTotalLength() : 2000;
                    r.animate(line, [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}` }, { strokeDasharray: `${length}`, strokeDashoffset: '0' }], { duration: ms, easing: 'ease-in-out', fill: 'backwards' });
                    const dots = svg.querySelectorAll('.chart-dot');
                    dots.forEach((dot, i) => {
                        (dot as SVGElement).style.transformBox = 'fill-box';
                        (dot as SVGElement).style.transformOrigin = 'center';
                        r.animate(dot, [{ transform: 'scale(0)' }, { transform: 'scale(1.3)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 360, delay: (ms * i) / Math.max(1, dots.length - 1), easing: 'ease-out', fill: 'backwards' });
                    });
                    svg.querySelectorAll('.chart-value').forEach((v, i) => after(v, (ms * i) / Math.max(1, dots.length - 1) + 120));
                }
                const slices = svg.querySelectorAll<SVGPathElement>('path.chart-slice');
                slices.forEach((slice, i) => {
                    slice.style.transformBox = 'view-box';
                    slice.style.transformOrigin = '170px 160px';
                    r.animate(slice, [{ opacity: 0, transform: 'scale(.6) rotate(-20deg)' }, { opacity: 1, transform: 'none' }], { duration: ms * 0.6, delay: i * step * 2, easing: ease, fill: 'backwards' });
                });
                svg.querySelectorAll('g[transform] > rect.chart-slice').forEach((key, i) => { const g = key.parentElement; if (g) after(g, i * step * 2 + ms * 0.4); });
            });
        }

        return () => { r.dispose(); cleanups.reverse().forEach(f => f()); };
    }, [node, ref, reduced, assetKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

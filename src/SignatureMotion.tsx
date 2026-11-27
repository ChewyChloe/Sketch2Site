import { useEffect, type RefObject } from 'react';
import type { PageNode } from './pageSpec';
import { motionNumber, type MotionInstance } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { resources } from './AdvancedMotion';

// Signature presets (2026-11-25): lively, everyday effects people expect from a
// modern site builder. Same rules as the other presets: the user's text stays the
// real, selectable text; decorations are aria-hidden; everything pauses off-screen,
// respects reduced motion and cleans up after itself.
import { signatureMotionIds } from './motionCatalog';
export { signatureMotionIds };

const gradients: Record<string, string> = {
    sunset: 'linear-gradient(90deg,#ff6a3d,#ffb238,#ff4f8b,#ff6a3d)',
    ocean: 'linear-gradient(90deg,#0d74ce,#22c3d6,#5b5bf0,#0d74ce)',
    candy: 'linear-gradient(90deg,#ff5fa2,#a66bff,#3fc8ff,#ff5fa2)',
    theme: 'linear-gradient(90deg,var(--accent,#237552),#10e560,var(--accent,#237552))',
};
const confettiColors = ['#ff5f5f', '#ffb238', '#10c556', '#3fa7ff', '#a66bff', '#ff5fa2'];

export function useSignatureMotion(node: PageNode, ref: RefObject<HTMLElement | null>) {
    const reduced = useReducedMotion();
    useEffect(() => {
        const host = ref.current;
        const own = node.effects.filter(e => (signatureMotionIds as readonly string[]).includes(e.presetId));
        if (!host || !own.length) return;
        const r = resources(host, reduced);
        const find = (id: string) => own.find(e => e.presetId === id);
        const n = (e: MotionInstance, key: string, fallback: number) => motionNumber(e, key, fallback);
        const style = getComputedStyle(host);
        if (style.position === 'static') r.property(host, 'position', 'relative');
        const deco = (cls: string, parent: HTMLElement = host) => { const el = document.createElement('span'); el.className = cls; el.setAttribute('aria-hidden', 'true'); if (parent === host) r.append(el); else parent.append(el); return el; };
        const hover = (enter: () => void) => { r.listen(host, 'pointerenter', e => { if ((e as PointerEvent).pointerType !== 'touch') enter(); }); r.listen(host, 'focusin', enter); };
        const text = (host.textContent ?? '').trim();

        // Typewriter: the real text is kept (transparent while typing); an overlay types it out.
        const typewriter = find('typewriter');
        if (typewriter && text) {
            r.entrance(() => {
                const graphemes = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), s => s.segment) : Array.from(text);
                const overlay = deco('sig-typewriter');
                const caret = typewriter.validatedControls.caret !== false;
                r.property(host, 'color', 'transparent');
                overlay.style.color = style.color;
                const perChar = 1000 / n(typewriter, 'charsPerSecond', 18);
                let i = 0, timer = 0;
                const step = () => {
                    if (!r.isVisible()) { timer = window.setTimeout(step, 200); return; }
                    i++;
                    overlay.textContent = graphemes.slice(0, i).join('');
                    if (caret) overlay.append(Object.assign(document.createElement('i'), { className: 'sig-caret' }));
                    if (i < graphemes.length) timer = window.setTimeout(step, perChar);
                    else window.setTimeout(() => { host.style.removeProperty('color'); r.remove(overlay); }, caret ? 900 : 0);
                };
                step();
                const dispose = r.dispose;
                r.dispose = () => { clearTimeout(timer); dispose(); };
            });
        }

        // Marquee: the text slides across in a loop; the original stays for screen readers.
        const marquee = find('marquee-text');
        if (marquee && text && !reduced) {
            const track = document.createElement('span');
            track.className = 'sig-marquee-track';
            track.setAttribute('aria-hidden', 'true');
            for (let k = 0; k < 4; k++) { const item = document.createElement('span'); item.textContent = text; track.append(item); }
            const box = deco('sig-marquee');
            box.append(track);
            r.property(host, 'overflow', 'hidden');
            r.property(host, 'color', 'transparent');
            box.style.color = style.color;
            const speed = n(marquee, 'speedPxPerSecond', 60), dir = marquee.validatedControls.direction === 'right' ? 1 : -1;
            requestAnimationFrame(() => {
                const width = (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? 200;
                r.animate(track, [{ transform: `translateX(${dir < 0 ? 0 : -width}px)` }, { transform: `translateX(${dir < 0 ? -width : 0}px)` }], { duration: (width / speed) * 1000, iterations: Infinity, easing: 'linear' });
            });
        }

        // Gradient text: a slow colour flow through the letters.
        const gradient = find('gradient-text-flow');
        if (gradient) {
            r.property(host, 'background-image', gradients[String(gradient.validatedControls.palette)] ?? gradients.sunset);
            r.property(host, 'background-size', '300% 100%');
            r.property(host, '-webkit-background-clip', 'text');
            r.property(host, 'background-clip', 'text');
            r.property(host, '-webkit-text-fill-color', 'transparent');
            r.animate(host, [{ backgroundPosition: '0% 50%' }, { backgroundPosition: '100% 50%' }, { backgroundPosition: '0% 50%' }], { duration: n(gradient, 'cycleMs', 6000), iterations: Infinity, easing: 'ease-in-out' });
        }

        // Blur in: from soft focus to sharp, once, when it scrolls into view.
        const blur = find('blur-in');
        if (blur) {
            const px = n(blur, 'blurPx', 12);
            r.property(host, 'opacity', reduced ? '1' : '0');
            r.entrance(() => {
                host.style.removeProperty('opacity');
                const frames = blur.validatedControls.entry === 'trail' ? [
                    { translate: '-32px 0', filter: `blur(${px / 3}px) drop-shadow(-21px 0 3px color-mix(in srgb, currentColor 24%, transparent))`, opacity: .38 },
                    { translate: '3px 0', filter: 'blur(0px) drop-shadow(-8px 0 1px color-mix(in srgb, currentColor 12%, transparent))', opacity: 1, offset: .73 },
                    { translate: '0px 0', filter: 'blur(0px) drop-shadow(0px 0 0px transparent)', opacity: 1 },
                ] : [{ filter: `blur(${px}px)`, opacity: 0, transform: 'scale(1.04)' }, { filter: 'blur(0)', opacity: 1, transform: 'none' }];
                r.animate(host, frames, { duration: n(blur, 'durationMs', 900), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
            });
        }

        // Float: a gentle idle bob, paused off-screen.
        const float = find('float-idle');
        if (float) {
            const d = n(float, 'distancePx', 8);
            r.animate(host, [{ transform: 'translateY(0)' }, { transform: `translateY(${-d}px) rotate(${d > 10 ? 0.6 : 0.3}deg)` }, { transform: 'translateY(0)' }], { duration: n(float, 'cycleMs', 4200), iterations: Infinity, easing: 'ease-in-out' });
        }

        // Confetti: a short burst from the click point; pieces are removed when done.
        const confetti = find('confetti-burst');
        if (confetti && !reduced) {
            const count = n(confetti, 'count', 24);
            const layer = deco('sig-confetti-layer');
            r.listen(host, 'click', e => {
                const box = host.getBoundingClientRect(), pe = e as MouseEvent;
                const x = pe.clientX ? pe.clientX - box.left : box.width / 2, y = pe.clientY ? pe.clientY - box.top : box.height / 2;
                for (let k = 0; k < count; k++) {
                    const piece = document.createElement('i');
                    piece.className = 'sig-confetti';
                    piece.style.left = `${x}px`; piece.style.top = `${y}px`;
                    piece.style.background = confettiColors[k % confettiColors.length];
                    layer.append(piece);
                    const angle = (Math.PI * 2 * k) / count + Math.random() * 0.4, dist = 50 + Math.random() * 70;
                    const a = r.animate(piece, [{ transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist + 40}px)) rotate(${Math.random() * 540}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.15,.7,.3,1)' }, true);
                    if (a) a.addEventListener('finish', () => piece.remove(), { once: true }); else piece.remove();
                }
            });
        }

        // Jelly: a springy squash-and-stretch on hover or press.
        const jelly = find('jelly-press');
        if (jelly && !reduced) {
            const k = jelly.validatedControls.intensity === 'medium' ? 1 : 0.6;
            const play = () => r.animate(host, [{ transform: 'scale(1,1)' }, { transform: `scale(${1 + 0.12 * k},${1 - 0.1 * k})` }, { transform: `scale(${1 - 0.06 * k},${1 + 0.06 * k})` }, { transform: `scale(${1 + 0.03 * k},${1 - 0.03 * k})` }, { transform: 'scale(1,1)' }], { duration: 620, easing: 'ease-out' }, true);
            hover(play);
            r.listen(host, 'pointerdown', play);
        }

        // Shine: a diagonal highlight sweeps across once on hover (and once on entrance).
        const shine = find('shine-sweep');
        if (shine && !reduced) {
            r.property(host, 'overflow', 'hidden');
            const streak = deco('sig-shine');
            const play = () => r.animate(streak, [{ transform: 'translateX(-120%) skewX(-20deg)' }, { transform: 'translateX(260%) skewX(-20deg)' }], { duration: n(shine, 'durationMs', 800), easing: 'ease-in-out' }, true);
            hover(play);
            r.entrance(() => { window.setTimeout(play, 300); });
        }
        return () => r.dispose();
    }, [node, ref, reduced]);
}

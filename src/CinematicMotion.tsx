import { useEffect, useId, type RefObject } from 'react';
import type { PageNode } from './pageSpec';
import { motionNumber, cinematicMotionIds } from './motion';
import { useReducedMotion } from './MotionRuntime';
import { resources } from './AdvancedMotion';
const ns = 'http://www.w3.org/2000/svg', clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const cinematicTextIds = ['text-morph-transition', 'elastic-word-bounce', 'text-spotlight-reveal', 'typographic-stretch'];
function shapePath(points: number[][]) { const mids = points.map((p, i) => [(p[0] + points[(i + 1) % points.length][0]) / 2, (p[1] + points[(i + 1) % points.length][1]) / 2]); return `M ${mids[7].join(' ')} ` + points.map((p, i) => `Q ${p.join(' ')} ${mids[i].join(' ')}`).join(' ') + ' Z'; }
export function useCinematicMotion(node: PageNode, ref: RefObject<HTMLElement | null>, urls: Readonly<Record<string, string | null>>) {
    const reduced = useReducedMotion(), uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    // Equivalent asset maps must not rebuild imperative graphics or reset replay state.
    const assetSignature=JSON.stringify(Object.entries(urls).sort(([a],[b])=>a.localeCompare(b)));
    useEffect(() => {
        const host = ref.current, effect = node.effects.find(e => cinematicMotionIds.includes(e.presetId as typeof cinematicMotionIds[number]));
        if (!host || !effect || cinematicTextIds.includes(effect.presetId) || ['card-stack-shuffle', 'horizontal-scroll-gallery', 'sticky-section-morph', 'scroll-image-sequence', 'pinned-story-panels'].includes(effect.presetId))
            return;
        const r = resources(host, reduced), id = effect.presetId, n = (key: string, fallback: number) => motionNumber(effect, key, fallback);
        const cleanup: (() => void)[] = [];
        let frame = 0;
        const initial = getComputedStyle(host);
        if (initial.position === 'static')
            r.property(host, 'position', 'relative');
        r.property(host, 'isolation', 'isolate');
        const svgEl = (name: string, attrs: Record<string, string> = {}) => { const el = document.createElementNS(ns, name); for (const [k, v] of Object.entries(attrs))
            el.setAttribute(k, v); return el; };
        const svg = (className: string) => { const el = svgEl('svg', { viewBox: '0 0 200 140', 'aria-hidden': 'true' }); el.classList.add(className); r.append(el); return el; };
        const button = (label: string, fn: () => void) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'motion-toggle cin-toggle'; el.textContent = label; el.addEventListener('click', fn); r.append(el); return el; };
        const finite = (duration: number, step: (p: number) => void, done = () => { }) => { cancelAnimationFrame(frame); const start = performance.now(); const tick = (now: number) => { if (document.hidden || !r.isVisible()) {
            done();
            return;
        } const p = clamp((now - start) / duration); step(p); if (p < 1)
            frame = requestAnimationFrame(tick);
        else
            done(); }; frame = requestAnimationFrame(tick); };
        const localUrl = (path: string) => path in urls ? urls[path] || null : import.meta.env.BASE_URL + path.slice(1);
        if (id === 'directional-hover-wipe') {
            r.property(host, 'overflow', 'hidden');
            const layer = document.createElement('span');
            layer.className = 'cin-wipe';
            layer.setAttribute('aria-hidden', 'true');
            r.append(layer);
            let a: Animation | null = null;
            const side = (x: number, y: number) => { const b = host.getBoundingClientRect(), dist = [(x - b.left) / b.width, (y - b.top) / b.height, (b.right - x) / b.width, (b.bottom - y) / b.height]; return ['left', 'top', 'right', 'bottom'][dist.indexOf(Math.min(...dist))]; };
            const offset: Record<string, string> = { left: 'translateX(-102%)', right: 'translateX(102%)', top: 'translateY(-102%)', bottom: 'translateY(102%)' };
            const enter = (direction: string) => { a?.cancel(); layer.dataset.direction = direction; layer.style.transform = 'translate(0,0)'; a = r.animate(layer, [{ transform: offset[direction] }, { transform: 'translate(0,0)' }], { duration: n('durationMs', 260), easing: 'ease-out' }); };
            const leave = (direction: string) => { const from = getComputedStyle(layer).transform; a?.cancel(); layer.dataset.exit = direction; layer.style.transform = offset[direction]; a = r.animate(layer, [{ transform: from }, { transform: offset[direction] }], { duration: n('durationMs', 260), easing: 'ease-out' }); };
            r.listen(host, 'pointerenter', e => { if ((e as PointerEvent).pointerType !== 'touch')
                enter(side((e as PointerEvent).clientX, (e as PointerEvent).clientY)); });
            r.listen(host, 'pointerleave', e => { if (!host.contains(document.activeElement))
                leave(side((e as PointerEvent).clientX, (e as PointerEvent).clientY)); });
            r.listen(host, 'focusin', () => enter('left'));
            r.listen(host, 'focusout', e => { if (!host.contains((e as FocusEvent).relatedTarget as Node))
                leave('right'); });
            if (node.type === 'card' && !host.hasAttribute('tabindex')) {
                host.tabIndex = 0;
                cleanup.push(() => host.removeAttribute('tabindex'));
            }
        }
        if (id === 'cursor-image-follower') {
            const image = document.createElement('img');
            image.className = 'cin-follower';
            image.alt = '';
            image.setAttribute('aria-hidden', 'true');
            const url = localUrl(String(effect.validatedControls.image));
            if (url)
                image.src = url;
            else {
                const message = document.createElement('small');
                message.textContent = '預覽圖片尚未就緒，請重新選擇。';
                message.setAttribute('role', 'status');
                r.append(message);
            }
            r.append(image);
            image.style.width = `${n('widthPx', 100)}px`;
            image.style.transition = reduced ? 'none' : `translate ${n('responseMs', 180)}ms cubic-bezier(.2,.8,.3,1), opacity 150ms, scale 150ms`;
            const show = (x: number, y: number) => { const w = n('widthPx', 100), b = host.getBoundingClientRect(), page = host.closest('.rendered-page')?.getBoundingClientRect(); image.style.translate = `${clamp(x, 0, Math.max(0, (page?.right ?? innerWidth) - b.left - w - 8))}px ${Math.max(host.clientHeight + 8, y)}px`; image.dataset.visible = 'true'; };
            const fixed = () => show(Math.max(0, host.clientWidth - n('widthPx', 100)), 4);
            r.listen(host, 'pointermove', e => { const p = e as PointerEvent; if (p.pointerType === 'touch' || reduced)
                return; const b = host.getBoundingClientRect(); show(p.clientX - b.left + 16, p.clientY - b.top + 12); });
            r.listen(host, 'pointerleave', () => { if (!host.contains(document.activeElement))
                image.dataset.visible = 'false'; });
            r.listen(host, 'focusin', fixed);
            if(host.contains(document.activeElement))fixed();
            r.listen(host, 'focusout', () => image.dataset.visible = 'false');
            r.listen(host, 'pointerdown', e => { if ((e as PointerEvent).pointerType === 'touch')
                fixed(); });
            r.listen(image, 'error', () => { image.dataset.visible = 'false'; });
            if (node.type !== 'button' && !host.hasAttribute('tabindex')) {
                host.tabIndex = 0;
                cleanup.push(() => host.removeAttribute('tabindex'));
            }
        }
        if (id === 'spring-drag-snap') {
            const handle = document.createElement('button');
            handle.type = 'button';
            handle.textContent = '拖動把手';
            handle.className = 'motion-toggle cin-drag-handle';
            handle.setAttribute('aria-label', '拖曳把手；方向鍵移動，Home復位');
            r.append(handle);
            let point: {
                x: number;
                y: number;
                px: number;
                py: number;
                id: number;
            } | null = null, pos = { x: 0, y: 0 }, a: Animation | null = null;
            const max = n('rangePx', 32);
            r.property(host, 'translate', host.style.translate);
            const move = (x: number, y: number) => { pos = { x: clamp(x, -max, max), y: clamp(y, -max, max) }; host.style.translate = `${pos.x}px ${pos.y}px`; host.dataset.snapX = String(pos.x); };
            const settle = (x = 0, y = 0) => { const from = getComputedStyle(host).translate; a?.cancel(); move(x, y); a = r.animate(host, [{ translate: from === 'none' ? '0px 0px' : from }, { translate: `${x + (pos.x - x) * .12}px ${y}px`, offset: .8 }, { translate: `${x}px ${y}px` }], { duration: n('durationMs', 550), easing: 'cubic-bezier(.2,1.3,.3,1)' }); };
            const end = () => { if (!point)
                return; point = null; if (effect.validatedControls.snap === 'edge')
                settle(pos.x < 0 ? -max : max, 0);
            else
                settle(); };
            r.listen(handle, 'pointerdown', e => { const p = e as PointerEvent; if (p.button !== 0)
                return; p.preventDefault(); const current = getComputedStyle(host).translate.split(' ').map(Number.parseFloat); if (Number.isFinite(current[0]))
                pos = { x: current[0], y: current[1] || 0 }; a?.cancel(); point = { x: p.clientX, y: p.clientY, px: pos.x, py: pos.y, id: p.pointerId }; handle.setPointerCapture?.(p.pointerId); });
            r.listen(handle, 'pointermove', e => { const p = e as PointerEvent; if (!point || p.pointerId !== point.id)
                return; move(point.px + p.clientX - point.x, point.py + p.clientY - point.y); });
            for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
                r.listen(handle, event, end);
            r.listen(handle, 'keydown', e => { const k = e as KeyboardEvent; if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(k.key)) {
                k.preventDefault();
                if (k.key === 'Home')
                    settle();
                else
                    move(pos.x + (k.key === 'ArrowRight' ? 8 : k.key === 'ArrowLeft' ? -8 : 0), pos.y + (k.key === 'ArrowDown' ? 8 : k.key === 'ArrowUp' ? -8 : 0));
            } });
            r.listen(handle, 'click', e => { if ((e as MouseEvent).detail === 0)
                settle(); });
            cleanup.push(() => { a?.cancel(); host.removeAttribute('data-snap-x'); });
        }
        if (id === 'cursor-trail-particles' || id === 'particle-constellation') {
            const canvas = document.createElement('canvas');
            canvas.className = 'cin-particles';
            canvas.setAttribute('aria-hidden', 'true');
            r.append(canvas);
            const ctx = canvas.getContext('2d');
            let visible = false, last = 0, w = 1, h = 1;
            const particles: {
                x: number;
                y: number;
                vx: number;
                vy: number;
                born: number;
            }[] = [];
            const trail = id === 'cursor-trail-particles';
            let pointer: {
                x: number;
                y: number;
                t: number;
            } | null = null;
            const color = getComputedStyle(host).color;
            const resize = () => { const oldW = w, oldH = h; const b = host.getBoundingClientRect(); w = Math.max(1, Math.min(720, b.width)); h = Math.max(1, Math.min(480, b.height)); for (const p of particles) {
                p.x = p.x / oldW * w;
                p.y = p.y / oldH * h;
            } pointer = null; const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = w * dpr; canvas.height = h * dpr; ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); if (!trail && !particles.length)
                for (let i = 0; i < n('particles', 16); i++)
                    particles.push({ x: (i * .618 % 1) * w, y: (i * .397 % 1) * h, vx: Math.sin(i * 3.7) * n('speed', .35), vy: Math.cos(i * 2.1) * n('speed', .35), born: 0 }); };
            const draw = (now: number) => {
                frame = 0;
                if (!ctx)
                    return;
                const dt = Math.min(2, (now - last) / 16.67 || 1);
                last = now;
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = color;
                ctx.strokeStyle = color;
                if (trail) {
                    for (let i = particles.length - 1; i >= 0; i--) {
                        const p = particles[i], age = now - p.born;
                        if (age >= n('lifetimeMs', 550)) {
                            particles.splice(i, 1);
                            continue;
                        }
                        p.x += p.vx * dt;
                        p.y += p.vy * dt;
                        ctx.globalAlpha = (1 - age / n('lifetimeMs', 550)) * .45;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, n('sizePx', 4) * (1 - age / n('lifetimeMs', 550)), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                else {
                    for (const p of particles) {
                        if (!reduced) {
                            p.x += p.vx * dt;
                            p.y += p.vy * dt;
                            if (p.x < 0 || p.x > w)
                                p.vx *= -1;
                            if (p.y < 0 || p.y > h)
                                p.vy *= -1;
                            p.x = clamp(p.x, 0, w);
                            p.y = clamp(p.y, 0, h);
                            if (pointer) {const distance=Math.hypot(pointer.x-p.x,pointer.y-p.y);if(distance<120){const influence=(1-distance/120)*.15;p.x+=clamp(pointer.x-p.x,-1,1)*influence;p.y+=clamp(pointer.y-p.y,-1,1)*influence;}}
                        }
                        ctx.globalAlpha = .38;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    for (let i = 0; i < particles.length; i++)
                        for (let j = i + 1; j < particles.length; j++) {
                            const a = particles[i], b = particles[j], d = Math.hypot(a.x - b.x, a.y - b.y);
                            if (d < n('linkDistancePx', 65)) {
                                ctx.globalAlpha = (1 - d / n('linkDistancePx', 65)) * .24;
                                ctx.beginPath();
                                ctx.moveTo(a.x, a.y);
                                ctx.lineTo(b.x, b.y);
                                ctx.stroke();
                            }
                        }
                }
                ctx.globalAlpha = 1;
                if (visible && !document.hidden && !reduced && (!trail || particles.length))
                    frame = requestAnimationFrame(draw);
            };
            const resume = () => { cancelAnimationFrame(frame); frame = 0; canvas.dataset.paused = String(!visible || document.hidden || reduced); if (visible && !document.hidden)
                draw(performance.now()); };
            const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); resume(); });
            io?.observe(host);
            if (!io)
                visible = true;
            const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { resize(); resume(); });
            ro?.observe(host);
            r.listen(document, 'visibilitychange', resume);
            resize();
            draw(performance.now());
            r.listen(host, 'pointermove', e => { const p = e as PointerEvent; if (p.pointerType === 'touch' || reduced)
                return; const b = host.getBoundingClientRect(), x = (p.clientX - b.left) * w / b.width, y = (p.clientY - b.top) * h / b.height, now = performance.now(); if (trail) {
                if (!pointer || Math.hypot(x - pointer.x, y - pointer.y) > 3) {
                    const speed = pointer ? Math.min(3, Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.t)) : 0;
                    particles.push({ x, y, vx: -speed * .25, vy: .25, born: now });
                    while (particles.length > n('maxParticles', 16))
                        particles.shift();
                    if (!frame && visible)
                        draw(now);
                }
            } pointer = { x, y, t: now }; });
            r.listen(host, 'pointerleave', () => pointer = null);
            cleanup.push(() => { io?.disconnect(); ro?.disconnect(); particles.length = 0; });
        }
        if (id === 'pixel-dissolve' || id === 'glitch-slice-reveal') {
            const image = host.querySelector('img');
            if (image && !reduced) {
                const canvas = document.createElement('canvas');
                canvas.className = 'cin-image-layer';
                canvas.setAttribute('aria-hidden', 'true');
                r.append(canvas);
                const ctx = canvas.getContext('2d');
                r.property(image, 'opacity', image.style.opacity);
                const start = () => { if (!ctx || !image.complete || !image.naturalWidth)
                    return; const b = image.getBoundingClientRect(), w = Math.min(640, b.width), h = Math.min(480, w * b.height / Math.max(1, b.width)); canvas.width = w; canvas.height = h; image.style.opacity = '0'; const finish = () => { image.style.opacity = ''; r.remove(canvas); }; finite(n('durationMs', 900), p => { ctx.clearRect(0, 0, w, h); if (id === 'pixel-dissolve') {
                    const count = n('tiles', 5), phase = effect.validatedControls.mode === 'dissolve' ? Math.sin(p * Math.PI) : 1 - p;
                    for (let y = 0; y < count; y++)
                        for (let x = 0; x < count; x++) {
                            const i = y * count + x, delay = (i * .37 % 1) * .25, q = clamp(phase * (1 + delay)), dx = Math.sin(i * 2.4) * q * 32, dy = Math.cos(i * 1.7) * q * 28;
                            ctx.globalAlpha = 1 - q;
                            ctx.drawImage(image, image.naturalWidth * x / count, image.naturalHeight * y / count, image.naturalWidth / count, image.naturalHeight / count, w * x / count + dx, h * y / count + dy, w / count + 1, h / count + 1);
                        }
                }
                else {
                    const count = n('slices', 5), envelope = Math.sin(Math.PI * p) * (1 - p);
                    for (let y = 0; y < count; y++) {
                        const dx = Math.sin(y * 2 + p * Math.PI * 4) * n('distancePx', 8) * envelope;
                        ctx.drawImage(image, 0, image.naturalHeight * y / count, image.naturalWidth, image.naturalHeight / count, dx, h * y / count, w, h / count + 1);
                    }
                } }, finish); };
                r.entrance(() => { if (image.complete)
                    start();
                else
                    r.listen(image, 'load', start); });
                r.listen(image, 'error', () => { image.style.opacity = ''; r.remove(canvas); });
                cleanup.push(() => { image.style.opacity = ''; });
            }
        }
        if (id === 'shutter-lens-transition' && !reduced) {
            r.property(host, 'overflow', 'hidden');
            const overlay = svg('cin-shutter');
            const count = n('blades', 6), polygons: SVGElement[] = [];
            for (let i = 0; i < count; i++) {
                const angle = i * Math.PI * 2 / count, a = angle - Math.PI / count, b = angle + Math.PI / count;
                const leaf = svgEl('polygon', { points: `100,70 ${100 + 300 * Math.cos(a)},${70 + 300 * Math.sin(a)} ${100 + 300 * Math.cos(b)},${70 + 300 * Math.sin(b)}`, fill: i % 2 ? '#24342d' : '#30463a' });
                leaf.style.transformOrigin = '100px 70px';
                overlay.append(leaf);
                polygons.push(leaf);
            }
            r.entrance(() => polygons.forEach((leaf, i) => { const angle = i * Math.PI * 2 / count; const a = r.animate(leaf, [{ transform: 'rotate(0deg) translate(0,0)' }, { transform: `translate(${Math.cos(angle) * 220}px,${Math.sin(angle) * 220}px) rotate(65deg)` }], { duration: n('durationMs', 900), easing: 'cubic-bezier(.4,0,.2,1)' }); if (i === count - 1)
                a?.addEventListener('finish', () => r.remove(overlay), { once: true }); }));
        }
        if (id === 'liquid-distortion-reveal' && !reduced) {
            const withinBounds=()=>host.clientWidth<=720&&host.clientHeight<=500&&host.clientWidth*host.clientHeight<=360000;
            const defs=svg('cin-filter-defs'),filter=svgEl('filter',{id:'distort-'+uid,x:'-10%',y:'-10%',width:'120%',height:'120%'}),noise=svgEl('feTurbulence',{type:'fractalNoise',baseFrequency:'.025',numOctaves:'1',seed:'7',result:'noise'}),map=svgEl('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:String(n('intensity',18)),xChannelSelector:'R',yChannelSelector:'G'});
            filter.append(noise,map);defs.append(filter);const old=host.style.filter;r.property(host,'filter',old);
            const finish=()=>{cancelAnimationFrame(frame);host.style.filter=old;r.remove(defs);};
            const start=()=>{if(!withinBounds()){finish();return;}host.style.filter=`url(#distort-${uid})`;finite(n('durationMs',1000),p=>map.setAttribute('scale',String(n('intensity',18)*(1-p)**2)),finish);};
            r.entrance(()=>{const image=host.querySelector('img');if(image&&!image.complete)r.listen(image,'load',start);else start();});
            const bounds=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{if(!withinBounds())finish();});bounds?.observe(host);cleanup.push(()=>bounds?.disconnect());
        }
        if (id === 'gooey-blob-merge') {
            const surface = svg('cin-gooey'), filter = svgEl('filter', { id: 'goo-' + uid, x: '-25%', y: '-25%', width: '150%', height: '150%' });
            filter.append(svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '5', result: 'blur' }), svgEl('feColorMatrix', { in: 'blur', mode: 'matrix', values: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7' }));
            const defs = svgEl('defs');
            defs.append(filter);
            surface.append(defs);
            const group = svgEl('g', reduced ? {} : { filter: `url(#goo-${uid})` });
            surface.append(group);
            const count = n('balls', 3);
            const circles = Array.from({ length: count }, (_, i) => { const c = svgEl('circle', { cx: String(30 + i * 140 / Math.max(1, count - 1)), cy: '70', r: String(n('radiusPx', 15)), fill: 'currentColor' }); group.append(c); return c; });
            let busy = false;
            button('融合圓球', () => { if (busy || reduced)
                return; busy = true; circles.forEach((c, i) => { const dx = 100 - (30 + i * 140 / Math.max(1, count - 1)); const a = r.animate(c, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${(i % 2 ? 1 : -1) * 8}px)`, offset: .5 }, { transform: 'translate(0,0)' }], { duration: n('durationMs', 1200), easing: 'ease-in-out' }); if (i === count - 1)
                for (const ev of ['finish', 'cancel'])
                    a?.addEventListener(ev, () => busy = false, { once: true }); }); });
        }
        if (id === 'elastic-svg-morph') {
            const surface = svg('cin-shape'), path = svgEl('path', { fill: 'currentColor' });
            surface.append(path);
            const base = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return [100 + 45 * Math.cos(a), 70 + 45 * Math.sin(a)]; });
            const target = base.map((_, i) => { const a = i * Math.PI / 4, shape = effect.validatedControls.shape; if (shape === 'rounded-square')
                return [100 + Math.sign(Math.cos(a)) * Math.min(48, Math.abs(Math.cos(a)) * 75), 70 + Math.sign(Math.sin(a)) * Math.min(48, Math.abs(Math.sin(a)) * 75)]; const radius = shape === 'star' ? (i % 2 ? 25 : 54) : [50, 35, 55, 30, 42, 53, 32, 48][i]; return [100 + radius * Math.cos(a), 70 + radius * Math.sin(a)]; });
            let value = 0, goal = 0;
            const paint = (p: number) => path.setAttribute('d', shapePath(base.map((v, i) => v.map((coord, k) => coord + (target[i][k] - coord) * p))));
            paint(0);
            button('變換圖形', () => { goal = goal ? 0 : 1; const start = value; if (reduced) {
                value = goal;
                paint(value);
                return;
            } finite(n('durationMs', 900), p => { const elastic = 1 - (1 - p) ** 3 + Math.sin(p * Math.PI * 3) * (1 - p) * .12; value = clamp(start + (goal - start) * elastic, -.1, 1.1); paint(value); }, () => { value = goal; paint(value); }); });
        }
        return () => { cancelAnimationFrame(frame); cleanup.forEach(fn => fn()); r.dispose(); };
    }, [node, ref, reduced, uid, assetSignature]);
}

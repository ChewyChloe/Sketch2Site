import { motionNumber, type MotionInstance } from "./motion";
import type { resources } from "./AdvancedMotion";

export const ambientHundred = ["aurora-pools", "petal-eddies", "relay-connections", "corner-reprint", "glyph-embers", "grain-tide", "lantern-rise"] as const;

export function runHundred(host: HTMLElement, effect: MotionInstance, r: ReturnType<typeof resources>, reduced: boolean, text: string) {
    const id = effect.presetId;
    const duration = motionNumber(effect, "durationMs", 6000);
    const strength = motionNumber(effect, "strength", .2);
    const layer = document.createElement("span");
    layer.className = "hundred-layer";
    layer.dataset.scene = id;
    layer.setAttribute("aria-hidden", "true");
    r.property(host, "isolation", "isolate");
    r.append(layer);
    const piece = (parent: Element = layer) => {
        const el = document.createElement("span");
        parent.append(el);
        return el;
    };
    const wave = (el: Element, frames: Keyframe[], phase = 0, tempo = 1) =>
        r.animate(el, frames, { duration: duration * tempo, delay: -phase * duration * tempo, iterations: Infinity, easing: "linear" });

    if (id === "aurora-pools") {
        layer.style.opacity = String(strength);
        for (const [index, x, y] of [[0, 12, 20], [1, 57, 15], [2, 30, 52]]) {
            const el = piece();
            Object.assign(el.style, { left: x + "%", top: y + "%" });
            wave(el, [
                { transform: "translate(-17%, -12%) scale(.8)" },
                { transform: `translate(${index === 1 ? "-44%" : "44%"}, 34%) scale(1.32)` },
                { transform: "translate(-17%, -12%) scale(.8)" },
            ], index / 3, 1.4 + index * .2);
        }
    }

    if (id === "lantern-rise") {
        for (let i = 0; i < strength; i++) {
            const light = piece();
            light.style.left = ((13 + 43 * i) % 90) + "%";
            light.style.width = light.style.height = (12 + (i * 17) % 42) + "px";
            wave(light, [
                { translate: "0 0", opacity: 0 }, { opacity: .48, offset: .26 },
                { opacity: .32, offset: .68 }, { translate: `${i % 2 ? 20 : -18}px -240px`, opacity: 0 },
            ], i / strength, .85 + i % 4 * .16);
            if (reduced) Object.assign(light.style, { top: (12 + i * 19 % 77) + "%", bottom: "auto", opacity: ".22" });
        }
    }

    if (id === "grain-tide") {
        const tide = piece(), grain = piece();
        grain.style.opacity = String(strength);
        const tile = document.createElement("canvas");
        tile.width = tile.height = 48;
        const context = tile.getContext("2d");
        if (context) {
            const data = context.createImageData(48, 48);
            for (let i = 0; i < 2304; i++) {
                const shade = (i * 137 + (i * i * 53) % 127) % 250;
                data.data.set([shade, shade, shade, 180], i * 4);
            }
            context.putImageData(data, 0, 0);
            grain.style.backgroundImage = `url(${tile.toDataURL()})`;
        }
        wave(tide, [{ transform: "translate(-7%, -4%) rotate(-8deg)" }, { transform: "translate(9%, 7%) rotate(11deg)" }, { transform: "translate(-7%, -4%) rotate(-8deg)" }]);
        r.animate(grain, [{ backgroundPosition: "0px 0px" }, { backgroundPosition: "48px -48px" }], { duration: Math.max(600, duration / 5), iterations: Infinity, easing: "steps(6)" });
    }

    if (id === "petal-eddies") {
        const petals = Array.from({ length: strength }, (_, i) => {
            const lane = piece(), petal = piece(lane);
            lane.style.left = (6 + i * 29 % 86) + "%";
            petal.style.width = (6 + i * 5 % 10) + "px";
            wave(lane, [
                { transform: "translateY(-15%)" }, { transform: "translateY(112%)" },
            ], i / strength, .74 + i % 5 * .15);
            wave(petal, [{ rotate: "0deg" }, { rotate: "360deg" }], i / strength, .6);
            if (reduced) petal.style.top = (10 + i * 23 % 85) + "%";
            return petal;
        });
        if (!reduced) {
            let gust: Animation | undefined;
            r.listen(host, "pointermove", event => {
                if ((event as PointerEvent).pointerType === "touch" || gust?.playState === "running") return;
                const pointer = event as PointerEvent;
                const closest = petals.map(petal => {
                    const rect = petal.getBoundingClientRect();
                    return { petal, distance: Math.hypot(pointer.clientX - rect.x, pointer.clientY - rect.y), direction: pointer.clientX < rect.x ? 1 : -1 };
                }).sort((a, b) => a.distance - b.distance)[0];
                if (closest.distance < 70) gust = r.animate(closest.petal, [{ translate: "0" }, { translate: closest.direction * 38 + "px", offset: .35 }, { translate: "0" }], { duration: 580 }, true) ?? undefined;
            });
        }
    }

    if (id === "relay-connections") {
        const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 320 130");
        svg.setAttribute("preserveAspectRatio", "none");
        layer.append(svg);
        for (let i = 0; i < strength; i++) {
            const y = 15 + i * 100 / Math.max(1, strength - 1);
            const end = 130 - y;
            const d = `M 12 ${y} C 104 ${y} 213 ${end} 308 ${end}`;
            const path = document.createElementNS(ns, "path");
            path.setAttribute("d", d);
            path.setAttribute("stroke-dasharray", "5 5");
            svg.append(path);
            for (const [x, height] of [[12, y], [308, end]]) {
                const terminal = document.createElementNS(ns, "circle");
                terminal.setAttribute("cx", String(x)); terminal.setAttribute("cy", String(height)); terminal.setAttribute("r", "3");
                svg.append(terminal);
            }
            const signal = document.createElementNS(ns, "circle");
            signal.setAttribute("r", "4");
            signal.style.offsetPath = `path("${d}")`;
            svg.append(signal);
            wave(path, [{ strokeDashoffset: "0" }, { strokeDashoffset: "-30" }], i / strength);
            wave(signal, [{ offsetDistance: "0%" }, { offsetDistance: "100%" }], i / strength, .8 + i * .08);
        }
    }

    if (id === "corner-reprint") {
        layer.style.setProperty("--peel-size", strength * 100 + "%");
        const fold = piece();
        const action = document.createElement("button");
        action.className = "hundred-peel-action";
        action.type = "button";
        action.textContent = "掀開再貼";
        r.append(action);
        layer.dataset.corner = "tr";
        let strip: Animation | null = null, sticker: Animation | null = null;
        const peel = () => layer.toggleAttribute("data-peel", true);
        r.listen(host, "pointermove", event => {
            const bounds = host.getBoundingClientRect(), pointer = event as PointerEvent;
            const x = pointer.clientX - bounds.left, y = pointer.clientY - bounds.top;
            layer.dataset.corner = (y < bounds.height / 2 ? "t" : "b") + (x < bounds.width / 2 ? "l" : "r");
            layer.toggleAttribute("data-peel", Math.hypot(Math.min(x, bounds.width - x), Math.min(y, bounds.height - y)) < Math.max(36, Math.min(bounds.width, bounds.height) * .4));
        });
        r.listen(host, "pointerleave", () => layer.removeAttribute("data-peel"));
        r.listen(action, "focus", peel);
        r.listen(action, "blur", () => layer.removeAttribute("data-peel"));
        r.listen(action, "click", event => {
            event.stopPropagation();
            strip?.cancel();
            sticker?.cancel();
            if (reduced) { layer.toggleAttribute("data-peel"); return; }
            const edge = layer.dataset.corner?.startsWith("b") ? "inset(99% 0 0)" : "inset(0 0 99%)";
            sticker = r.animate(host, [
                { clipPath: "inset(0)", scale: "1" },
                { clipPath: edge, scale: ".96", offset: .44 },
                { clipPath: edge, scale: ".96", offset: .52 },
                { clipPath: "inset(0)", scale: "1.022", offset: .85 },
                { clipPath: "inset(0)", scale: "1" },
            ], { duration, easing: "ease-in-out" }, true);
            strip = r.animate(fold, [
                { transform: "scale(.95)", opacity: .85 },
                { transform: "translate(52%, -52%) rotate(24deg) scale(.75)", opacity: 0, offset: .42 },
                { transform: "translate(-45%, 48%) scale(.9)", opacity: 0, offset: .55 },
                { transform: "translate(0,0) scale(1.12)", opacity: .88, offset: .82 },
                { transform: "scale(1)", opacity: .72 },
            ], { duration, easing: "ease-in-out" }, true);
        });
    }

    if (id === "glyph-embers") {
        if (reduced || !text || Array.from(text).length > 36) return;
        const canvas = document.createElement("canvas");
        canvas.width = 540; canvas.height = 88;
        layer.append(canvas);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const color = getComputedStyle(host).getPropertyValue("--accent").trim() || getComputedStyle(host).color;
        ctx.font = "700 62px " + getComputedStyle(host).fontFamily;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, 270, 44, 520);
        const pixels = ctx.getImageData(0, 0, 540, 88).data;
        const points: { x: number; y: number; dx: number; dy: number }[] = [];
        for (let y = 0; y < 88; y += strength) for (let x = 0; x < 540; x += strength)
            if (pixels[(y * 540 + x) * 4 + 3] > 100) points.push({ x, y, dx: 0, dy: 0 });
        let frame = 0, pointer: { x: number; y: number } | undefined;
        const draw = () => {
            frame = 0;
            ctx.clearRect(0, 0, 540, 88); ctx.fillStyle = color;
            let settling = false;
            for (const point of points) {
                const dx = point.x - (pointer?.x ?? -1000), dy = point.y - (pointer?.y ?? -1000);
                const length = Math.max(1, Math.hypot(dx, dy)), push = Math.max(0, 1 - length / 84) * 38;
                const step = Math.min(.34, Math.max(.07, 110 / duration));
                point.dx += (dx / length * push - point.dx) * step;
                point.dy += (dy / length * push - point.dy) * step;
                settling ||= Math.abs(dx / length * push - point.dx) + Math.abs(dy / length * push - point.dy) > .22;
                ctx.fillRect(point.x + point.dx, point.y + point.dy, Math.max(1, strength * .42), Math.max(1, strength * .42));
            }
            if (settling && r.isVisible()) frame = requestAnimationFrame(draw);
        };
        draw();
        const schedule = () => { if (!frame && r.isVisible()) frame = requestAnimationFrame(draw); };
        r.listen(host, "pointermove", event => {
            const bounds = canvas.getBoundingClientRect(), position = event as PointerEvent;
            if (bounds.width && bounds.height) pointer = { x: (position.clientX - bounds.left) * 540 / bounds.width, y: (position.clientY - bounds.top) * 88 / bounds.height };
            schedule();
        });
        r.listen(host, "pointerleave", () => { pointer = undefined; schedule(); });
        return () => cancelAnimationFrame(frame);
    }
}

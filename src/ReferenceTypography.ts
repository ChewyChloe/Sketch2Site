import type { resources } from "./AdvancedMotion";
import type { MotionInstance } from "./motion";
import { motionNumber } from "./motion";

export const typographyMotionIds = ["waterline-echo", "letter-fanout", "type-casts", "word-shelf", "reading-hop"] as const;
const segment = (text: string) => typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), item => item.segment)
    : Array.from(text);

export function playReferenceTypography(host: HTMLElement, effect: MotionInstance, text: string, r: ReturnType<typeof resources>, reduced: boolean) {
    if (!text || reduced) return;
    const duration = motionNumber(effect, "durationMs", 850);
    const layer = (name: string) => {
        const element = document.createElement("span");
        element.className = name;
        element.setAttribute("aria-hidden", "true");
        r.append(element);
        return element;
    };
    const addText = (parent: HTMLElement, value: string) => {
        const child = document.createElement("span");
        child.textContent = value;
        parent.append(child);
        return child;
    };

    switch (effect.presetId) {
        case "waterline-echo": {
            const reflection = layer("ref-waterline");
            const lines = motionNumber(effect, "slices", 4);
            for (let i = 0; i < lines; i++) {
                const strip = addText(reflection, segment(text).slice(0, 48).join(""));
                strip.style.clipPath = `inset(${i * 100 / lines}% 0 ${(lines - i - 1) * 100 / lines}% 0)`;
                r.animate(strip, [
                    { transform: "scaleY(-1) translateX(0px) skewX(0deg)" },
                    { transform: `scaleY(-1) translateX(${2 + i * 1.1}px) skewX(3deg)` },
                    { transform: `scaleY(-1) translateX(-${1 + i * 1.3}px) skewX(-2deg)` },
                    { transform: "scaleY(-1) translateX(0px) skewX(0deg)" },
                ], { duration, delay: -i * duration / lines, iterations: Infinity, easing: "ease-in-out" });
            }
            return;
        }
        case "letter-fanout": {
            const first = segment(text).find(glyph => glyph.trim());
            if (!first) return;
            r.entrance(() => {
                const fan = layer("ref-letter-fan");
                const spread = motionNumber(effect, "spread", 36);
                for (const angle of [-spread, -spread / 2, 0, spread / 2, spread]) {
                    const blade = addText(fan, first);
                    const animation = r.animate(blade, [
                        { rotate: "0deg", opacity: 0 },
                        { rotate: angle + "deg", opacity: .6, offset: .4 },
                        { rotate: angle + "deg", opacity: .4, offset: .68 },
                        { rotate: "0deg", opacity: 0 },
                    ], { duration, easing: "ease-in-out" });
                    animation?.addEventListener("finish", () => blade.remove(), { once: true });
                }
                const timer = r.animate(fan, [{ opacity: 1 }, { opacity: 1 }], { duration });
                timer?.addEventListener("finish", () => r.remove(fan), { once: true });
            });
            return;
        }
        case "type-casts": {
            const type = layer("ref-type-casts");
            const families = ["inherit", "Georgia, 'Noto Serif TC', serif", "ui-monospace, 'Noto Sans TC', monospace"];
            const title = segment(text).slice(0, 36).join("");
            for (const [index, family] of families.entries()) {
                const sample = addText(type, title);
                sample.style.fontFamily = family;
                r.animate(sample, [
                    { opacity: 0, filter: "none" },
                    { opacity: .75, filter: "drop-shadow(0 0 .22em currentColor)", offset: .07 },
                    { opacity: .55, filter: "none", offset: .24 },
                    { opacity: 0, filter: "none", offset: .34 },
                    { opacity: 0, filter: "none" },
                ], { duration, delay: -index * duration / families.length, iterations: Infinity });
            }
            return;
        }
        case "word-shelf": {
            const whitespaceWords = text.split(/\s+/u).filter(Boolean);
            const words = (whitespaceWords.length > 1 ? whitespaceWords : segment(text)).slice(0, motionNumber(effect, "maxWords", 5));
            if (words.length < 2) return;
            r.entrance(() => {
                const shelf = layer("ref-word-shelf");
                words.forEach((word, i) => {
                    const item = addText(shelf, word);
                    item.style.marginInlineStart = `${i * .22}em`;
                    item.style.opacity = ".36";
                    r.animate(item, [
                        { translate: "36px -8px", opacity: 0 },
                        { translate: "-3px 0px", opacity: .48, offset: .78 },
                        { translate: "0px 0px", opacity: .36 },
                    ], { duration, delay: i * 95, fill: "backwards" });
                });
            });
            return;
        }
        case "reading-hop": {
            r.entrance(() => {
                const original = Array.from(host.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if (!original?.textContent) return;
                const text = original.textContent;
                const glyphs = segment(text).slice(0, 28);
                const range = document.createRange(), origin = host.getBoundingClientRect();
                const boxes: DOMRect[] = [];
                let offset = 0;
                for (const glyph of glyphs) {
                    range.setStart(original, offset);
                    offset += glyph.length;
                    range.setEnd(original, offset);
                    if (glyph.trim()) boxes.push(range.getBoundingClientRect());
                }
                if (boxes.length < 2) return;
                const bar = layer("ref-reading-hop");
                const dot = document.createElement("span");
                dot.className = "ref-reading-dot";
                bar.append(dot);
                const base = boxes.map(box => ({ x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height }));
                const frames = base.flatMap((point, i) => {
                    const previous = base[i - 1];
                    const landed = { translate: `${point.x}px ${point.y}px`, opacity: .8 };
                    return !previous ? [landed] : [
                        { translate: `${(previous.x + point.x) / 2}px ${Math.min(previous.y, point.y) - 7}px`, opacity: .8 },
                        landed,
                    ];
                });
                boxes.forEach((box, i) => {
                    const mark = document.createElement("span");
                    mark.className = "ref-reading-mark";
                    Object.assign(mark.style, { left: box.left - origin.left + "px", top: box.bottom - origin.top - 2 + "px", width: box.width + "px" });
                    bar.append(mark);
                    r.animate(mark, [{ opacity: 0 }, { opacity: .65 }, { opacity: 0 }], {
                        duration: 260, delay: i * duration / (boxes.length - 1), fill: "backwards",
                    });
                });
                const play = r.animate(dot, frames, { duration });
                play?.addEventListener("finish", () => r.remove(bar), { once: true });
            });
        }
    }
}

import { motionCatalog, motionIds, type MotionId } from "./motionCatalog";

// One description of every motion for filtering, search and recommendations (the library, the
// AI recommender and the inventory doc all read this). Dimensions follow what the motions
// actually are; values come from the catalog (targets, triggers, complexity) plus a hand-made
// expression map, so a new motion without an entry fails the consistency test.

export const facetDimensions = {
  target: { label: "用在", values: { text: "文字", image: "圖片", button: "按鈕", block: "卡片與區塊", media: "圖表與媒體" } },
  trigger: { label: "什麼時候動", values: { enter: "出現時", scroll: "捲動時", hover: "滑過時", click: "點擊時", drag: "拖曳", loop: "一直動" } },
  expression: { label: "動起來的樣子", values: { fade: "淡入顯現", move: "位移滑動", scale: "放大縮小", mask: "遮罩揭露", type: "文字逐字", light: "光影色彩", spring: "彈性", depth: "立體", graphic: "線條圖形", data: "數字資料" } },
  purpose: { label: "想達成", values: { attention: "吸引注意", reading: "引導閱讀", feedback: "互動回饋", data: "呈現資料", mood: "營造氣氛" } },
  intensity: { label: "動態程度", values: { low: "輕柔", medium: "適中", high: "強烈" } },
} as const;
export type Dimension = keyof typeof facetDimensions;
export type FacetValue<D extends Dimension> = keyof (typeof facetDimensions)[D]["values"];
export type MotionFacets = { [D in Dimension]: FacetValue<D>[] } & { keyboard: boolean; reduced: string };

const expression: Record<MotionId, FacetValue<"expression">> = {
  "fade-in": "fade", "slide-up": "move", "scale-in": "scale", "hover-lift": "move", "hover-glow": "light", "stagger-reveal": "fade", "breathing-glow": "light", "curved-path-text": "type", "count-up": "data", "flip-card": "depth",
  "physics-tag-field": "spring", "fold-reveal": "depth", "letter-assembly": "type", "accent-stroke": "graphic", "image-reveal": "mask", "magnetic-control": "move", "press-feedback": "spring", "focus-transfer": "scale", "scroll-progress": "data", "disclosure-panel": "mask",
  "character-decode": "type", "split-line-assembly": "type", "rolling-characters": "type", "hand-drawn-highlight": "graphic", "kinetic-text-wave": "type", "cursor-spotlight": "light", "liquid-button-fill": "light", "radial-ink-ripple": "graphic", "orbiting-icon": "graphic", "border-light-trace": "light",
  "perspective-tilt": "depth", "venetian-reveal": "mask", "circular-mask-expansion": "mask", "cinematic-image-pan": "move", "card-deck-fan": "move", "layered-parallax": "depth", "grid-diagonal-turn": "depth", "svg-path-drawing": "graphic", "numeric-gauge-sweep": "data", "scroll-milestones": "data",
  "text-morph-transition": "type", "elastic-word-bounce": "spring", "text-spotlight-reveal": "light", "typographic-stretch": "type", "cursor-trail-particles": "graphic", "cursor-image-follower": "move", "gooey-blob-merge": "graphic", "directional-hover-wipe": "mask", "spring-drag-snap": "spring", "pixel-dissolve": "mask",
  "shutter-lens-transition": "mask", "glitch-slice-reveal": "mask", "liquid-distortion-reveal": "mask", "card-stack-shuffle": "move", "horizontal-scroll-gallery": "move", "sticky-section-morph": "scale", "scroll-image-sequence": "move", "pinned-story-panels": "fade", "particle-constellation": "graphic", "elastic-svg-morph": "spring",
  typewriter: "type", "marquee-text": "move", "gradient-text-flow": "light", "blur-in": "fade", "float-idle": "move", "confetti-burst": "graphic", "jelly-press": "spring", "shine-sweep": "light",
  "dolly-frame": "scale", "color-wake": "light", "scroll-ink-words": "type", "hollow-fill-sweep": "light", "letter-windows": "light", "bold-relay": "type", "chart-build": "data",
};
// Motions that exist to pull the eye, whatever their trigger.
const attention = new Set<MotionId>(["breathing-glow", "hover-glow", "shine-sweep", "confetti-burst", "marquee-text", "gradient-text-flow", "border-light-trace", "hand-drawn-highlight", "accent-stroke", "orbiting-icon", "hollow-fill-sweep", "letter-windows", "count-up"]);
// Strong regardless of how complex they are to build.
const strong = new Set<MotionId>(["confetti-burst", "glitch-slice-reveal", "pixel-dissolve", "cursor-trail-particles", "liquid-distortion-reveal", "shutter-lens-transition", "card-stack-shuffle", "physics-tag-field"]);
const gentle = new Set<MotionId>(["fade-in", "blur-in", "float-idle", "color-wake", "scroll-ink-words", "dolly-frame", "hover-lift"]);

const targetOf = (t: string): FacetValue<"target"> | null =>
  ["text", "heading", "paragraph"].includes(t) ? "text" : t === "image" ? "image" : t === "button" ? "button" : ["card", "container", "section", "stack", "grid"].includes(t) ? "block" : t === "media" ? "media" : null;
const triggerOf = (t: string): FacetValue<"trigger"> | null =>
  ["on-enter", "scroll-enter"].includes(t) ? "enter" : ["scroll", "progress-control"].includes(t) ? "scroll" : ["hover", "focus", "pointer-enter", "pointer-leave", "pointer-move", "focus-within"].includes(t) ? "hover" : ["click", "pointer-down", "keyboard", "text-change"].includes(t) ? "click" : ["drag", "throw", "touch"].includes(t) ? "drag" : ["idle-loop", "autoplay"].includes(t) ? "loop" : null;
const uniq = <T,>(a: (T | null)[]) => [...new Set(a.filter((x): x is T => x !== null))];

export function facetsOf(id: MotionId): MotionFacets {
  const d = motionCatalog[id];
  const target = uniq(d.targetType.map(targetOf));
  const trigger = uniq(d.interactionType.map(triggerOf));
  const ex = expression[id];
  const purpose = uniq<FacetValue<"purpose">>([
    ex === "data" ? "data" : null,
    attention.has(id) ? "attention" : null,
    trigger.some((t) => t === "hover" || t === "click" || t === "drag") && !attention.has(id) ? "feedback" : null,
    trigger.includes("loop") && !attention.has(id) ? "mood" : null,
    (trigger.includes("enter") || trigger.includes("scroll")) && (target.includes("text") || ex === "type" || ex === "fade") ? "reading" : null,
    (trigger.includes("enter") || trigger.includes("scroll")) && !target.includes("text") && ex !== "data" ? "attention" : null,
  ]);
  const intensity: FacetValue<"intensity"> = strong.has(id) ? "high" : gentle.has(id) ? "low" : d.complexity === "high" ? "high" : d.complexity === "medium" ? "medium" : "low";
  return { target, trigger, expression: [ex], purpose: purpose.length ? purpose : ["mood"], intensity: [intensity], keyboard: d.interactionType.some((t) => ["focus", "keyboard", "focus-within"].includes(t)), reduced: d.reducedMotionFallback };
}
export const motionFacets: Record<MotionId, MotionFacets> = Object.fromEntries(motionIds.map((id) => [id, facetsOf(id)])) as Record<MotionId, MotionFacets>;

/** Chosen values per dimension. Same dimension: any of them (OR); different dimensions: all (AND). */
export type FacetFilter = Partial<{ [D in Dimension]: string[] }>;
export function matchesFilter(id: MotionId, filter: FacetFilter) {
  const f = motionFacets[id];
  return (Object.keys(filter) as Dimension[]).every((dim) => !filter[dim]?.length || filter[dim]!.some((v) => (f[dim] as string[]).includes(v)));
}
/** Words to search in: both names, the description and use cases (facets have their own chips). */
export function searchText(id: MotionId) {
  const d = motionCatalog[id];
  return [id, d.nameZh, d.nameEn, d.summary, d.bestFor].join(" ").toLowerCase();
}
export function searchMotions(ids: readonly MotionId[], query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length ? ids.filter((id) => { const t = searchText(id); return words.every((w) => t.includes(w)); }) : [...ids];
}

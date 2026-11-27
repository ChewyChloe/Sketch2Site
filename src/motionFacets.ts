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
  "imprint-beats": "type", "drift-letterfall": "move", "turning-letter-mosaic": "depth",
  "waterline-echo": "move",
  "letter-fanout": "graphic",
  "type-casts": "type",
  "word-shelf": "type",
  "reading-hop": "graphic",
  "cutout-ticks": "move", "sign-pivot": "move", "quiet-landing": "move", "storm-landing": "move", "inverse-spring": "move",
  "crosswind-ribbons": "type", "vanishing-lattice": "depth",
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

const recommendationRules: { pattern: RegExp; label: string; match: (id: MotionId, f: MotionFacets) => boolean }[] = [
  { pattern: /吹散|重聚|聚集|風吹|scatter|reassembl|gather/i, label: "分散後重新組合文字", match: id => ["letter-assembly", "split-line-assembly", "text-morph-transition"].includes(id) },
  { pattern: /蓋章|印記|stamp/i, label: "原文後方依序出現印記", match: id => id === "imprint-beats" },
  { pattern: /字雨|落字|letter.*rain/i, label: "裝飾文字分軌落下", match: id => id === "drift-letterfall" },
  { pattern: /水紋字影/i, label: "字影翻映到水線下，分層的漣漪讓倒影搖曳。", match: id => id === "waterline-echo" },
  { pattern: /開扇首字/i, label: "從首字的下方支點展開文字扇面，再沿原角度收回。", match: id => id === "letter-fanout" },
  { pattern: /字型留光/i, label: "原文的三種字型輪流浮現，帶著一圈短暫的光。", match: id => id === "type-casts" },
  { pattern: /疊句收集/i, label: "小詞從側邊到達，各自落在一格，組成斜向文字層架。", match: id => id === "word-shelf" },
  { pattern: /讀字跳點/i, label: "小點沿著閱讀順序跳躍，落到一個字就點亮一格。", match: id => id === "reading-hop" },
  { pattern: /雙速橫幅|逆行直欄|疊層急流|三疊直欄|交叉字帶/i, label: "跑馬燈可調整成多軌或交叉字帶", match: id => id === "marquee-text" },
  { pattern: /心跳|heartbeat/i, label: "心跳節奏與主題色波紋", match: id => id === "breathing-glow" },
  { pattern: /旗面|伸縮波浪|flag wave/i, label: "字元可在旗面或縱向伸縮模式錯拍循環", match: id => id === "kinetic-text-wave" },
  { pattern: /雙向吸附|從兩邊聚合/i, label: "字元從兩側受到吸引後歸位", match: id => id === "letter-assembly" },
  { pattern: /拖影|motion trail/i, label: "文字快速入場並帶淡色拖影", match: id => id === "blur-in" },
  { pattern: /定格|頓拍|stop motion/i, label: "原文以離散定格節拍移動", match: id => id === "cutout-ticks" },
  { pattern: /鐘擺|懸牌|pendulum/i, label: "繞上方支點來回擺動", match: id => id === "sign-pivot" },
  { pattern: /顫.*(停|穩)|顫波|settle/i, label: "進場顫動逐漸歸位", match: id => id === "quiet-landing" },
  { pattern: /雷痕|雷擊.*落|storm landing/i, label: "標題落下並出現一次主題色亮痕", match: id => id === "storm-landing" },
  { pattern: /逆重力|往上.*彈|inverse spring/i, label: "文字往上反彈兩次", match: id => id === "inverse-spring" },
  { pattern: /翻.*格|棋盤|checkerboard/i, label: "字磚沿對角線翻轉", match: id => id === "turning-letter-mosaic" },
  { pattern: /斜.*字帶|交叉.*文字|diagonal.*text/i, label: "雙向斜字帶保留中央原文", match: id => id === "crosswind-ribbons" },
  { pattern: /地平線|透視網格|horizon|perspective grid/i, label: "透視格線往前推進", match: id => id === "vanishing-lattice" },
  { pattern: /立體|景深|視差|3d|depth|parallax/i, label: "提供立體或景深感", match: (_, f) => f.expression.includes("depth") },
  { pattern: /柔和|輕柔|溫柔|gentle|soft|subtle|calm/i, label: "動態輕柔", match: (_, f) => f.intensity.includes("low") },
  { pattern: /進場|出現|淡入|entrance|appear|fade.in/i, label: "在元件出現時播放", match: (_, f) => f.trigger.includes("enter") },
  { pattern: /滑過|懸停|hover/i, label: "滑過時觸發", match: (_, f) => f.trigger.includes("hover") },
  { pattern: /捲動|滾動|scroll/i, label: "捲動時觸發", match: (id, f) => f.trigger.includes("scroll") || motionCatalog[id].interactionType.includes("scroll-enter") },
  { pattern: /點擊|按下|click|tap/i, label: "點擊時觸發", match: (_, f) => f.trigger.includes("click") },
  { pattern: /咖啡|coff?ee|caf[eé]/i, label: "適合安靜的咖啡廳氛圍", match: (_, f) => f.intensity.includes("low") && f.trigger.includes("enter") },
];

export function motionFollowsDescription(id: MotionId, query: string): boolean {
  const avoidStrong = /(?:不要|別|不想|不宜|not|avoid|no)\s*(?:太|過於|too\s*)?(?:浮誇|強烈|花俏|誇張|flashy|intense|dramatic)/i.test(query);
  const avoidLoops = /(?:不要|別|不想|not|avoid|no)\s*(?:一直動|循環|loop)/i.test(query);
  const facets = motionFacets[id];
  return !(avoidStrong && facets.intensity.includes("high")) && !(avoidLoops && facets.trigger.includes("loop"));
}

export function recommendMotions(query: string, ids: readonly MotionId[]) {
  const matches = recommendationRules.filter(rule => rule.pattern.test(query));
  const target = /照[片相]|圖片|photo|image/i.test(query) ? "image" : /文字|標題|text|headline/i.test(query) ? "text" : undefined;
  return ids.flatMap(id => {
    const f = motionFacets[id];
    if ((target && !f.target.includes(target)) || !motionFollowsDescription(id, query)) return [];
    const reasons = matches.filter(rule => rule.match(id, f)).map(rule => rule.label);
    return reasons.length ? [{ id, reasons }] : [];
  }).sort((a, b) => b.reasons.length - a.reasons.length).slice(0, 5);
}
